// login.js

import { feishuAutoLogin } from './autoauth.js';

// 1. 配置和全局变量
const FEISHU_CONFIG = {
    client_id: 'cli_a8be137e6579500b',
    redirect_uri: 'https://pdabot.jsjs.net/'
  };
  let currentUser = null;
  
  // 2. 工具函数
  const showToast = (message, type = 'danger') => {
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
      const toast = document.createElement('div');
      toast.className = `toast text-bg-${type} border-0`;
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
      toast.setAttribute('aria-atomic', 'true');
      
      const toastBody = document.createElement('div');
      toastBody.className = 'toast-body';
      toastBody.textContent = message;
      toast.appendChild(toastBody);
  
      toastContainer.appendChild(toast);
      const bsToast = new bootstrap.Toast(toast, {
        animation: true,
        autohide: true,
        delay: 5000
      });
      bsToast.show();
      toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }
  };
  
  const saveUserInfo = (userData) => {
    if (!userData) return;
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userId', userData.user_id || userData.open_id);
    localStorage.setItem('userName', userData.name);
    localStorage.setItem('userAvatar', userData.avatar_url);
    localStorage.setItem('feishu_token', JSON.stringify({
      access_token: userData.access_token,
      refresh_token: userData.refresh_token,
      tokenInfo: userData.tokenInfo
    }));
    currentUser = {
      id: userData.user_id || userData.open_id,
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
      if (userName) {
        img.setAttribute('data-bs-title', userName);
      }
      // 初始化所有tooltip
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      [...tooltipTriggerList].forEach(el => {
        if (!el._tooltip_inited) {
          new bootstrap.Tooltip(el);
          el._tooltip_inited = true;
        }
      });
    }, 100);
  };
  
  // 3. UI 控制函数
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
  };
  
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
  
  // 4. 数据加载函数
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
          // 只保留第一个默认选项
          chatSelect.length = 1;
          // 动态添加群选项
          data.data.items.forEach(chat => {
            const option = document.createElement('option');
            option.value = chat.chat_id;
            option.textContent = chat.name;
            chatSelect.appendChild(option);
          });
        }
      } else {
        console.warn('群列表数据格式错误');
      }
    } catch (e) {
      console.error('加载群列表失败:', e);
    }
  };
  
  // 5. 登录处理函数
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
  
  const handleAutoLogin = async () => {
    try {
      console.log('尝试飞书客户端免密登录...');
      const userData = await feishuAutoLogin();
      if (userData) {
        console.log('免密登录成功:', userData);
        saveUserInfo(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('免密登录失败:', error);
      return false;
    }
  };
  
  // 6. 主登录流程
  const processLogin = async () => {
    try {
      // 1. 检查URL参数（登录回调）
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code) {
        console.log('检测到登录回调，处理中...');
        await handleLoginCallback({ code, type: state === 'scan' ? 'scan' : 'feishu' });
        showMainUI();
        loadChatList();
        // 清除URL参数
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      // 2. 检查本地token
      if (isTokenValid()) {
        console.log('本地token有效，直接进入主界面');
        showMainUI();
        loadChatList();
        return;
      }
      
      // 3. 尝试飞书客户端免密登录（在显示扫码登录之前）
      console.log('开始尝试免密登录...');
      const autoLoginSuccess = await handleAutoLogin();
      if (autoLoginSuccess) {
        console.log('免密登录成功，进入主界面');
        showMainUI();
        loadChatList();
        return;
      }
      
      // 4. 免密登录失败，回退到扫码登录
      console.log('免密登录失败，回退到扫码登录');
      showLoginUI();
      initQRLogin();
      
    } catch (error) {
      console.error('登录流程失败:', error);
      // 只有在非免密登录相关的错误时才显示扫码登录
      if (!error.message.includes('免密登录')) {
        showToast(`登录失败: ${error.message}`, 'danger');
        showLoginUI();
        initQRLogin();
      } else {
        console.log('免密登录相关错误，尝试扫码登录');
        showLoginUI();
        initQRLogin();
      }
    }
  };
  
  // 7. 兼容性函数（保持向后兼容）
  const loginInit = processLogin;
  
  const checkLogin = processLogin;
  
  // 8. 事件绑定
  document.addEventListener('DOMContentLoaded', processLogin);
  
  // 9. 导出
  window.loginUtils = {
    isTokenValid,
    showMainUI,
    showLoginUI,
    clearUserInfo,
    saveUserInfo,
    handleLoginCallback,
    checkLogin,
    loadChatList,
    currentUser,
    processLogin,
    loginInit
  }; 
