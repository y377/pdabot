// 飞书免密登录（仅在飞书客户端内生效）
export const feishuAutoLogin = async () => {
  // 检测是否在飞书客户端内
  const isInFeishuClient = () => {
    const ua = navigator.userAgent;
    const isFeishuApp = /Lark|Feishu|feishu|lark/i.test(ua);
    const hasTTAPI = typeof window.tt !== 'undefined';
    const hasJSAPI = typeof window.tt?.requestAccess !== 'undefined' || 
                     typeof window.tt?.requestAuthCode !== 'undefined';
    const hasH5SDK = typeof window.h5sdk !== 'undefined';
    
    // 安卓特定检测
    const isAndroid = /Android/i.test(ua);
    const isFeishuAndroid = isAndroid && (isFeishuApp || /feishu|lark/i.test(ua));
    
    // Windows特定检测
    const isWindows = /Windows/i.test(ua);
    const isFeishuWindows = isWindows && (isFeishuApp || /feishu|lark/i.test(ua));
    
    // 检查其他可能的飞书API
    const hasFeishuAPI = typeof window.feishu !== 'undefined' || 
                         typeof window.lark !== 'undefined' ||
                         typeof window.ttWebView !== 'undefined';
    
    // 检查Electron环境（Windows飞书客户端使用Electron）
    const isElectron = /Electron/i.test(ua);
    
    console.log('飞书客户端检测详情:', { 
      userAgent: ua,
      isFeishuApp, 
      hasTTAPI, 
      hasJSAPI,
      hasH5SDK,
      isAndroid,
      isFeishuAndroid,
      isWindows,
      isFeishuWindows,
      isElectron,
      hasFeishuAPI,
      ttObject: typeof window.tt,
      requestAccess: typeof window.tt?.requestAccess,
      requestAuthCode: typeof window.tt?.requestAuthCode,
      h5sdkObject: typeof window.h5sdk,
      feishuObject: typeof window.feishu,
      larkObject: typeof window.lark,
      ttWebViewObject: typeof window.ttWebView
    });
    
    // 飞书客户端特殊处理 - 即使没有TT API也尝试
    if (isFeishuAndroid || isFeishuWindows) {
      console.log('检测到飞书客户端（安卓或Windows）');
      return true;
    }
    
    return isFeishuApp && hasTTAPI && hasJSAPI;
  };

  // 如果不在飞书客户端内，直接返回 false
  if (!isInFeishuClient()) {
    console.log('不在飞书客户端内，跳过免密登录');
    return false;
  }

  try {
    console.log('开始飞书客户端免密登录...');
    
    // 1. 先进行H5SDK鉴权
    const authSuccess = await performH5SDKAuth();
    if (!authSuccess) {
      console.log('H5SDK鉴权失败，跳过免密登录');
      return false;
    }
    
    // 2. 获取授权码
    const code = await getAuthCode();
    console.log('获取到授权码:', code ? '成功' : '失败');
    
    if (!code) {
      throw new Error('无法获取授权码');
    }

    // 3. 调用后端免密登录接口
    const userData = await callBackendAuth(code);
    console.log('后端认证成功:', userData ? '是' : '否');
    
    return userData;
  } catch (error) {
    console.error('飞书免密登录失败:', error);
    return false;
  }
};

// H5SDK鉴权
const performH5SDKAuth = async () => {
  return new Promise(async (resolve) => {
    if (!window.h5sdk) {
      console.log('H5SDK不可用，跳过鉴权');
      resolve(false);
      return;
    }

    console.log('开始H5SDK鉴权...');
    
    try {
      // 1. 从后端获取签名信息
      const signatureInfo = await getSignatureFromBackend();
      if (!signatureInfo) {
        console.log('无法获取签名信息，跳过鉴权');
        resolve(false);
        return;
      }

      // 2. 通过error接口处理API验证失败后的回调
      window.h5sdk.error((err) => {
        console.error('H5SDK鉴权失败:', err);
        resolve(false);
      });

      // 3. 调用config接口进行鉴权
      window.h5sdk.config({
        appId: signatureInfo.appId,
        timestamp: signatureInfo.timestamp,
        nonceStr: signatureInfo.nonceStr,
        signature: signatureInfo.signature,
        jsApiList: ['requestAccess', 'requestAuthCode'], // 声明需要使用的API
        //鉴权成功回调
        onSuccess: (res) => {
          console.log('H5SDK鉴权成功:', res);
          resolve(true);
        },
        //鉴权失败回调
        onFail: (err) => {
          console.error('H5SDK鉴权失败:', err);
          // 鉴权失败时，尝试直接调用API（某些情况下可能仍然有效）
          console.log('尝试直接调用API...');
          resolve(true);
        },
      });

      // 4. 完成鉴权后，便可在 window.h5sdk.ready 里调用 JSAPI
      window.h5sdk.ready(() => {
        console.log('H5SDK ready，可以调用JSAPI');
        resolve(true);
      });
    } catch (error) {
      console.error('H5SDK鉴权过程出错:', error);
      resolve(false);
    }
  });
};

// 从后端获取签名信息
const getSignatureFromBackend = async () => {
  try {
    console.log('从后端获取签名信息...');
    
    // 获取当前页面URL（去除hash部分）
    const url = location.href.split('#')[0];
    
    const response = await fetch('https://pdabot.jsjs.net/auth/signature', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'feishu-app'
      },
      body: JSON.stringify({ 
        url,
        appId: 'cli_a8be137e6579500b'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('签名信息响应:', data);

    if (data.code === 0 && data.data) {
      return data.data;
    } else {
      throw new Error(data.msg || '获取签名信息失败');
    }
  } catch (error) {
    console.error('获取签名信息失败:', error);
    return null;
  }
};

// 获取授权码
const getAuthCode = async () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('获取授权码超时'));
    }, 15000); // 15秒超时

    const clearTimeoutAndResolve = (code) => {
      clearTimeout(timeout);
      resolve(code);
    };

    const clearTimeoutAndReject = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    console.log('开始获取授权码，检查所有可能的API...');
    console.log('可用API检查:', {
      tt: typeof window.tt,
      requestAccess: typeof window.tt?.requestAccess,
      requestAuthCode: typeof window.tt?.requestAuthCode,
      feishu: typeof window.feishu,
      lark: typeof window.lark,
      ttWebView: typeof window.ttWebView
    });

    // 尝试多种API获取授权码
    const tryGetAuthCode = () => {
      // 1. 优先使用 requestAccess（新版API）- 根据官方文档正确使用
      if (window.tt?.requestAccess) {
        console.log('使用 requestAccess API（仅获取用户凭证信息权限）');
        window.tt.requestAccess({
          appID: 'cli_a8be137e6579500b',
          scopeList: [], // 空数组表示仅授予应用获取用户凭证信息权限
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
      // 2. 降级使用 requestAuthCode（旧版API）
      else if (window.tt?.requestAuthCode) {
        console.log('使用 requestAuthCode API');
        fallbackToRequestAuthCode(clearTimeoutAndResolve, clearTimeoutAndReject);
      }
      // 3. 尝试其他可能的API
      else if (window.feishu?.requestAuthCode) {
        console.log('使用 feishu.requestAuthCode API');
        window.feishu.requestAuthCode({
          appId: 'cli_a8be137e6579500b',
          success: (res) => {
            console.log('feishu.requestAuthCode 成功:', res);
            clearTimeoutAndResolve(res.code);
          },
          fail: (err) => {
            console.log('feishu.requestAuthCode 失败:', err);
            clearTimeoutAndReject(err);
          }
        });
      }
      // 4. 尝试 lark API
      else if (window.lark?.requestAuthCode) {
        console.log('使用 lark.requestAuthCode API');
        window.lark.requestAuthCode({
          appId: 'cli_a8be137e6579500b',
          success: (res) => {
            console.log('lark.requestAuthCode 成功:', res);
            clearTimeoutAndResolve(res.code);
          },
          fail: (err) => {
            console.log('lark.requestAuthCode 失败:', err);
            clearTimeoutAndReject(err);
          }
        });
      }
      // 5. 都不支持
      else {
        console.error('所有飞书JSAPI都不可用');
        console.error('可用对象:', {
          tt: window.tt,
          feishu: window.feishu,
          lark: window.lark,
          ttWebView: window.ttWebView
        });
        clearTimeoutAndReject(new Error('飞书JSAPI不可用，请检查飞书客户端版本'));
      }
    };

    // 延迟执行，确保飞书API已加载
    setTimeout(tryGetAuthCode, 1000);
  });
};

// 降级到 requestAuthCode
const fallbackToRequestAuthCode = (resolve, reject) => {
  console.log('调用 requestAuthCode...');
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
  const isFeishuApp = /Lark|Feishu|feishu|lark/i.test(ua);
  const hasTTAPI = typeof window.tt !== 'undefined';
  const hasRequestAccess = typeof window.tt?.requestAccess !== 'undefined';
  const hasRequestAuthCode = typeof window.tt?.requestAuthCode !== 'undefined';
  
  // 安卓特定检测
  const isAndroid = /Android/i.test(ua);
  const isFeishuAndroid = isAndroid && (isFeishuApp || /feishu|lark/i.test(ua));
  
  // Windows特定检测
  const isWindows = /Windows/i.test(ua);
  const isFeishuWindows = isWindows && (isFeishuApp || /feishu|lark/i.test(ua));
  
  // 检查其他可能的飞书API
  const hasFeishuAPI = typeof window.feishu !== 'undefined' || 
                       typeof window.lark !== 'undefined' ||
                       typeof window.ttWebView !== 'undefined';
  
  // 检查Electron环境
  const isElectron = /Electron/i.test(ua);
  
  // 飞书客户端特殊处理
  const canAutoLogin = (isFeishuAndroid || isFeishuWindows) ? true : 
                      (isFeishuApp && hasTTAPI && (hasRequestAccess || hasRequestAuthCode));
  
  return {
    isFeishuApp,
    hasTTAPI,
    hasRequestAccess,
    hasRequestAuthCode,
    isAndroid,
    isFeishuAndroid,
    isWindows,
    isFeishuWindows,
    isElectron,
    hasFeishuAPI,
    canAutoLogin,
    userAgent: ua,
    ttObject: typeof window.tt,
    feishuObject: typeof window.feishu,
    larkObject: typeof window.lark,
    ttWebViewObject: typeof window.ttWebView,
    detailedInfo: {
      userAgent: ua,
      isFeishuApp, 
      hasTTAPI, 
      hasRequestAccess,
      hasRequestAuthCode,
      isAndroid,
      isFeishuAndroid,
      isWindows,
      isFeishuWindows,
      isElectron,
      hasFeishuAPI
    }
  };
};
