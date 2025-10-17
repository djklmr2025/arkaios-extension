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
