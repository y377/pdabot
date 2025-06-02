// login.js

// 飞书应用配置
const FEISHU_CONFIG = {
  client_id: 'cli_a8b10d009ef8d00c',
  redirect_uri: 'https://pdabot.jsjs.net/'
};

// 检查token有效性
const isTokenValid = () => {
  const tokenInfo = JSON.parse(localStorage.getItem('feishu_token') || '{}');
  return tokenInfo.access_token && tokenInfo.expireTime && Date.now() < tokenInfo.expireTime;
};

// 保存用户信息
tokenInfo => {
  localStorage.setItem('feishu_token', JSON.stringify(tokenInfo));
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userId', tokenInfo.user_id);
  localStorage.setItem('userName', tokenInfo.name);
  localStorage.setItem('userAvatar', tokenInfo.avatar_url);
};

// 清除用户信息
const clearUserInfo = () => {
  localStorage.removeItem('feishu_token');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userAvatar');
};

// 显示主界面和头像
const showMainUI = () => {
  document.getElementById('loginUI').style.display = 'none';
  document.getElementById('mainUI').classList.remove('d-none');
  const avatarUrl = localStorage.getItem('userAvatar');
  const userName = localStorage.getItem('userName');
  showUserAvatar(avatarUrl, userName);
};

// 显示扫码界面
const showLoginUI = () => {
  document.getElementById('loginUI').style.display = 'block';
  document.getElementById('mainUI').classList.add('d-none');
  showUserAvatar();
};

// 头像渲染函数
const showUserAvatar = (avatarUrl, userName) => {
  const box = document.getElementById('userAvatarBox');
  if (!box) return;
  box.innerHTML = '';
  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = '用户头像';
    img.className = 'rounded-circle';
    img.style = 'width: 32px; height: 32px; object-fit: cover; border: 2px solid #e9ecef; cursor: pointer;';
    img.setAttribute('title', userName || '');
    box.appendChild(img);
  }
};

// 初始化二维码登录
const initQRLogin = () => {
  const state = Math.random().toString(36).slice(2);
  const goto = `https://passport.feishu.cn/suite/passport/oauth/authorize?` +
    new URLSearchParams({
      client_id: FEISHU_CONFIG.client_id,
      redirect_uri: FEISHU_CONFIG.redirect_uri,
      response_type: 'code',
      state
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

// 登录回调处理
const handleLoginCallback = async ({ code, type }) => {
  try {
    const url = type === 'scan'
      ? 'https://pdabot.jsjs.net/auth/scan'
      : 'https://pdabot.jsjs.net/auth/feishu';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.msg || '登录失败');
    }
    saveUserInfo(data.data);
    return data.data;
  } catch (error) {
    clearUserInfo();
    throw error;
  }
};

// 页面初始化
const loginInit = () => {
  if (isTokenValid()) {
    showMainUI();
  } else {
    clearUserInfo();
    showLoginUI();
    initQRLogin();
  }
};

document.addEventListener('DOMContentLoaded', loginInit);

// 导出需要给pda.js用的函数
window.loginUtils = {
  isTokenValid,
  showMainUI,
  showLoginUI,
  clearUserInfo,
  saveUserInfo,
  handleLoginCallback
}; 