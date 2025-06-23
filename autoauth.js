// 飞书免密登录（仅在飞书客户端内生效）
export const feishuAutoLogin = async () => {
  const isInFeishuClient = () => {
    const ua = navigator.userAgent;
    return /Lark|Feishu/.test(ua) && typeof window.tt !== 'undefined';
  };
  if (!isInFeishuClient()) return false;
  try {
    // 获取 code（优先 requestAccess，降级 requestAuthCode）
    const code = await new Promise((resolve, reject) => {
      if (window.tt?.requestAccess) {
        window.tt.requestAccess({
          appID: 'cli_a8be137e6579500b',
          scopeList: [],
          state: 'myContext',
          success: res => resolve(res.code),
          fail: err => {
            if (err.errno === 103 && window.tt?.requestAuthCode) {
              window.tt.requestAuthCode({
                appId: 'cli_a8be137e6579500b',
                success: res => resolve(res.code),
                fail: err2 => reject(err2)
              });
            } else {
              reject(err);
            }
          }
        });
      } else if (window.tt?.requestAuthCode) {
        window.tt.requestAuthCode({
          appId: 'cli_a8be137e6579500b',
          success: res => resolve(res.code),
          fail: err => reject(err)
        });
      } else {
        reject({ errno: 999, errString: 'JSAPI不可用' });
      }
    });
    // 调用后端免密登录接口
    const response = await fetch('https://pdabot.jsjs.net/auth/feishu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: 'https://pdabot.jsjs.net/' })
    });
    const data = await response.json();
    if (data.code === 0 && data.data) {
      return data.data; // 返回用户数据，交由调用方处理
    } else {
      throw new Error(data.msg || '免密登录失败');
    }
  } catch (error) {
    console.error('免密登录失败:', error);
    return false;
  }
};
