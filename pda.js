// DOM元素管理器 - 统一管理所有元素获取
const DOM = (() => {
  const cache = new Map();
  
  const get = (id) => {
    if (!cache.has(id)) {
      cache.set(id, document.getElementById(id));
    }
    return cache.get(id);
  };
  
  // 批量获取元素 - 修复ID转换逻辑
  const getMultiple = (ids) => {
    const result = {};
    ids.forEach(id => {
      // 直接使用原始ID，不进行转换
      result[id] = get(id);
    });
    return result;
  };
  
  // 预定义的常用元素
  const elements = getMultiple([
    'orderNo', 'type', 'switchLocation', 'portNo', 'serverSN', 'serverSNRow', 'switchInfoRow',
    'newBrand', 'oldBrand', 'newPN', 'oldPN', 'newSN', 'oldSN', 'newPnOptions', 'oldPnOptions',
    'countNewPN', 'countNewSN', 'countOldPN', 'countOldSN', 'checkNewPN', 'checkOldPN',
    'preview', 'copyBtn', 'orderNoDisplay', 'copyOrderNoBtn'
  ]);
  
  return { get, getMultiple, cache, ...elements };
})();

// 解构常用元素 - 使用原始ID
const { 
  orderNo, type: typeSelect, switchLocation, portNo, 
  serverSN, serverSNRow, switchInfoRow,
  newBrand, oldBrand, newPN, oldPN,
  newSN, oldSN, newPnOptions, oldPnOptions,
  countNewPN, countNewSN, countOldPN, countOldSN,
  checkNewPN, checkOldPN, preview, copyBtn,
  orderNoDisplay, copyOrderNoBtn
} = DOM;

let restoring = false;
let currentUser = null;
let justLoggedIn = false;

// 事件管理器 - 统一管理事件绑定
const EventManager = {
  // 批量绑定事件
  bindEvents: (elements, eventType, handler) => {
    elements.forEach(el => el?.addEventListener(eventType, handler));
  },
  
  // 绑定表单保存事件
  bindFormSaveEvents: (elements) => {
    const events = ['input', 'change'];
    elements.forEach(el => {
      if (el) {
        events.forEach(event => el.addEventListener(event, saveFormData));
        el.addEventListener('paste', () => setTimeout(saveFormData, 0));
      }
    });
  }
};

// 单号处理逻辑 - 添加安全检查
if (orderNo && orderNoDisplay && copyOrderNoBtn) {
  orderNo.addEventListener("input", () => {
  const val = orderNo.value.trim();
  const num = val.match(/(\d+)(?!.*\d)/)?.[0] || "";
    orderNoDisplay.textContent = num ? `${num}` : "";
  
    copyOrderNoBtn.style.display = num ? "inline-block" : "none";
    copyOrderNoBtn.setAttribute("data-clipboard-text", num);
  });
}

// Clipboard.js 初始化
document.addEventListener('DOMContentLoaded', () => {
  const initClipboard = (selector, successMessage) => {
    const clipboard = new ClipboardJS(selector);
    clipboard.on('success', (e) => {
      showToast(successMessage.replace('{text}', e.text), "success");
    e.clearSelection();
  });
    clipboard.on('error', () => showToast("复制失败，请手动复制", "warning"));
    return clipboard;
  };

  initClipboard('#copyOrderNoBtn', '单号 {text} 已复制到剪贴板');
  initClipboard('#copyBtn', '已复制到剪贴板');
});

// 现代DOM操作工具集
const DOMUtils = {
  createElement: (tag, attributes = {}, textContent = '') => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      if (key === 'className') {
        element.className = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key.startsWith('data-') || key.startsWith('aria-')) {
        element.setAttribute(key, value);
      } else {
        element[key] = value;
      }
    });
    if (textContent) element.textContent = textContent;
    return element;
  },

  createOption: (value, text, selected = false) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    if (selected) option.selected = true;
    return option;
  },

  replaceOptions: (selectElement, optionsData) => {
    if (!selectElement) return;
    
    const fragment = document.createDocumentFragment();
    selectElement.replaceChildren();
    
    optionsData.forEach(({ value, text, selected = false }) => {
      fragment.appendChild(DOMUtils.createOption(value, text, selected));
    });
    
    selectElement.appendChild(fragment);
  },

  replaceDatalistOptions: (datalistElement, optionsData) => {
    if (!datalistElement) return;
    
    const fragment = document.createDocumentFragment();
    datalistElement.replaceChildren();
    
    optionsData.forEach(value => {
      if (value !== null && value !== undefined) {
        fragment.appendChild(DOMUtils.createOption(value, value));
      }
    });
    
    datalistElement.appendChild(fragment);
  }
};

const showToast = (msg, type = "primary", delay = 5000) => {
  const container = DOM.get("toastContainer");
  if (!container) return;

  const toast = DOMUtils.createElement('div', {
    className: `toast text-bg-${type} border-0`,
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': 'true'
  });

  const toastBody = DOMUtils.createElement('div', { className: 'toast-body' }, msg);
  toast.appendChild(toastBody);
  container.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast, { animation: true, autohide: true, delay });
  bsToast.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
};

const updateBrandOptions = () => {
  if (!window.partsData?.brandMap) return;
  const type = typeSelect.value;
  const brandMap = window.partsData.brandMap;
  const section = DOM.get("brandSection");
  
  if (!type || !brandMap[type]) {
    DOMUtils.replaceOptions(newBrand, [{ value: "请选择", text: "请选择" }]);
    DOMUtils.replaceOptions(oldBrand, [{ value: "请选择", text: "请选择" }]);
    section.classList.add("d-none");
    return;
  }

  // 保存当前选中的值
  const currentValues = { new: newBrand.value, old: oldBrand.value };

  // 生成选项数据
  const optionsData = [
    { value: "请选择", text: "请选择" },
    ...brandMap[type].map(brand => ({ value: brand, text: brand }))
  ];
  
  // 更新下拉框并恢复选中值
  [newBrand, oldBrand].forEach((element, index) => {
    DOMUtils.replaceOptions(element, optionsData);
    const key = index === 0 ? 'new' : 'old';
    const currentValue = currentValues[key];
    
    element.value = (currentValue && brandMap[type].includes(currentValue)) 
      ? currentValue : "请选择";
  });

  section.classList.remove("d-none");
  
  // 只有在品牌不是"请选择"时才更新PN选项
  if (newBrand.value !== "请选择") {
  updatePnOptions(type, newBrand.value, newPnOptions);
  }
  if (oldBrand.value !== "请选择") {
  updatePnOptions(type, oldBrand.value, oldPnOptions);
}

  // 切换PN输入框类型
  switchPnInput(type);
};

const waitForData = () => {
  return new Promise((resolve) => {
    if (window.partsData?.brandMap) {
      resolve();
    } else {
      const checkData = () => {
        if (window.partsData?.brandMap) resolve();
        else setTimeout(checkData, 100);
      };
      checkData();
    }
  });
};

// 登录相关函数 - 简化版本
const LoginManager = {
  handleCallback: async ({ code, type }) => {
    const url = type === 'scan' 
      ? 'https://pdabot.jsjs.net/auth/scan' 
      : 'https://pdabot.jsjs.net/auth/feishu';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.code === 0) {
        const userData = data.data;
        Object.entries({
          isLoggedIn: 'true',
          userId: userData.user_id,
          openId: userData.open_id,
          userName: userData.name,
          accessToken: userData.access_token
        }).forEach(([key, value]) => localStorage.setItem(key, value));
        currentUser = { id: userData.user_id, name: userData.name };
        showMainUI(userData.name);
      } else {
        showToast('登录失败', 'danger');
        showLoginUI();
      }
    } catch (error) {
      showToast('登录失败', 'danger');
      showLoginUI();
    }
  },

  redirectToFeishu: () => {
    const params = new URLSearchParams({
      client_id: 'cli_a8be137e6579500b',
      redirect_uri: 'https://pdabot.jsjs.net/',
      response_type: 'code',
      state: Math.random().toString(36).slice(2)
    });
    window.location.href = `https://passport.feishu.cn/suite/passport/oauth/authorize?${params}`;
  },

  checkLogin: () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      if (code) {
        const type = state === 'scan' ? 'scan' : 'feishu';
        LoginManager.handleCallback({ code, type });
      } else {
        const userData = ['isLoggedIn', 'userId', 'userName'].map(key => localStorage.getItem(key));
        if (userData[0] === 'true' && userData[1] && userData[2]) {
          currentUser = { id: userData[1], name: userData[2] };
          showMainUI(userData[2]);
        } else {
          showLoginUI();
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      showLoginUI();
    }
  }
};

// UI管理器
const UIManager = {
  showMainUI: (userName) => {
    const [loginContainer, mainContainer] = ['loginContainer', 'mainContainer'].map(id => DOM.get(id));
    if (!loginContainer || !mainContainer) return;
    
    loginContainer.classList.add('d-none');
    mainContainer.classList.remove('d-none');
    
    const h5 = document.querySelector('h5');
    h5.querySelector('.user-info-tooltip')?.remove();
    
    const userInfoBtn = DOMUtils.createElement('button', {
      type: 'button',
      className: 'btn btn-sm btn-outline-secondary ms-2 user-info-tooltip',
      'data-bs-toggle': 'tooltip',
      'data-bs-placement': 'bottom',
      title: userName
    });
    
    const icon = DOMUtils.createElement('i', { className: 'bi bi-person-circle' });
    userInfoBtn.appendChild(icon);
    h5.appendChild(userInfoBtn);
    
    if (window.bootstrap) new bootstrap.Tooltip(userInfoBtn);
  },

  showLoginUI: () => {
    const [loginContainer, mainContainer] = ['loginContainer', 'mainContainer'].map(id => DOM.get(id));
    if (loginContainer && mainContainer) {
      loginContainer.classList.remove('d-none');
      mainContainer.classList.add('d-none');
    }
  }
};

// 将简化的函数暴露为全局函数
const { handleCallback: handleLoginCallback, redirectToFeishu: redirectToFeishuLogin, checkLogin } = LoginManager;
const { showMainUI, showLoginUI } = UIManager;
const handleFeishuCallback = (code) => handleLoginCallback({ code, type: 'scan' });
const handleFeishuAuthCallback = (code) => handleLoginCallback({ code, type: 'feishu' });

// 渲染选项管理器 - 统一处理硬盘和CPU选项
const OptionsRenderer = {
  // 渲染配置
  config: {
    硬盘: {
      dataSource: 'diskPnList',
      defaultText: '请选择硬盘PN',
      getOptionText: (item) => `${item.pn}【${item.Type}】`
    },
    CPU: {
      dataSource: 'cpuPnList', 
      defaultText: '请选择CPU型号',
      getOptionText: (item) => item.pn
    }
  },

  // 获取默认提示文本
  getDefaultText: (type) => {
    return OptionsRenderer.config[type]?.defaultText || '请选择';
  },

  // 统一渲染方法
  renderOptions: (type, brand, targetElement, isSelect = false) => {
    if (!window.partsData || !OptionsRenderer.config[type]) {
      console.warn(`数据源未就绪: partsData=${!!window.partsData}, config=${!!OptionsRenderer.config[type]}`);
    return;
  }
    
    const config = OptionsRenderer.config[type];
    const list = window.partsData[config.dataSource]?.filter(item => item.brand === brand) || [];
    
    console.log(`渲染选项: type=${type}, brand=${brand}, 找到${list.length}个选项`);
    
    if (isSelect) {
      const optionsData = [
        { value: "", text: config.defaultText },
        ...list.map(item => ({ value: item.pn, text: config.getOptionText(item) }))
      ];
      DOMUtils.replaceOptions(targetElement, optionsData);
    } else {
      const optionsData = ["", ...list.map(item => item.pn)];
      DOMUtils.replaceDatalistOptions(targetElement, optionsData);
    }
  }
};

// 简化选项渲染函数
const renderDiskPnOptions = (datalist, brand) => OptionsRenderer.renderOptions('硬盘', brand, datalist);
const renderCpuPnOptions = (datalist, brand) => OptionsRenderer.renderOptions('CPU', brand, datalist);

// 主初始化函数 - 简化版本
const mainInit = async () => {
  try {
    await waitForData();
    
    // 检查必要元素 - 增强检查
    const requiredElements = [orderNo, typeSelect, newBrand, oldBrand, newPN, oldPN, newSN, oldSN];
    const missingElements = requiredElements.filter(el => !el);
    
    if (missingElements.length > 0) {
      console.warn('部分必要DOM元素未找到，延迟初始化');
      setTimeout(mainInit, 500); // 延迟500ms重试
      return;
    }
    
    updateBrandOptions();
    bindEvents();
    loadFormData();
    
    const resetBtn = DOM.get('resetBtn');
    if (resetBtn) resetBtn.onclick = resetForm;
    
    checkLogin();
    console.log('页面初始化完成');
  } catch (error) {
    console.error('页面初始化失败:', error);
    showToast('页面初始化失败，请刷新页面', 'danger');
  }
};

// 页面加载事件处理
if (!window.partsData?.brandMap) {
  window.addEventListener('partsDataLoaded', mainInit, { once: true });
} else {
  document.addEventListener('DOMContentLoaded', mainInit);
}

// 表单数据加载 - 优化版本
const loadFormData = async () => {
  restoring = true;
  try {
    const typeVal = localStorage.getItem('pda_type');
    if (!typeVal || typeVal === "请选择" || !window.partsData?.brandMap?.[typeVal]) return;
    
      typeSelect.value = typeVal;
      await updateBrandOptions();

    // 恢复品牌选择
    const brandValues = ['newBrand', 'oldBrand'].map(key => localStorage.getItem(`pda_${key}`));
    await new Promise(resolve => {
          const checkOptions = () => {
            if (newBrand.options.length > 0 && oldBrand.options.length > 0) {
          [newBrand, oldBrand].forEach((element, index) => {
            const value = brandValues[index];
            if (value && value !== "请选择") {
              element.value = value;
              element.dispatchEvent(new Event('change'));
            }
          });
              resolve();
            } else {
              setTimeout(checkOptions, 100);
            }
          };
          checkOptions();
        });

    // 恢复其他输入框
    const fieldMappings = [
      [orderNo, 'pda_orderNo'], [switchLocation, 'pda_switchLocation'],
      [portNo, 'pda_portNo'], [serverSN, 'pda_serverSN'],
      [newSN, 'pda_newSN'], [oldSN, 'pda_oldSN']
    ];
    
    fieldMappings.forEach(([element, key]) => {
      const value = localStorage.getItem(key);
      if (value) {
        element.value = value;
        element.dispatchEvent(new Event('input'));
      }
    });

    // 处理PN输入框
      if (typeVal === '硬盘') {
        switchPnInput('硬盘');
      updatePnOptions('硬盘', brandValues[0], newPnOptions);
      updatePnOptions('硬盘', brandValues[1], oldPnOptions);
        
            setTimeout(() => {
        ['new', 'old'].forEach((type, index) => {
          const value = localStorage.getItem(`pda_${type}PN`);
          if (value) {
            const select = DOM.get(`${type}PNSelect`);
                  if (select) {
              select.value = value;
                    select.dispatchEvent(new Event('change'));
                  }
                }
              });
              bindPNSelectSave();
            }, 120);
      } else {
      ['new', 'old'].forEach(type => {
        const value = localStorage.getItem(`pda_${type}PN`);
        if (value) {
          const input = DOM.get(`${type}PN`);
          const select = DOM.get(`${type}PNSelect`);
          
          if (select?.style.display !== 'none') {
            select.value = value;
              select.dispatchEvent(new Event('change'));
            } else {
            input.value = value;
              input.dispatchEvent(new Event('input'));
            }
          }
        });
        bindPNSelectSave();
    }
  } catch (error) {
    console.error('加载表单数据失败:', error);
  } finally {
    restoring = false;
    update();
  }
};

// 事件绑定 - 简化版本
const bindEvents = () => {
  if (typeSelect) {
    typeSelect.addEventListener("change", async () => {
      const type = typeSelect.value;
      const isOptical = type === "光模块";
      
      serverSNRow?.classList.toggle("d-none", isOptical);
      DOM.get('switchInfoRow')?.classList.toggle("d-none", !isOptical);
      
      await updateBrandOptions();
      update();
      switchPnInput(type);
    });
  }

  if (newBrand && oldBrand) {
    [newBrand, oldBrand].forEach((select, index) => {
      select.addEventListener("change", () => {
        const type = typeSelect.value;
        const brand = select.value;
        const datalist = index === 0 ? newPnOptions : oldPnOptions;
        
        console.log(`品牌选择变化: ${type}, 品牌: ${brand}`);
        
        // 首先切换PN输入框类型（创建select元素）
        if (['硬盘', 'CPU'].includes(type) && brand !== "请选择") {
          PNInputManager.handlePNInput(type, index === 0, brand);
        }
        
        // 然后更新PN选项
        updatePnOptions(type, brand, datalist);
        
        update();
      });
    });
  }

  // 批量绑定输入事件
  EventManager.bindEvents([orderNo, serverSN, switchLocation, portNo, newPN, newSN, oldPN, oldSN], 'input', update);
};

// PN输入框切换管理器 - 重构版本
const PNInputManager = {
  // 创建或获取select元素 - 增强安全性
  getOrCreateSelect: (targetId, parentElement, inputElement) => {
    // 首先尝试从DOM缓存获取
    let select = DOM.get(targetId);
    
    if (!select && parentElement && inputElement) {
      try {
        console.log(`创建select元素: ${targetId}`);
        select = document.createElement("select");
        select.id = targetId;
        select.className = inputElement.className;
        select.addEventListener("change", update);
        parentElement.appendChild(select);
        
        // 更新DOM缓存 - 修复缓存访问
        const cache = DOM.cache || new Map();
        cache.set(targetId, select);
        
        console.log(`成功创建select元素: ${targetId}`);
      } catch (error) {
        console.error(`创建select元素失败: ${targetId}`, error);
        return null;
      }
    }
    
    return select;
  },

  // 切换显示状态 - 修复null检查
  toggleDisplay: (selectElement, inputElement, showSelect) => {
    if (showSelect && selectElement) {
      selectElement.style.display = "";
      if (inputElement) inputElement.style.display = "none";
  } else {
      if (selectElement) selectElement.style.display = "none";
      if (inputElement) inputElement.style.display = "";
    }
  },

  // 处理单个PN输入框 - 增强安全检查
  handlePNInput: (type, isNewField, brand) => {
    const prefix = isNewField ? 'new' : 'old';
    const inputElement = isNewField ? newPN : oldPN;
    
    // 安全检查：确保输入元素存在
    if (!inputElement) {
      console.warn(`输入元素 ${prefix}PN 不存在`);
      return;
    }
    
    const parentElement = inputElement.parentElement;
    if (!parentElement) {
      console.warn(`父元素不存在: ${prefix}PN`);
      return;
    }
    
    const selectId = `${prefix}PNSelect`;
    const needsSelect = ['硬盘', 'CPU'].includes(type);
    
    let selectElement = null;
    
    if (needsSelect) {
      selectElement = PNInputManager.getOrCreateSelect(selectId, parentElement, inputElement);
      if (selectElement) {
        OptionsRenderer.renderOptions(type, brand, selectElement, true);
      }
  } else {
      selectElement = DOM.get(selectId);
    }
    
    // 安全切换显示状态
    PNInputManager.toggleDisplay(selectElement, inputElement, needsSelect);
  }
};

// 简化的切换函数 - 增强错误处理
const switchPnInput = (type) => {
  try {
    console.log(`切换PN输入框类型: ${type}`);
    
    if (!type || type === '请选择') {
      console.warn('配件类型无效，跳过PN输入框切换');
      return;
    }
    
    // 确保品牌元素存在再获取值
    const newBrandValue = newBrand?.value || '';
    const oldBrandValue = oldBrand?.value || '';
    
    console.log(`品牌值: 新件=${newBrandValue}, 旧件=${oldBrandValue}`);
    
    PNInputManager.handlePNInput(type, true, newBrandValue);   // 新件
    PNInputManager.handlePNInput(type, false, oldBrandValue);  // 旧件
    
    console.log('PN输入框切换完成');
  } catch (error) {
    console.error('PN输入框切换失败:', error);
    showToast('配件类型切换失败，请刷新页面重试', 'warning');
  }
};

// 监听硬盘PN select 的变化
const bindPNSelectUpdate = () => {
  ["newPNSelect", "oldPNSelect"].forEach(id => {
    const sel = DOM.get(id);
    if (sel) {
      sel.removeEventListener("change", update);
      sel.addEventListener("change", update);
    }
  });
};

// 更新PN选项 - 精简版本
const updatePnOptions = (type, brand, datalist) => {
  if (restoring) return;
  
  if (['硬盘', 'CPU'].includes(type)) {
    OptionsRenderer.renderOptions(type, brand, datalist);
    
    // 同步select元素
    const isNew = datalist === newPnOptions;
    const select = DOM.get(isNew ? "newPNSelect" : "oldPNSelect");
    if (select) {
      OptionsRenderer.renderOptions(type, brand, select, true);
    }
  } else {
    const list = window.partsData.pnDataMap?.[type]?.[brand] || [];
    DOMUtils.replaceDatalistOptions(datalist, list);
  }
};

const formatSamsungMemoryPn = (pn) => {
  const index = pn.indexOf("M");
  return index !== -1 ? pn.slice(index) : pn;
};

const update = () => {
  if (restoring) return;
  
  // 安全检查：确保必要的元素存在
  if (!typeSelect || !orderNo || !newBrand || !oldBrand || !newPN || !oldPN || !newSN || !oldSN) {
    console.warn('部分DOM元素尚未初始化，跳过更新');
    return;
  }
  
  const type = typeSelect.value;
  const order = orderNo.value.trim().match(/\d+/)?.[0] || "";
  const isOptical = type === "光模块";
  const switchLoc = switchLocation ? switchLocation.value.trim() : "";
  const port = portNo ? portNo.value.trim() : "";
  const server = serverSN ? serverSN.value.trim() : "";
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

  // ✅ 字符数统计（必须在格式化之后）- 添加安全检查
  if (countNewPN) countNewPN.textContent = `字符数：${pn1.length}`;
  if (countNewSN) countNewSN.textContent = `字符数：${sn1.length}`;
  if (countOldPN) countOldPN.textContent = `字符数：${pn2.length}`;
  if (countOldSN) countOldSN.textContent = `字符数：${sn2.length}`;

  // Samsung 格式校验提示 - 添加安全检查
  if (type === "内存" && checkNewPN && checkOldPN) {
    if (brand1 === "Samsung" && pn1 && !pn1.startsWith("M")) {
      checkNewPN.textContent = "请检查内存PN";
      checkNewPN.className = "text-danger me-2";
    }
    if (brand2 === "Samsung" && pn2 && !pn2.startsWith("M")) {
      checkOldPN.textContent = "请检查内存PN";
      checkOldPN.className = "text-danger me-2";
    }
  }

  // 优化：只要新旧PN都已选择且不为默认提示文本时就校验一致性 - 添加安全检查
  if ((type === "内存" || type === "硬盘") && checkNewPN && checkOldPN) {
    const defaultText = OptionsRenderer.getDefaultText(type);
    if (pn1 && pn2 && pn1 !== "" && pn2 !== "" && pn1 !== defaultText && pn2 !== defaultText) {
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

  // 文本预览生成（顶格写法）- 添加安全检查
  if (preview) {
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
    if (typeof hljs !== 'undefined') {
  hljs.highlightElement(preview);
    }
  }
  saveFormData();
};


// 修改 sendToFeishu，传递对象数据
const sendToFeishu = () => {
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
    user_id: (currentUser && currentUser.id) ? currentUser.id : '',
    user_access_token: user_access_token
  };

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
};

// 修改 sendApplyNotify 函数
const sendApplyNotify = () => {
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
  const defaultText = OptionsRenderer.getDefaultText(typeSelect.value);
  if (!brand2 || brand2 === '请选择' || !sn2 || !pn2 || pn2 === defaultText) {
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
};

// 表单数据管理器
const FormDataManager = {
// 获取PN值（兼容input和select）
  getPNValue: (type) => {
    const input = DOM.get(type === "new" ? "newPN" : "oldPN");
    const select = DOM.get(type === "new" ? "newPNSelect" : "oldPNSelect");
    
    // 安全检查：确保元素存在再访问value属性
  if (select && select.style.display !== "none") {
      return select.value || "";
  }
    return input ? input.value || "" : "";
  },

// 保存表单数据
  save: () => {
  if (restoring) return;
  
    // 安全获取元素值的函数
    const safeGetValue = (element) => element ? (element.value || "") : "";
    
    // 字段映射配置 - 增加安全检查
    const fieldMappings = [
      ['pda_type', safeGetValue(typeSelect)],
      ['pda_newBrand', safeGetValue(newBrand)],
      ['pda_oldBrand', safeGetValue(oldBrand)],
      ['pda_orderNo', safeGetValue(orderNo)],
      ['pda_switchLocation', safeGetValue(switchLocation)],
      ['pda_portNo', safeGetValue(portNo)],
      ['pda_serverSN', safeGetValue(serverSN)],
      ['pda_newSN', safeGetValue(newSN)],
      ['pda_oldSN', safeGetValue(oldSN)],
      ['pda_newPN', FormDataManager.getPNValue("new")],
      ['pda_oldPN', FormDataManager.getPNValue("old")]
    ];

    const type = typeSelect?.value || "";
    const defaultText = OptionsRenderer.getDefaultText(type);
    const invalidValues = ["", "请选择", defaultText];
    
    fieldMappings.forEach(([key, value]) => {
      if (value && !invalidValues.includes(value)) {
        localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  });
  },

  // 绑定PN Select保存事件
  bindPNSelectSave: () => {
    ["newPNSelect", "oldPNSelect"].forEach(id => {
      const sel = DOM.get(id);
      if (sel) sel.onchange = FormDataManager.save;
    });
  }
};

// 简化的保存函数
const saveFormData = FormDataManager.save;
const getPNValue = FormDataManager.getPNValue;
const bindPNSelectSave = FormDataManager.bindPNSelectSave;

// 统一绑定表单保存事件
EventManager.bindFormSaveEvents([
  orderNo, switchLocation, portNo, serverSN, newSN, oldSN, 
  newPN, oldPN, typeSelect, newBrand, oldBrand
]);

// 监听动态PN select变化
document.addEventListener("change", (e) => {
  if (e.target?.id?.includes("PNSelect")) {
    saveFormData();
  }
});

// 重置按钮
const resetForm = () => {
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
        cache.delete('https://pn.scdn.vip:25625/pn.json');
      });
    }
  }
};

// Bootstrap 表单验证 - 精简版本
const FormValidator = {
  config: {
    conditionalFields: [
      { condition: () => typeSelect.value === '交换机' && !DOM.get('switchInfoRow').classList.contains('d-none'), fields: ['switchLocation', 'portNo'] },
      { condition: () => ['CPU', '内存', '硬盘', '光模块'].includes(typeSelect.value) && !DOM.get('brandSection').classList.contains('d-none'), fields: ['newBrand', 'oldBrand'] }
    ],
    invalidValues: ['', '请选择', '请选择群']
  },

  setValidationState: (element, isValid) => {
    if (!element) return;
    element.classList.remove('is-invalid', 'is-valid');
    if (isValid !== null) element.classList.add(isValid ? 'is-valid' : 'is-invalid');
  },

  setRequired: (element, required) => {
    if (!element) return;
    required ? element.setAttribute('required', '') : element.removeAttribute('required');
    if (!required) FormValidator.setValidationState(element, null);
  },

  validateSelect: (select) => {
    return select.value && !FormValidator.config.invalidValues.includes(select.value) && !select.options[select.selectedIndex].disabled;
  },

  updateConditionalFields: () => {
    FormValidator.config.conditionalFields.forEach(({ condition, fields }) => {
      fields.forEach(fieldId => FormValidator.setRequired(DOM.get(fieldId), condition()));
    });
  },

  bindElementValidation: (element) => {
    const isSelect = element.tagName === 'SELECT';
    
    element.addEventListener('blur', () => {
      const isValid = isSelect ? FormValidator.validateSelect(element) : element.checkValidity();
      FormValidator.setValidationState(element, isValid);
    });

    element.addEventListener(isSelect ? 'change' : 'input', () => {
      if (element.classList.contains('is-invalid') && element.value.trim()) {
        const isValid = isSelect ? FormValidator.validateSelect(element) : element.checkValidity();
        FormValidator.setValidationState(element, isValid ? true : null);
      }
    });
  },

  init: () => {
    const form = DOM.get('pdaForm');
    if (!form) return;

    typeSelect?.addEventListener('change', FormValidator.updateConditionalFields);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();
      FormValidator.updateConditionalFields();

    if (form.checkValidity()) {
      sendToFeishu();
      showToast('表单验证通过，正在发送...', 'success');
    } else {
      showToast('请填写所有必填字段', 'danger');
    }
    form.classList.add('was-validated');
  });

    form.querySelectorAll('input[required], select[required]').forEach(FormValidator.bindElementValidation);
  }
};

const initFormValidation = FormValidator.init;

// 增强重置功能 - 覆盖原有resetForm
const originalResetForm = resetForm;
Object.assign(window, {
  resetForm: () => {
    const form = DOM.get('pdaForm');
  if (form) {
    form.classList.remove('was-validated');
      form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
  }
  originalResetForm();
  }
});

// 调试工具函数
const debugDOMState = () => {
  console.log('=== DOM状态检查 ===');
  console.log('orderNo:', orderNo);
  console.log('typeSelect:', typeSelect);
  console.log('newBrand:', newBrand);
  console.log('oldBrand:', oldBrand);
  console.log('newPN:', newPN);
  console.log('oldPN:', oldPN);
  console.log('newSN:', newSN);
  console.log('oldSN:', oldSN);
  console.log('=== 检查完成 ===');
};

// 在页面加载完成后初始化表单验证
document.addEventListener('DOMContentLoaded', () => {
  // 延迟初始化，确保其他脚本已经加载完成
  setTimeout(() => {
    debugDOMState(); // 调试DOM状态
    initFormValidation();
  }, 1000);
}); 
