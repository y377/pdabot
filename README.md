# 飞书免密登录功能说明

## 概述

本项目实现了飞书客户端/APP内的免密登录功能，用户在使用飞书客户端访问网页时，可以无需输入用户名密码，直接完成登录。

## 功能特点

- ✅ **自动检测环境**：自动识别是否在飞书客户端内
- ✅ **API降级支持**：支持新版 `requestAccess` 和旧版 `requestAuthCode` API
- ✅ **错误处理**：完善的错误处理和超时机制
- ✅ **调试支持**：详细的日志记录和调试信息
- ✅ **向后兼容**：保持与现有扫码登录的兼容性

## 文件结构

```
├── login.js          # 主登录逻辑，已重构优化
├── autoauth.js       # 免密登录核心功能
├── worker3.js        # 后端API处理，已优化认证逻辑
├── test-login.html   # 测试页面，用于验证功能
└── README-免密登录.md # 本文档
```

## 使用方法

### 1. 基本使用

```javascript
import { feishuAutoLogin } from './autoauth.js';

// 尝试免密登录
const userData = await feishuAutoLogin();
if (userData) {
    console.log('登录成功:', userData.name);
    // 处理登录成功逻辑
} else {
    console.log('免密登录失败，需要其他登录方式');
    // 回退到扫码登录
}
```

### 2. 环境检测

```javascript
import { checkFeishuEnvironment } from './autoauth.js';

const env = checkFeishuEnvironment();
console.log('环境信息:', env);
// 输出示例：
// {
//   isFeishuApp: true,
//   hasTTAPI: true,
//   hasRequestAccess: true,
//   hasRequestAuthCode: true,
//   canAutoLogin: true,
//   userAgent: "Mozilla/5.0..."
// }
```

### 3. 集成到现有登录流程

```javascript
// 在 login.js 中的 processLogin 函数已经集成了免密登录
const processLogin = async () => {
    // 1. 检查URL参数（登录回调）
    // 2. 检查本地token
    // 3. 尝试飞书客户端免密登录 ← 新增
    // 4. 回退到扫码登录
};
```

## 技术实现

### 1. 环境检测

```javascript
const isInFeishuClient = () => {
    const ua = navigator.userAgent;
    const isFeishuApp = /Lark|Feishu/.test(ua);
    const hasTTAPI = typeof window.tt !== 'undefined';
    const hasJSAPI = typeof window.tt?.requestAccess !== 'undefined' || 
                     typeof window.tt?.requestAuthCode !== 'undefined';
    
    return isFeishuApp && hasTTAPI && hasJSAPI;
};
```

### 2. API降级策略

1. **优先使用新版API**：`window.tt.requestAccess`
2. **降级到旧版API**：`window.tt.requestAuthCode`
3. **超时保护**：10秒超时机制
4. **错误处理**：详细的错误日志

### 3. 后端认证流程

```javascript
// 1. 获取授权码
const code = await getAuthCode();

// 2. 调用后端认证接口
const response = await fetch('https://pdabot.jsjs.net/auth/feishu', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'feishu-app'
    },
    body: JSON.stringify({ 
        code, 
        redirect_uri: 'https://pdabot.jsjs.net/',
        client_type: 'feishu-app'
    })
});
```

## 测试方法

### 1. 使用测试页面

打开 `test-login.html` 页面，可以：
- 检测当前环境是否支持免密登录
- 测试免密登录功能
- 查看详细的调试日志
- 管理登录状态

### 2. 在飞书客户端中测试

1. 在飞书客户端中打开网页
2. 页面会自动尝试免密登录
3. 如果成功，直接进入主界面
4. 如果失败，回退到扫码登录

### 3. 在浏览器中测试

1. 在普通浏览器中打开网页
2. 环境检测会显示"不支持免密登录"
3. 自动回退到扫码登录

## 错误处理

### 常见错误及解决方案

| 错误类型 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `JSAPI不可用` | 不在飞书客户端内 | 回退到扫码登录 |
| `获取授权码超时` | 网络问题或用户未响应 | 增加重试机制或回退 |
| `权限不足` | 用户未授权应用 | 引导用户授权 |
| `后端认证失败` | 服务器问题 | 检查后端服务状态 |

### 错误日志示例

```javascript
// 成功日志
[INFO] 开始飞书客户端免密登录...
[INFO] 使用 requestAccess API
[INFO] requestAccess 成功: {code: "xxx"}
[INFO] 调用后端认证接口...
[INFO] 后端响应: {code: 0, data: {...}}
[SUCCESS] 免密登录成功

// 失败日志
[INFO] 开始飞书客户端免密登录...
[WARNING] 不在飞书客户端内，跳过免密登录
[WARNING] 免密登录失败
```

## 配置要求

### 1. 飞书应用配置

确保飞书应用已正确配置：
- App ID: `cli_a8be137e6579500b`
- 重定向URI: `https://pdabot.jsjs.net/`
- 权限范围: 用户信息读取权限

### 2. 后端环境变量

确保 `worker3.js` 中配置了正确的环境变量：
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`

## 兼容性说明

### 支持的飞书版本

- ✅ 飞书桌面客户端
- ✅ 飞书移动端APP
- ✅ 飞书网页版（不支持免密登录，会回退到扫码）

### 浏览器兼容性

- ✅ Chrome (在飞书客户端内)
- ✅ Safari (在飞书客户端内)
- ✅ Firefox (在飞书客户端内)
- ✅ Edge (在飞书客户端内)

## 更新日志

### v1.0.0 (当前版本)
- ✅ 实现基础免密登录功能
- ✅ 支持API降级
- ✅ 完善错误处理
- ✅ 添加调试支持
- ✅ 创建测试页面

## 注意事项

1. **安全性**：免密登录仅在飞书客户端内有效，外部浏览器无法使用
2. **用户体验**：首次使用可能需要用户授权
3. **网络要求**：需要稳定的网络连接
4. **权限管理**：用户可以在飞书设置中撤销应用权限

## 技术支持

如有问题，请检查：
1. 是否在飞书客户端内
2. 网络连接是否正常
3. 飞书应用配置是否正确
4. 后端服务是否正常运行

可以通过 `test-login.html` 页面进行详细诊断。 
