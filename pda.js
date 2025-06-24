const orderNo = document.getElementById("orderNo");
const typeSelect = document.getElementById("type");
const switchLocation = document.getElementById("switchLocation");
const portNo = document.getElementById("portNo");
const serverSN = document.getElementById("serverSN");
const serverSNRow = document.getElementById("serverSNRow");
const switchInfoRow = document.getElementById("switchInfoRow");

const newBrand = document.getElementById("newBrand");
const oldBrand = document.getElementById("oldBrand");
const newPN = document.getElementById("newPN");
const oldPN = document.getElementById("oldPN");
const newSN = document.getElementById("newSN");
const oldSN = document.getElementById("oldSN");

const newPnOptions = document.getElementById("newPnOptions");
const oldPnOptions = document.getElementById("oldPnOptions");

const countNewPN = document.getElementById("countNewPN");
const countNewSN = document.getElementById("countNewSN");
const countOldPN = document.getElementById("countOldPN");
const countOldSN = document.getElementById("countOldSN");
const checkNewPN = document.getElementById("checkNewPN");
const checkOldPN = document.getElementById("checkOldPN");
const preview = document.getElementById("preview");
const copyBtn = document.getElementById("copyBtn");

const orderNoDisplay = document.getElementById("orderNoDisplay");
const copyOrderNoBtn = document.getElementById("copyOrderNoBtn");

let restoring = false;
let currentUser = null;  // 存储当前登录用户信息
let justLoggedIn = false;

orderNo.addEventListener("input", function () {
  const val = orderNo.value.trim();
  const num = val.match(/(\d+)(?!.*\d)/)?.[0] || "";
  orderNoDisplay.textContent = num ? `${num}` : ""; //单号识别：${num}
  
  // 显示或隐藏复制按钮，并更新复制文本
  if (num) {
    copyOrderNoBtn.style.display = "inline-block";
    copyOrderNoBtn.setAttribute("data-clipboard-text", num);
  } else {
    copyOrderNoBtn.style.display = "none";
    copyOrderNoBtn.setAttribute("data-clipboard-text", "");
  }
});

// 初始化 Clipboard.js
document.addEventListener('DOMContentLoaded', function() {
  // 初始化单号复制按钮
  const clipboardOrderNo = new ClipboardJS('#copyOrderNoBtn');
  
  clipboardOrderNo.on('success', function(e) {
    const text = e.text;
    showToast(`单号 ${text} 已复制到剪贴板`, "success");
    e.clearSelection();
  });
  
  clipboardOrderNo.on('error', function(e) {
    showToast("复制失败，请手动复制", "warning");
  });

  // 初始化预览复制按钮
  const clipboardPreview = new ClipboardJS('#copyBtn');
  
  clipboardPreview.on('success', function(e) {
    showToast("已复制到剪贴板", "success");
    e.clearSelection();
  });
  
  clipboardPreview.on('error', function(e) {
    showToast("复制失败，请手动复制", "warning");
  });
});

function showToast(msg, type = "primary", delay = 5000) {
  const container = document.getElementById("toastContainer");
  if (!container) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast text-bg-${type} border-0`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");
  toast.innerHTML = `<div class="toast-body">${msg}</div>`;
  container.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast, {
    animation: true,
    autohide: true,
    delay: delay
  });
  bsToast.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function updateBrandOptions() {
  if (!window.partsData || !window.partsData.brandMap) return;
  const type = typeSelect.value;
  const brandMap = window.partsData.brandMap;
  const section = document.getElementById("brandSection");
  
  if (!type || !brandMap[type]) {
    newBrand.innerHTML = '<option value="请选择">请选择</option>';
    oldBrand.innerHTML = '<option value="请选择">请选择</option>';
    section.classList.add("d-none");
    return;
  }

  // 保存当前选中的值
  const currentNewBrand = newBrand.value;
  const currentOldBrand = oldBrand.value;

  // 生成选项
  const options = '<option value="请选择">请选择</option>' + brandMap[type].map((b) => `<option value="${b}">${b}</option>`).join("");
  
  // 更新下拉框，保持当前选中的值
  newBrand.innerHTML = options;
  oldBrand.innerHTML = options;
  
  // 如果之前有选中的值，且该值在当前选项中存在，则恢复选中
  if (currentNewBrand && brandMap[type].includes(currentNewBrand)) {
    newBrand.value = currentNewBrand;
  } else {
    newBrand.value = "请选择";
  }
  
  if (currentOldBrand && brandMap[type].includes(currentOldBrand)) {
    oldBrand.value = currentOldBrand;
  } else {
    oldBrand.value = "请选择";
  }

  section.classList.remove("d-none");
  updatePnOptions(type, newBrand.value, newPnOptions);
  updatePnOptions(type, oldBrand.value, oldPnOptions);
}

// 添加等待数据加载函数
function waitForData() {
  return new Promise((resolve) => {
    if (window.partsData && window.partsData.brandMap) {
      resolve();
    } else {
      const checkData = () => {
        if (window.partsData && window.partsData.brandMap) {
          resolve();
        } else {
          setTimeout(checkData, 100);
        }
      };
      checkData();
    }
  });
}

// 登录回调统一处理
async function handleLoginCallback({ code, type }) {
  let url = '';
  if (type === 'scan') {
    url = 'https://pdabot.jsjs.net/auth/scan';
  } else if (type === 'feishu') {
    url = 'https://pdabot.jsjs.net/auth/feishu';
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const data = await res.json();
  if (data.code === 0) {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userId', data.data.user_id);
    localStorage.setItem('openId', data.data.open_id);
    localStorage.setItem('userName', data.data.name);
    localStorage.setItem('accessToken', data.data.access_token);
    currentUser = { id: data.data.user_id, name: data.data.name };
    showMainUI(data.data.name);
    loadChatList();
  } else {
    showToast('登录失败', 'danger');
    showLoginUI();
  }
}

// 修改 redirectToFeishuLogin 函数
function redirectToFeishuLogin() {
  const client_id = 'cli_a8be137e6579500b';
  const redirect_uri = encodeURIComponent('https://pdabot.jsjs.net/');
  const state = Math.random().toString(36).slice(2);
  const url = `https://passport.feishu.cn/suite/passport/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&state=${state}`;
  window.location.href = url;
}

// 修改 checkLogin 函数
function checkLogin() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code) {
      // 有 code 参数，说明是飞书登录回调
      console.log('检测到登录回调，code:', code);
      // 根据 state 判断是扫码还是免密登录
      if (state === 'scan') {
        handleFeishuCallback(code);
      } else {
        handleFeishuAuthCallback(code);
      }
    } else {
      // 检查 localStorage 中的登录状态
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');
      
      if (isLoggedIn && userId && userName) {
        // 已登录，显示主界面
        currentUser = { id: userId, name: userName };
        showMainUI(userName);
        loadChatList();
      } else {
        // 未登录，显示登录界面
        showLoginUI();
      }
    }
  } catch (error) {
    console.error('检查登录状态失败:', error);
    showLoginUI();
  }
}

// 修改扫码登录回调
async function handleFeishuCallback(code) {
  if (!code) {
    showToast('登录失败：缺少授权码', 'danger');
    return;
  }
  try {
    console.log('开始扫码登录，code:', code);
    const res = await fetch('https://pdabot.jsjs.net/auth/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    console.log('扫码登录响应:', data);
    if (data.code === 0) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userId', data.data.user_id);
      localStorage.setItem('openId', data.data.open_id);
      localStorage.setItem('userName', data.data.name);
      localStorage.setItem('accessToken', data.data.access_token);
      currentUser = { id: data.data.user_id, name: data.data.name };
      showMainUI(data.data.name);
      loadChatList();
    } else {
      showToast(`登录失败: ${data.msg || '未知错误'}`, 'danger');
      showLoginUI();
    }
  } catch (error) {
    console.error('扫码登录失败:', error);
    showToast('扫码登录失败', 'danger');
    showLoginUI();
  }
}

// 修改免密登录回调
async function handleFeishuAuthCallback(code) {
  console.log('检测到登录回调，code:', code);
  if (!code) return;

  try {
    // 只使用一次code，不再重复调用免密登录
    const response = await fetch('https://pdabot.jsjs.net/auth/feishu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const result = await response.json();
    console.log('登录响应:', result);

    if (result.code === 0 && result.data) {
      // 保存用户信息和token
      localStorage.setItem('userInfo', JSON.stringify(result.data));
      localStorage.setItem('access_token', result.data.access_token);
      return true;
    } else {
      console.error('登录失败:', result.msg);
      return false;
    }
  } catch (error) {
    console.error('登录请求失败:', error);
    return false;
  }
}

// 修改 showMainUI 函数
function showMainUI(userName) {
  const loginContainer = document.getElementById('loginContainer');
  const mainContainer = document.getElementById('mainContainer');
  if (!loginContainer || !mainContainer) return;
  loginContainer.classList.add('d-none');
  mainContainer.classList.remove('d-none');
  const h5 = document.querySelector('h5');
  // 先移除旧的用户信息元素
  const oldUserInfo = h5.querySelector('.user-info-tooltip');
  if (oldUserInfo) oldUserInfo.remove();
  // 新增：用户名用带Tooltips的图标按钮显示
  const userInfoBtn = document.createElement('button');
  userInfoBtn.type = 'button';
  userInfoBtn.className = 'btn btn-sm btn-outline-secondary ms-2 user-info-tooltip';
  userInfoBtn.setAttribute('data-bs-toggle', 'tooltip');
  userInfoBtn.setAttribute('data-bs-placement', 'bottom');
  userInfoBtn.setAttribute('title', userName);
  userInfoBtn.innerHTML = '<i class="bi bi-person-circle"></i>';
  h5.appendChild(userInfoBtn);
  // 初始化Tooltips
  if (window.bootstrap) {
    new bootstrap.Tooltip(userInfoBtn);
  }
}

function showLoginUI() {
  const loginContainer = document.getElementById('loginContainer');
  const mainContainer = document.getElementById('mainContainer');
  if (!loginContainer || !mainContainer) {
    return;
  }
  loginContainer.classList.remove('d-none');
  mainContainer.classList.add('d-none');
}

// 封装初始化逻辑
async function mainInit() {
  try {
    // 等待数据加载
    await waitForData();
    // 初始化界面元素
    const elements = {
      orderNo: document.getElementById('orderNo'),
      typeSelect: document.getElementById('type'),
      switchLocation: document.getElementById('switchLocation'),
      portNo: document.getElementById('portNo'),
      serverSN: document.getElementById('serverSN'),
      serverSNRow: document.getElementById('serverSNRow'),
      switchInfoRow: document.getElementById('switchInfoRow'),
      newBrand: document.getElementById('newBrand'),
      oldBrand: document.getElementById('oldBrand'),
      newPN: document.getElementById('newPN'),
      oldPN: document.getElementById('oldPN'),
      newSN: document.getElementById('newSN'),
      oldSN: document.getElementById('oldSN'),
      newPnOptions: document.getElementById('newPnOptions'),
      oldPnOptions: document.getElementById('oldPnOptions'),
      countNewPN: document.getElementById('countNewPN'),
      countNewSN: document.getElementById('countNewSN'),
      countOldPN: document.getElementById('countOldPN'),
      countOldSN: document.getElementById('countOldSN'),
      checkNewPN: document.getElementById('checkNewPN'),
      checkOldPN: document.getElementById('checkOldPN'),
      preview: document.getElementById('preview'),
      copyBtn: document.getElementById('copyBtn'),
      orderNoDisplay: document.getElementById('orderNoDisplay'),
      resetBtn: document.getElementById('resetBtn')
    };
    // 检查必要的元素是否存在
    if (!elements.orderNo || !elements.typeSelect) {
      return;
    }
    // 更新品牌选项
    updateBrandOptions();
    // 绑定事件
    bindEvents();
    // 加载表单数据
    loadFormData();
    // 绑定重置按钮
    if (elements.resetBtn) {
      elements.resetBtn.onclick = resetForm;
    }
    // 检查登录状态
    checkLogin();
  } catch (error) {
    console.error('页面初始化失败:', error);
  }
}

// 修改页面加载事件，确保 partsData 加载后再初始化

// 只要 partsData 没有加载好，就监听 partsDataLoaded 事件
if (!window.partsData || !window.partsData.brandMap) {
  window.addEventListener('partsDataLoaded', () => {
    mainInit();
  }, { once: true });
} else {
  // 已经加载好，直接初始化
  document.addEventListener('DOMContentLoaded', mainInit);
}

// 修改 loadFormData 函数
async function loadFormData() {
  restoring = true;
  try {
    // 1. 恢复类型
    const typeVal = localStorage.getItem('pda_type');
    
    if (typeVal && typeVal !== "请选择") {
      typeSelect.value = typeVal;
      
      // 确保数据存在
      if (!window.partsData || !window.partsData.brandMap) {
        return;
      }
      
      // 确保当前类型在 brandMap 中存在
      if (!window.partsData.brandMap[typeVal]) {
        return;
      }
      
      // 更新品牌下拉框
      await updateBrandOptions();

      // 2. 恢复品牌
      const newBrandVal = localStorage.getItem('pda_newBrand');
      const oldBrandVal = localStorage.getItem('pda_oldBrand');

      // 等待品牌下拉框选项生成
      const waitForBrandOptions = () => {
        return new Promise((resolve) => {
          const checkOptions = () => {
            if (newBrand.options.length > 0 && oldBrand.options.length > 0) {
              if (newBrandVal && newBrandVal !== "请选择") {
                newBrand.value = newBrandVal;
              }
              if (oldBrandVal && oldBrandVal !== "请选择") {
                oldBrand.value = oldBrandVal;
              }
              
              // 触发 change 事件
              newBrand.dispatchEvent(new Event('change'));
              oldBrand.dispatchEvent(new Event('change'));
              resolve();
            } else {
              setTimeout(checkOptions, 100);
            }
          };
          checkOptions();
        });
      };

      await waitForBrandOptions();

      // 3. 恢复其他输入框
      const restoreInputs = () => {
        [
          [orderNo, 'pda_orderNo'],
          [switchLocation, 'pda_switchLocation'],
          [portNo, 'pda_portNo'],
          [serverSN, 'pda_serverSN'],
          [newSN, 'pda_newSN'],
          [oldSN, 'pda_oldSN']
        ].forEach(([el, key]) => {
          const val = localStorage.getItem(key);
          if (val) {
            el.value = val;
            el.dispatchEvent(new Event('input'));
          }
        });
      };

      restoreInputs();

      // 4. 恢复PN
      if (typeVal === '硬盘') {
        switchPnInput('硬盘');
        updatePnOptions('硬盘', newBrandVal, newPnOptions);
        updatePnOptions('硬盘', oldBrandVal, oldPnOptions);
        
        // 等待PN下拉框生成
        const waitForPnSelects = () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              [['new', 'pda_newPN', 'newPNSelect'], ['old', 'pda_oldPN', 'oldPNSelect']].forEach(([type, key, selectId]) => {
                const val = localStorage.getItem(key);
                if (val) {
                  const select = document.getElementById(selectId);
                  if (select) {
                    select.value = val;
                    select.dispatchEvent(new Event('change'));
                  }
                }
              });
              bindPNSelectSave();
              resolve();
            }, 120);
          });
        };

        await waitForPnSelects();
      } else {
        [['new', 'pda_newPN', 'newPNSelect'], ['old', 'pda_oldPN', 'oldPNSelect']].forEach(([type, key, selectId]) => {
          const val = localStorage.getItem(key);
          if (val) {
            const input = document.getElementById(type === 'new' ? 'newPN' : 'oldPN');
            const select = document.getElementById(selectId);
            if (select && select.style.display !== 'none') {
              select.value = val;
              select.dispatchEvent(new Event('change'));
            } else {
              input.value = val;
              input.dispatchEvent(new Event('input'));
            }
          }
        });
        bindPNSelectSave();
      }
    }
  } catch (error) {
    console.error('加载表单数据失败:', error);
  } finally {
    restoring = false;
    update();
  }
}

// 修改事件绑定函数
function bindEvents() {
  if (typeSelect) {
    const typeChangeHandler = async () => {
      const type = typeSelect.value;
      const isOptical = type === "光模块";
      if (serverSNRow) serverSNRow.classList.toggle("d-none", isOptical);
      if (switchInfoRow) switchInfoRow.classList.toggle("d-none", !isOptical);
      await updateBrandOptions();
      update();
      switchPnInput(type);
    };
    typeSelect.addEventListener("change", typeChangeHandler);
  }

  if (newBrand && oldBrand) {
    [newBrand, oldBrand].forEach((select, index) => {
      const brandChangeHandler = () => {
        const type = typeSelect.value;
        const datalist = index === 0 ? newPnOptions : oldPnOptions;
        updatePnOptions(type, select.value, datalist);
        if (type === "硬盘") {
          const selectId = index === 0 ? "newPNSelect" : "oldPNSelect";
          const pnSelect = document.getElementById(selectId);
          if (pnSelect) {
            const list = window.partsData.diskPnList.filter((item) => item.brand === select.value);
            pnSelect.innerHTML = `<option value="">请选择硬盘PN</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}【${item.Type}】</option>`).join("");
          }
        }
        update();
      };
      select.addEventListener("change", brandChangeHandler);
    });
  }

  const inputHandler = () => update();
  [orderNo, serverSN, switchLocation, portNo, newPN, newSN, oldPN, oldSN].forEach((el) => {
    if (el) {
      el.addEventListener("input", inputHandler);
    }
  });
}

// 生成硬盘PN下拉选项
function renderDiskPnOptions(datalist, brand) {
  const list = window.partsData.diskPnList.filter((item) => item.brand === brand);
  datalist.innerHTML = `<option value="">请选择硬盘PN</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}【${item.Type}】</option>`).join("");
}

// 新增：切换PN输入框为select或input
function switchPnInput(type) {
  const isDisk = type === "硬盘";
  const isCpu = type === "CPU";
  // 新件PN
  const newPnParent = newPN.parentElement;
  let newPnSelect = document.getElementById("newPNSelect");
  if (isDisk || isCpu) {
    if (!newPnSelect) {
      newPnSelect = document.createElement("select");
      newPnSelect.id = "newPNSelect";
      newPnSelect.className = newPN.className;
      newPnSelect.addEventListener("change", update);
      newPnParent.appendChild(newPnSelect);
    }
    // 填充选项
    const brand = newBrand.value;
    if (isDisk) {
      const list = window.partsData.diskPnList.filter((item) => item.brand === brand);
      newPnSelect.innerHTML = `<option value="">请选择硬盘PN</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}【${item.Type}】</option>`).join("");
    } else {
      const list = window.partsData.cpuPnList.filter((item) => item.brand === brand);
      newPnSelect.innerHTML = `<option value="">请选择CPU型号</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}</option>`).join("");
    }
    newPnSelect.style.display = "";
    newPN.style.display = "none";
  } else {
    if (newPnSelect) newPnSelect.style.display = "none";
    newPN.style.display = "";
  }
  // 旧件PN
  const oldPnParent = oldPN.parentElement;
  let oldPnSelect = document.getElementById("oldPNSelect");
  if (isDisk || isCpu) {
    if (!oldPnSelect) {
      oldPnSelect = document.createElement("select");
      oldPnSelect.id = "oldPNSelect";
      oldPnSelect.className = oldPN.className;
      oldPnSelect.addEventListener("change", update);
      oldPnParent.appendChild(oldPnSelect);
    }
    // 填充选项
    const brand = oldBrand.value;
    if (isDisk) {
      const list = window.partsData.diskPnList.filter((item) => item.brand === brand);
      oldPnSelect.innerHTML = `<option value="">请选择硬盘PN</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}【${item.Type}】</option>`).join("");
    } else {
      const list = window.partsData.cpuPnList.filter((item) => item.brand === brand);
      oldPnSelect.innerHTML = `<option value="">请选择CPU型号</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}</option>`).join("");
    }
    oldPnSelect.style.display = "";
    oldPN.style.display = "none";
  } else {
    if (oldPnSelect) oldPnSelect.style.display = "none";
    oldPN.style.display = "";
  }
}

// 监听硬盘PN select 的变化，实时更新预览
function bindPNSelectUpdate() {
  ["newPNSelect", "oldPNSelect"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.removeEventListener("change", update); // 防止重复绑定
      sel.addEventListener("change", update);
    }
  });
}

// 修改updatePnOptions函数
function updatePnOptions(type, brand, datalist) {
  if (restoring) return;
  if (type === "硬盘") {
    renderDiskPnOptions(datalist, brand);
    // 同步select
    const isNew = datalist === newPnOptions;
    const select = document.getElementById(isNew ? "newPNSelect" : "oldPNSelect");
    if (select) {
      const list = window.partsData.diskPnList.filter((item) => item.brand === brand);
      select.innerHTML = `<option value="">请选择硬盘PN</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}【${item.Type}】</option>`).join("");
    }
  } else if (type === "CPU") {
    renderCpuPnOptions(datalist, brand);
    // 同步select
    const isNew = datalist === newPnOptions;
    const select = document.getElementById(isNew ? "newPNSelect" : "oldPNSelect");
    if (select) {
      const list = window.partsData.cpuPnList.filter((item) => item.brand === brand);
      select.innerHTML = `<option value="">请选择CPU型号</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}</option>`).join("");
    }
  } else {
    const list = (window.partsData.pnDataMap[type] && window.partsData.pnDataMap[type][brand]) || [];
    datalist.innerHTML = list.map((pn) => `<option value="${pn}">`).join("");
  }
}

// 生成CPU PN下拉选项
function renderCpuPnOptions(datalist, brand) {
  const list = window.partsData.cpuPnList.filter((item) => item.brand === brand);
  datalist.innerHTML = `<option value="">请选择CPU型号</option>` + list.map((item) => `<option value="${item.pn}">${item.pn}</option>`).join("");
}

function formatSamsungMemoryPn(pn) {
  const index = pn.indexOf("M");
  return index !== -1 ? pn.slice(index) : pn;
}

function update() {
  if (restoring) return;
  const type = typeSelect.value;
  const order = orderNo.value.trim().match(/\d+/)?.[0] || "";
  const isOptical = type === "光模块";
  const switchLoc = switchLocation.value.trim();
  const port = portNo.value.trim();
  const server = serverSN.value.trim();
  const brand1 = newBrand.value || "";
  const brand2 = oldBrand.value || "";

  // 优先取 select 的值
  let pn1 = "";
  let pn2 = "";
  const newPnSelect = document.getElementById("newPNSelect");
  const oldPnSelect = document.getElementById("oldPNSelect");
  if (type === "硬盘" || type === "CPU") {
    pn1 = (newPnSelect && newPnSelect.style.display !== "none") ? newPnSelect.value : newPN.value.trim();
    pn2 = (oldPnSelect && oldPnSelect.style.display !== "none") ? oldPnSelect.value : oldPN.value.trim();
  } else {
    pn1 = newPN.value.trim();
    pn2 = oldPN.value.trim();
  }
  let sn1 = newSN.value.trim();
  let sn2 = oldSN.value.trim();

  // 清除提示
  checkNewPN.textContent = "";
  checkOldPN.textContent = "";
  checkNewPN.className = "";
  checkOldPN.className = "";

  // Samsung 内存格式化逻辑
  if (type === "内存") {
    if (brand1 === "Samsung" && pn1.length > 0) {
      const formatted = formatSamsungMemoryPn(pn1);
      pn1 = formatted;
      newPN.value = formatted;
    }
    if (brand2 === "Samsung" && pn2.length > 0) {
      const formatted = formatSamsungMemoryPn(pn2);
      pn2 = formatted;
      oldPN.value = formatted;
    }
  }

  // ✅ 字符数统计（必须在格式化之后）
  countNewPN.textContent = `字符数：${pn1.length}`;
  countNewSN.textContent = `字符数：${sn1.length}`;
  countOldPN.textContent = `字符数：${pn2.length}`;
  countOldSN.textContent = `字符数：${sn2.length}`;

  // Samsung 格式校验提示
  if (type === "内存") {
    if (brand1 === "Samsung" && pn1 && !pn1.startsWith("M")) {
      checkNewPN.textContent = "请检查内存PN";
      checkNewPN.className = "text-danger me-2";
    }
    if (brand2 === "Samsung" && pn2 && !pn2.startsWith("M")) {
      checkOldPN.textContent = "请检查内存PN";
      checkOldPN.className = "text-danger me-2";
    }
  }

  // 优化：只要新旧PN都已选择且不为"请选择硬盘PN"时就校验一致性
  if (type === "内存" || type === "硬盘") {
    if (pn1 && pn2 && pn1 !== "" && pn2 !== "" && pn1 !== "请选择硬盘PN" && pn2 !== "请选择硬盘PN") {
      if (pn1 === pn2) {
        checkNewPN.textContent = "PN一致";
        checkOldPN.textContent = "PN一致";
        checkNewPN.className = "text-success me-2";
        checkOldPN.className = "text-success me-2";
      } else {
        checkNewPN.textContent = "PN不一致";
        checkOldPN.textContent = "PN不一致";
        checkNewPN.className = "text-danger me-2";
        checkOldPN.className = "text-danger me-2";
      }
    } else {
      checkNewPN.textContent = "";
      checkOldPN.textContent = "";
      checkNewPN.className = "";
      checkOldPN.className = "";
    }
  }

  // 文本预览生成（顶格写法）
  let text = '';
  if (!type || type === '请选择') {
    text = '上新下旧：更换「   」\n单号：\n服务器SN：\n新件品牌：\n新件SN：\n新件PN：\n旧件品牌：\n旧件SN：\n旧件PN：';
  } else {
    text = `上新下旧：更换「${type || ' '}」\n单号：${order}\n${isOptical ? "位置：" + switchLoc + " " + port : "服务器SN：" + server}\n新件品牌：${brand1}\n新件SN：${sn1}\n新件PN：${pn1}\n旧件品牌：${brand2}\n旧件SN：${sn2}\n旧件PN：${pn2}`;
  }
  preview.textContent = text;
  // 解决 highlight.js 控制台警告
  if (preview.dataset.highlighted) {
    delete preview.dataset.highlighted;
  }
  hljs.highlightElement(preview);
  saveFormData();
}

// 新增：将Markdown表格转为对象
function markdownTableToObject(md) {
  const lines = md.trim().split('\n').filter(line => line.includes('|'));
  const obj = {};
  for (let i = 2; i < lines.length; i++) { // 跳过表头和分隔线
    const [key, value] = lines[i].split('|').slice(1, 3).map(s => s.trim());
    obj[key] = value;
  }
  return obj;
}

// 修改 sendToFeishu，传递对象数据
function sendToFeishu() {
  const type = typeSelect.value;
  const orderInput = orderNo.value.trim();
  const chatId = document.getElementById('chatSelect').value;
  if (!chatId) {
    showToast('请选择要发送的群', 'warning');
    return;
  }
  // 检查是否为完整url
  const urlMatch = orderInput.match(/https?:\/\/[\S]+/);
  if (!urlMatch) {
    showToast("请粘贴完整的单号链接", "warning");
    return;
  }
  const orderUrl = urlMatch[0];
  const orderNum = orderUrl.match(/(\d+)(?!.*\d)/)?.[0] || "";
  if (!orderNum) {
    showToast("链接中未找到单号数字", "warning");
    return;
  }
  // 取表单内容，变量名与卡片模板一致，全部转为字符串
  const user_access_token = localStorage.getItem('accessToken') || '';
  const data = {
    shangxin_xiajiu: `更换「${type || ''}」`,
    danhao: orderNum + '',
    fuwuqi_sn: (serverSN.value || '').trim(),
    xinpin_pinpai: (newBrand.value || '').trim(),
    xinpin_sn: (newSN.value || '').trim(),
    xinpin_pn: (() => {
      const select = document.getElementById('newPNSelect');
      if (select && select.style.display !== 'none') {
        return (select.value || '').trim();
      }
      return (newPN.value || '').trim();
    })(),
    jiupin_pinpai: (oldBrand.value || '').trim(),
    jiupin_sn: (oldSN.value || '').trim(),
    jiupin_pn: (() => {
      const select = document.getElementById('oldPNSelect');
      if (select && select.style.display !== 'none') {
        return (select.value || '').trim();
      }
      return (oldPN.value || '').trim();
    })(),
    user_name: (currentUser && currentUser.name) ? currentUser.name : '',
    user_var: { id: (currentUser && currentUser.id) ? currentUser.id : '' },
    user_access_token: user_access_token
  };
  // 调试输出
  console.log('发送到worker的数据:', JSON.stringify({
    title: `更换通知 - ${type}`,
    orderNo: orderNum,
    chatId: chatId,
    data: data
  }));
  fetch("https://pdabot.jsjs.net/api/send-card", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `更换通知 - ${type}`,
      orderNo: orderNum,
      chatId: chatId,
      data: data
    }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (data.code === 0) {
        showToast("卡片消息已发送 ✅", "success");
        // 打印 message_id
        console.log('飞书返回的 message_id:', data.data && data.data.message_id);
      } else {
        // 提取详细错误信息
        let detail = data.msg || '未知错误';
        if (data.error && data.error.field_violations) {
          detail += '：' + data.error.field_violations.map(v => `${v.field}: ${v.description}`).join('; ');
        }
        showToast(`发送失败 ❌ (${detail})`, 'danger');
      }
    })
    .catch((err) => {
      showToast(`发送失败 ❌ (${err.message || err})`, "danger");
    });
}

// 修改 sendApplyNotify 函数
function sendApplyNotify() {
  const orderInput = orderNo.value.trim();
  const urlMatch = orderInput.match(/https?:\/\/[\S]+/);
  if (!urlMatch) {
    showToast('请粘贴完整的单号链接', 'warning');
    return;
  }
  const orderUrl = urlMatch[0];
  const orderNum = orderUrl.match(/(\d+)(?!.*\d)/)?.[0] || '';
  if (!orderNum) {
    showToast('链接中未找到单号数字', 'warning');
    return;
  }
  const brand2 = oldBrand.value.trim();
  const sn2 = oldSN.value.trim();
  const pn2 = (() => {
    const select = document.getElementById('oldPNSelect');
    if (select && select.style.display !== 'none') {
      return select.value;
    }
    return oldPN.value.trim();
  })();
  if (!brand2 || brand2 === '请选择' || !sn2 || !pn2 || pn2 === '请选择硬盘PN') {
    showToast('旧件品牌、旧件SN、旧件PN均为必填项', 'warning');
    return;
  }
  fetch('https://pdabot.jsjs.net/api/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'apply',
      orderNum,
      orderUrl,
      brand2,
      sn2,
      pn2,
      partType: typeSelect.value,
      sender: currentUser ? currentUser.name : '未知用户'
    }),
  })
  .then(async res => {
    const data = await res.json();
    if (data.code === 0) {
      showToast('申领通知已发送 ✅', 'success');
    } else {
      showToast(`申领通知发送失败 ❌ (${data.msg || '未知错误'})`, 'danger');
    }
  })
  .catch(() => {
    showToast('申领通知发送失败 ❌', 'danger');
  });
}

// 获取PN值（兼容input和select）
function getPNValue(type) {
  const input = document.getElementById(type === "new" ? "newPN" : "oldPN");
  const select = document.getElementById(type === "new" ? "newPNSelect" : "oldPNSelect");
  if (select && select.style.display !== "none") {
    return select.value;
  }
  return input.value;
}

// 保存表单数据
function saveFormData() {
  if (restoring) return;
  
  // 保存类型
  const typeVal = typeSelect.value;
  if (typeVal && typeVal !== "请选择") {
    localStorage.setItem("pda_type", typeVal);
  } else {
    localStorage.removeItem("pda_type");
  }

  // 保存品牌
  const newBrandVal = newBrand.value;
  const oldBrandVal = oldBrand.value;
  if (newBrandVal && newBrandVal !== "请选择") {
    localStorage.setItem("pda_newBrand", newBrandVal);
  } else {
    localStorage.removeItem("pda_newBrand");
  }
  if (oldBrandVal && oldBrandVal !== "请选择") {
    localStorage.setItem("pda_oldBrand", oldBrandVal);
  } else {
    localStorage.removeItem("pda_oldBrand");
  }

  // 保存其他输入框
  [
    ["pda_orderNo", orderNo.value],
    ["pda_switchLocation", switchLocation.value],
    ["pda_portNo", portNo.value],
    ["pda_serverSN", serverSN.value],
    ["pda_newSN", newSN.value],
    ["pda_oldSN", oldSN.value],
    ["pda_newPN", getPNValue("new")],
    ["pda_oldPN", getPNValue("old")],
  ].forEach(([key, val]) => {
    if (val && val !== "请选择" && val !== "请选择硬盘PN") {
      localStorage.setItem(key, val);
    } else {
      localStorage.removeItem(key);
    }
  });
}

// 监听所有表单项的变化，自动保存
[orderNo, switchLocation, portNo, serverSN, newSN, oldSN, newPN, oldPN, typeSelect, newBrand, oldBrand].forEach((el) => {
  if (el) {
    el.addEventListener("input", saveFormData);
    el.addEventListener("change", saveFormData);
    el.addEventListener("paste", function () {
      setTimeout(saveFormData, 0);
    });
  }
});

// select PN 变化也要保存（动态生成的select也要绑定）
function bindPNSelectSave() {
  ["newPNSelect", "oldPNSelect"].forEach((id) => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.onchange = saveFormData;
    }
  });
}
document.addEventListener("change", function (e) {
  if (e.target && (e.target.id === "newPNSelect" || e.target.id === "oldPNSelect")) {
    saveFormData();
  }
});

// 重置按钮
function resetForm() {
  if (confirm("确定要重置所有数据吗？")) {
    ["pda_orderNo", "pda_type", "pda_switchLocation", "pda_portNo", "pda_serverSN", "pda_newBrand", "pda_oldBrand", "pda_newPN", "pda_oldPN", "pda_newSN", "pda_oldSN"].forEach((key) =>
      localStorage.removeItem(key)
    );
    // 清空表单
    orderNo.value = "";
    orderNoDisplay.textContent = ""; // 清除单号显示
    copyOrderNoBtn.style.display = "none"; // 隐藏复制按钮
    switchLocation.value = "";
    portNo.value = "";
    serverSN.value = "";
    newSN.value = "";
    oldSN.value = "";
    newPN.value = "";
    oldPN.value = "";
    typeSelect.value = "请选择";
    newBrand.value = "请选择";
    oldBrand.value = "请选择";
    // 触发类型选择事件以更新UI
    typeSelect.dispatchEvent(new Event("change"));
    showToast("表单已重置", "success");

    // 新增：清除接口缓存
    if ('caches' in window) {
      caches.open('pda-cache-2.2.2').then(cache => {
        cache.delete('https://pn.jsjs.net/pn');
      });
    }
  }
}

// 新增：加载群列表
async function loadChatList() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    showToast('未登录，无法获取群列表', 'warning');
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
      showToast('未授权访问群列表', 'danger');
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
      showToast('群列表数据格式错误', 'warning');
    }
  } catch (e) {
    console.error('加载群列表失败:', e);
    showToast('群列表加载失败', 'danger');
  }
}

// Bootstrap 表单验证功能
function initFormValidation() {
  const form = document.getElementById('pdaForm');
  if (!form) return;

  // 动态验证交换机字段
  function validateSwitchFields() {
    const type = typeSelect.value;
    const switchRow = document.getElementById('switchInfoRow');
    const switchLocationEl = document.getElementById('switchLocation');
    const portNoEl = document.getElementById('portNo');
    
    if (type === '交换机' && !switchRow.classList.contains('d-none')) {
      switchLocationEl.setAttribute('required', '');
      portNoEl.setAttribute('required', '');
    } else {
      switchLocationEl.removeAttribute('required');
      portNoEl.removeAttribute('required');
      // 清除验证状态
      switchLocationEl.classList.remove('is-invalid', 'is-valid');
      portNoEl.classList.remove('is-invalid', 'is-valid');
    }
  }

  // 动态验证品牌字段
  function validateBrandFields() {
    const type = typeSelect.value;
    const brandSection = document.getElementById('brandSection');
    const newBrandEl = document.getElementById('newBrand');
    const oldBrandEl = document.getElementById('oldBrand');
    
    if (['CPU', '内存', '硬盘', '光模块'].includes(type) && !brandSection.classList.contains('d-none')) {
      newBrandEl.setAttribute('required', '');
      oldBrandEl.setAttribute('required', '');
    } else {
      newBrandEl.removeAttribute('required');
      oldBrandEl.removeAttribute('required');
      // 清除验证状态
      newBrandEl.classList.remove('is-invalid', 'is-valid');
      oldBrandEl.classList.remove('is-invalid', 'is-valid');
    }
  }

  // 监听类型变化以更新验证规则
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      validateSwitchFields();
      validateBrandFields();
    });
  }

  // 表单提交事件
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    // 更新动态验证规则
    validateSwitchFields();
    validateBrandFields();

    // 检查表单有效性
    if (form.checkValidity()) {
      // 表单验证通过，执行原来的 sendToFeishu 函数
      sendToFeishu();
      showToast('表单验证通过，正在发送...', 'success');
    } else {
      // 表单验证失败
      showToast('请填写所有必填字段', 'danger');
    }

    // 添加 Bootstrap 验证样式
    form.classList.add('was-validated');
  });

  // 实时验证反馈
  const inputs = form.querySelectorAll('input[required], select[required]');
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      if (input.checkValidity()) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
      } else {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
      }
    });

    input.addEventListener('input', () => {
      // 清除之前的验证状态，让用户重新输入时不显示错误
      if (input.classList.contains('is-invalid') && input.value.trim() !== '') {
        input.classList.remove('is-invalid');
        if (input.checkValidity()) {
          input.classList.add('is-valid');
        }
      }
    });
  });

  // 特殊处理 select 字段
  const selects = form.querySelectorAll('select[required]');
  selects.forEach(select => {
    select.addEventListener('change', () => {
      // 检查是否选择了有效选项（不是空值或禁用选项）
      const selectedOption = select.options[select.selectedIndex];
      const isValidSelection = select.value && 
                              select.value !== '' && 
                              !selectedOption.disabled &&
                              select.value !== '请选择' && 
                              select.value !== '请选择群';
      
      if (isValidSelection) {
        select.classList.remove('is-invalid');
        select.classList.add('is-valid');
      } else {
        select.classList.remove('is-valid');
        select.classList.add('is-invalid');
      }
    });
    
    // 初始验证状态
    select.addEventListener('blur', () => {
      const selectedOption = select.options[select.selectedIndex];
      const isValidSelection = select.value && 
                              select.value !== '' && 
                              !selectedOption.disabled;
      
      if (isValidSelection) {
        select.classList.remove('is-invalid');
        select.classList.add('is-valid');
      } else {
        select.classList.remove('is-valid');
        select.classList.add('is-invalid');
      }
    });
  });

  console.log('Bootstrap表单验证已初始化');
}

// 增强重置表单功能，清除验证状态
const originalResetForm = resetForm;
resetForm = function() {
  const form = document.getElementById('pdaForm');
  if (form) {
    form.classList.remove('was-validated');
    // 清除所有验证状态
    const elements = form.querySelectorAll('.is-valid, .is-invalid');
    elements.forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
    });
  }
  originalResetForm();
};

// 在页面加载完成后初始化表单验证
document.addEventListener('DOMContentLoaded', function() {
  // 延迟初始化，确保其他脚本已经加载完成
  setTimeout(initFormValidation, 1000);
}); 
