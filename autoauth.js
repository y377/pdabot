// 飞书免密登录（仅在飞书客户端内生效）
export const feishuAutoLogin = async () => {
  // 检测是否在飞书客户端内
  const isInFeishuClient = () => {
    const ua = navigator.userAgent;
    const isFeishuApp = /Lark|Feishu/.test(ua);
    const hasTTAPI = typeof window.tt !== 'undefined';
    const hasJSAPI = typeof window.tt?.requestAccess !== 'undefined' || 
                     typeof window.tt?.requestAuthCode !== 'undefined';
    
    console.log('飞书客户端检测:', { 
      isFeishuApp, 
      hasTTAPI, 
      hasJSAPI, 
      userAgent: ua 
    });
    
    return isFeishuApp && hasTTAPI && hasJSAPI;
  };

  // 如果不在飞书客户端内，直接返回 false
  if (!isInFeishuClient()) {
    console.log('不在飞书客户端内，跳过免密登录');
    return false;
  }

  try {
    console.log('开始飞书客户端免密登录...');
    
    // 获取授权码
    const code = await getAuthCode();
    console.log('获取到授权码:', code ? '成功' : '失败');
    
    if (!code) {
      throw new Error('无法获取授权码');
    }

    // 调用后端免密登录接口
    const userData = await callBackendAuth(code);
    console.log('后端认证成功:', userData ? '是' : '否');
    
    return userData;
  } catch (error) {
    console.error('飞书免密登录失败:', error);
    return false;
  }
};

// 获取授权码
const getAuthCode = async () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('获取授权码超时'));
    }, 10000); // 10秒超时

    const clearTimeoutAndResolve = (code) => {
      clearTimeout(timeout);
      resolve(code);
    };

    const clearTimeoutAndReject = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    // 优先使用 requestAccess（新版API）
    if (window.tt?.requestAccess) {
      console.log('使用 requestAccess API');
      window.tt.requestAccess({
        appID: 'cli_a8be137e6579500b',
        scopeList: [],
        state: 'autoLogin',
        success: (res) => {
          console.log('requestAccess 成功:', res);
          clearTimeoutAndResolve(res.code);
        },
        fail: (err) => {
          console.log('requestAccess 失败:', err);
          // 如果是权限不足，降级到 requestAuthCode
          if (err.errno === 103 && window.tt?.requestAuthCode) {
            console.log('降级到 requestAuthCode API');
            fallbackToRequestAuthCode(clearTimeoutAndResolve, clearTimeoutAndReject);
          } else {
            clearTimeoutAndReject(err);
          }
        }
      });
    } 
    // 降级使用 requestAuthCode（旧版API）
    else if (window.tt?.requestAuthCode) {
      console.log('使用 requestAuthCode API');
      fallbackToRequestAuthCode(clearTimeoutAndResolve, clearTimeoutAndReject);
    } 
    // 都不支持
    else {
      clearTimeoutAndReject(new Error('飞书JSAPI不可用'));
    }
  });
};

// 降级到 requestAuthCode
const fallbackToRequestAuthCode = (resolve, reject) => {
  window.tt.requestAuthCode({
    appId: 'cli_a8be137e6579500b',
    success: (res) => {
      console.log('requestAuthCode 成功:', res);
      resolve(res.code);
    },
    fail: (err) => {
      console.log('requestAuthCode 失败:', err);
      reject(err);
    }
  });
};

// 调用后端认证接口
const callBackendAuth = async (code) => {
  try {
    console.log('调用后端认证接口...');
    const response = await fetch('https://pdabot.jsjs.net/auth/feishu', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'feishu-app' // 标识来源
      },
      body: JSON.stringify({ 
        code, 
        redirect_uri: 'https://pdabot.jsjs.net/',
        client_type: 'feishu-app'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('后端响应:', data);

    if (data.code === 0 && data.data) {
      return data.data;
    } else {
      throw new Error(data.msg || '后端认证失败');
    }
  } catch (error) {
    console.error('后端认证失败:', error);
    throw error;
  }
};

// 导出检测函数供外部使用
export const checkFeishuEnvironment = () => {
  const ua = navigator.userAgent;
  const isFeishuApp = /Lark|Feishu/.test(ua);
  const hasTTAPI = typeof window.tt !== 'undefined';
  const hasRequestAccess = typeof window.tt?.requestAccess !== 'undefined';
  const hasRequestAuthCode = typeof window.tt?.requestAuthCode !== 'undefined';
  
  return {
    isFeishuApp,
    hasTTAPI,
    hasRequestAccess,
    hasRequestAuthCode,
    canAutoLogin: isFeishuApp && hasTTAPI && (hasRequestAccess || hasRequestAuthCode),
    userAgent: ua
  };
};
