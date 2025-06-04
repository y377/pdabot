// login.js

// 1. 配置和全局变量
const FEISHU_CONFIG = {
  client_id: 'cli_a8b10d009ef8d00c',
  redirect_uri: 'https://pdabot.jsjs.net/'
};
let currentUser = null;

// 2. 主流程相关函数（initQRLogin、loadChatList放最上面）
const initQRLogin = () => {
  const state = 'scan'; // 固定为 scan，用于标识扫码登录
  const goto = `https://passport.feishu.cn/suite/passport/oauth/authorize?` +
    new URLSearchParams({
      client_id: FEISHU_CONFIG.client_id,
      redirect_uri: FEISHU_CONFIG.redirect_uri,
      response_type: 'code'
    }).toString();
  const QRLoginObj = QRLogin({
    id: "login_container",
    goto,
    width: "300",
    height: "300"
  });
  const handleMessage = (event) => {
    if (QRLoginObj.matchOrigin(event.origin) && QRLoginObj.matchData(event.data)) {
      window.location.href = `${goto}&tmp_code=${event.data.tmp_code}`;
    }
  };
  window.addEventListener('message', handleMessage, false);
};

const loadChatList = async () => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.warn('未登录，无法获取群列表');
    return;
  }
  try {
    const res = await fetch('https://pdabot.jsjs.net/api/chat-list', {
      headers: {
        'Authorization': 'Bearer ' + userId
      }
    });
    const data = await res.json();
    if (data.code === 401) {
      console.error('未授权访问群列表');
      return;
    }
    if (data.code === 0 && data.data && data.data.items) {
      const chatSelect = document.getElementById('chatSelect');
      if (chatSelect) {
        chatSelect.innerHTML = '<option value="">请选择要发送的群</option>' + 
          data.data.items.map(chat => 
            `<option value="${chat.chat_id}">${chat.name}</option>`
          ).join('');
      }
    } else {
      console.warn('群列表数据格式错误');
    }
  } catch (e) {
    console.error('加载群列表失败:', e);
  }
};

// 2. 主流程函数
const loginInit = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  if (code) {
    handleLoginCallback({ code, type: state === 'scan' ? 'scan' : 'feishu' })
      .then(() => {
        showMainUI();
        loadChatList();
        window.history.replaceState({}, document.title, window.location.pathname);
        // 登录成功后强制刷新页面，确保token生效
        window.location.reload();
      })
      .catch(() => {
        showLoginUI();
        initQRLogin();
      });
  } else if (isTokenValid()) {
    showMainUI();
    loadChatList();
  } else {
    showLoginUI();
    initQRLogin();
  }
};

const handleLoginCallback = async ({ code, type }) => {
  try {
    console.log('开始处理登录回调:', { code, type });
    const url = type === 'scan'
      ? 'https://pdabot.jsjs.net/auth/scan'
      : 'https://pdabot.jsjs.net/auth/feishu';
    console.log('请求URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: FEISHU_CONFIG.redirect_uri })
    });
    
    const data = await response.json();
    console.log('服务器响应:', data);
    
    if (data.code !== 0) {
      throw new Error(data.msg || '登录失败');
    }
    
    if (!data.data || !data.data.user_id || !data.data.name) {
      throw new Error('服务器返回的用户数据不完整');
    }
    
    console.log('登录成功，保存用户信息:', data.data);
    saveUserInfo(data.data);
    return data.data;
  } catch (error) {
    console.error('登录失败:', error);
    clearUserInfo();
    throw error;
  }
};

const checkLogin = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    console.log('检查登录状态:', { code, state });
    
    if (code) {
      // 有 code 参数，说明是飞书登录回调
      console.log('检测到登录回调，code:', code, 'state:', state);
      handleLoginCallback({ code, type: state === 'scan' ? 'scan' : 'feishu' })
        .then(() => {
          console.log('登录成功，显示主界面');
          showMainUI();
          loadChatList();
          // 清除URL参数
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((error) => {
          console.error('登录失败:', error);
          showLoginUI();
          // 显示错误提示
          const toastContainer = document.getElementById('toastContainer');
          if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = 'toast text-bg-danger border-0';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            toast.innerHTML = `<div class="toast-body">登录失败: ${error.message}</div>`;
            toastContainer.appendChild(toast);
            const bsToast = new bootstrap.Toast(toast, {
              animation: true,
              autohide: true,
              delay: 5000
            });
            bsToast.show();
            toast.addEventListener('hidden.bs.toast', () => toast.remove());
          }
          initQRLogin();
        });
    } else {
      // 检查登录状态
      if (isTokenValid()) {
        console.log('Token有效，显示主界面');
        showMainUI();
        loadChatList();
      } else {
        console.log('Token无效，显示登录界面');
        showLoginUI();
        initQRLogin();
      }
    }
  } catch (error) {
    console.error('检查登录状态失败:', error);
    showLoginUI();
    initQRLogin();
  }
};

const showMainUI = () => {
  document.getElementById('loginUI').style.display = 'none';
  document.getElementById('mainUI').classList.remove('d-none');
  const avatarUrl = localStorage.getItem('userAvatar');
  const userName = localStorage.getItem('userName');
  showUserAvatar(avatarUrl, userName);

  // 登录成功后再加载配件数据（只加载一次）
  if (!window.partsData) {
    fetch('https://pn.jsjs.net/pn', { cache: 'force-cache' })
      .then(res => res.json())
      .then(data => {
        window.partsData = data;
        window.partsDataReady = true;
        window.dispatchEvent(new Event('partsDataLoaded'));
      })
      .catch(err => {
        console.error('加载配件数据失败:', err);
      });
  }
};

const showLoginUI = () => {
  document.getElementById('loginUI').style.display = 'block';
  document.getElementById('mainUI').classList.add('d-none');
  // 不再调用 showUserAvatar();
};

// 3. 辅助函数
const saveUserInfo = (userData) => {
  if (!userData) return;
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userId', userData.user_id);
  localStorage.setItem('userName', userData.name);
  localStorage.setItem('userAvatar', userData.avatar_url);
  localStorage.setItem('feishu_token', JSON.stringify({
    access_token: userData.access_token,
    refresh_token: userData.refresh_token,
    tokenInfo: userData.tokenInfo
  }));
  currentUser = {
    id: userData.user_id,
    name: userData.name
  };
};

const clearUserInfo = () => {
  localStorage.removeItem('feishu_token');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userAvatar');
  currentUser = null;
};

const isTokenValid = () => {
  const tokenInfo = JSON.parse(localStorage.getItem('feishu_token') || '{}');
  return !!tokenInfo.access_token;
};

const showUserAvatar = (avatarUrl, userName) => {
  setTimeout(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return;
    const img = h1.querySelector('img');
    if (!img) return;
    img.src = avatarUrl;
    if (userName) img.title = userName;
    if (userName) img.alt = userName;
    console.log('showUserAvatar set', img.src, img.title);
  }, 100);
};

// 4. 事件绑定

document.addEventListener('DOMContentLoaded', loginInit);

// 5. 导出
window.loginUtils = {
  isTokenValid,
  showMainUI,
  showLoginUI,
  clearUserInfo,
  saveUserInfo,
  handleLoginCallback,
  checkLogin,
  loadChatList,
  currentUser
}; 
