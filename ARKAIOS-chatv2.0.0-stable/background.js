// === ARKAIOS Lab Gateway - Background (Clean Minimal) ===

// Open mode preference: 'sidepanel' | 'window' | 'overlay'
const ARK_DEFAULT_MODE = 'sidepanel';

function getOpenMode() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ openMode: ARK_DEFAULT_MODE }, (v) => resolve(v.openMode));
  });
}

function arkIsAllowedUrl(url) {
  if (!url) return false;
  const banned = ['chrome://', 'chrome-extension://', 'chromewebstore.google.com', 'edge://', 'about:', 'file://'];
  if (banned.some(p => url.startsWith(p))) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

let lastDomCapableTabId = null;

function rememberDomCapableTab(tab) {
  if (!tab || typeof tab.id !== 'number') return;
  if (!arkIsAllowedUrl(tab.url || '')) return;
  lastDomCapableTabId = tab.id;
}

function watchActiveTabs() {
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return;
      rememberDomCapableTab(tab);
    });
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab && tab.active && changeInfo.status === 'complete') {
      rememberDomCapableTab(tab);
    }
  });

  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (chrome.runtime.lastError) return;
      const tab = tabs && tabs[0];
      if (tab) rememberDomCapableTab(tab);
    });
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === lastDomCapableTabId) {
      lastDomCapableTabId = null;
    }
  });
}

watchActiveTabs();

function getTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(tab);
    });
  });
}

function queryTabs(queryInfo) {
  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      resolve(tabs || []);
    });
  });
}

async function isControllableTab(tabId) {
  if (typeof tabId !== 'number') return false;
  try {
    const tab = await getTab(tabId);
    return arkIsAllowedUrl(tab.url || '');
  } catch (error) {
    return false;
  }
}

async function resolveDomTargetTabId(preferredTabId) {
  if (await isControllableTab(preferredTabId)) {
    return preferredTabId;
  }

  if (await isControllableTab(lastDomCapableTabId)) {
    return lastDomCapableTabId;
  }

  const focusedTabs = await queryTabs({ active: true, lastFocusedWindow: true });
  const focusedCandidate = focusedTabs.find((tab) => arkIsAllowedUrl(tab.url || ''));
  if (focusedCandidate) {
    rememberDomCapableTab(focusedCandidate);
    return focusedCandidate.id;
  }

  const anyActive = await queryTabs({ active: true });
  const fallback = anyActive.find((tab) => arkIsAllowedUrl(tab.url || ''));
  if (fallback) {
    rememberDomCapableTab(fallback);
    return fallback.id;
  }

  return null;
}

function sendDomCommandToTab(tabId, command) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'ARKAIOS_DOM_EXECUTE', command }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        resolve({ success: false, error: err.message });
        return;
      }
      if (!response) {
        resolve({ success: false, error: 'Sin respuesta del contenido.' });
        return;
      }
      resolve(response);
    });
  });
}

async function proxyDomCommand(command = {}, options = {}) {
  const tabId = await resolveDomTargetTabId(options.tabId);
  if (!tabId) {
    return { success: false, error: 'No hay pestaña activa controlable para DOM.' };
  }

  try {
    const result = await sendDomCommandToTab(tabId, command);
    return result;
  } catch (error) {
    return { success: false, error: error.message || 'No fue posible ejecutar la orden DOM.' };
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  // initialize pref
  chrome.storage.local.get({ openMode: ARK_DEFAULT_MODE }, (v) => {
    chrome.storage.local.set({ openMode: v.openMode });
  });
  try {
    if (chrome.sidePanel && chrome.sidePanel.setOptions) {
      await chrome.sidePanel.setOptions({ path: 'chat-module.html', enabled: true });
    }
  } catch (e) {}
});

chrome.action.onClicked.addListener(async (tab) => {
  const mode = await getOpenMode();
  const url = tab?.url || '';
  const canInject = arkIsAllowedUrl(url);

  if (mode === 'window' || !canInject) {
    chrome.windows.create({ url: chrome.runtime.getURL('chat-module.html'), type: 'popup', width: 480, height: 900 });
    return;
  }

  if (mode === 'sidepanel' && chrome.sidePanel && chrome.sidePanel.setOptions && chrome.sidePanel.open) {
    try {
      await chrome.sidePanel.setOptions({ tabId: tab.id, path: 'chat-module.html', enabled: true });
      await chrome.sidePanel.open({ tabId: tab.id });
      return;
    } catch (e) {}
  }

  // overlay fallback
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'ARK_OPEN_OVERLAY' });
  } catch (e) {
    chrome.windows.create({ url: chrome.runtime.getURL('chat-module.html'), type: 'popup', width: 480, height: 900 });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'ARK_SET_OPEN_MODE') {
    chrome.storage.local.set({ openMode: msg.mode });
    sendResponse({ ok: true });
    return true;
  }
  if (msg && msg.type === 'ARK_ATTACH_TO_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab) { sendResponse({ ok:false }); return; }
      const url = tab.url || '';
      const canInject = arkIsAllowedUrl(url);
      if (chrome.sidePanel && chrome.sidePanel.setOptions && chrome.sidePanel.open && canInject) {
        try {
          await chrome.sidePanel.setOptions({ tabId: tab.id, path: 'chat-module.html', enabled: true });
          await chrome.sidePanel.open({ tabId: tab.id });
          sendResponse({ ok: true, mode: 'sidepanel' });
          return;
        } catch (e) {}
      }
      if (canInject) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'ARK_OPEN_OVERLAY' });
          sendResponse({ ok: true, mode: 'overlay' });
          return;
        } catch (e) {}
      }
      chrome.windows.create({ url: chrome.runtime.getURL('chat-module.html'), type: 'popup', width: 480, height: 900 });
      sendResponse({ ok: true, mode: 'window' });
    });
    return true;
  }
  if (msg && msg.type === 'ARKAIOS_DOM_PROXY') {
    (async () => {
      const response = await proxyDomCommand(msg.command || {}, msg.options || {});
      sendResponse(response);
    })();
    return true;
  }
  return false;
});

// Minimal Gateway class (logs only; replace with real hooks when needed)
class ArkaiosGatewayIntegration {
  constructor() {
    console.log('🧪 ARKAIOS Gateway Integration iniciado');
    console.log('✅ Gateway ARKAIOS activo');
  }
}

const arkaiosGateway = new ArkaiosGatewayIntegration();
globalThis.ARKAIOS_GATEWAY = arkaiosGateway;
// === End Clean Minimal ===
