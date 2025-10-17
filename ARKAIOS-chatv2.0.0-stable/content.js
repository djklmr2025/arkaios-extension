// === ARKAIOS Overlay Content Script ===
// Injects a right-side overlay that hosts chat-module.html inside an <iframe>.
// Includes a drag resizer and remembers width per domain in chrome.storage.local.

(() => {
  const OVERLAY_ID = '__arkaios_overlay__';
  const IFRAME_ID  = '__arkaios_overlay_iframe__';
  const RESIZER_ID = '__arkaios_overlay_resizer__';
  const TOGGLE_ID  = '__arkaios_overlay_close__';

  // Utility
  const hostKey = () => (location.host || 'default');
  const storageKey = (host) => `ark_overlay_width:${host}`;

  // CSS (scoped by container id to avoid leaking styles)
  const css = `
  #${OVERLAY_ID} {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: min(480px, 45vw);
    max-width: 86vw;
    min-width: 360px;
    background: #0b0f1a;
    color: #fff;
    z-index: 2147483647;
    box-shadow: -12px 0 28px rgba(0,0,0,.35);
    border-left: 1px solid rgba(255,255,255,.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  #${OVERLAY_ID}[data-hidden="true"] { display:none; }

  #${RESIZER_ID} {
    position: absolute;
    left: -6px;
    top: 0;
    width: 6px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
  }
  #${RESIZER_ID}:hover { background: rgba(255,255,255,.08); }

  #${TOGGLE_ID} {
    position: absolute;
    top: 10px;
    left: -42px;
    width: 38px;
    height: 38px;
    border-radius: 10px 0 0 10px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(11,15,26,.9);
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: -6px 0 18px rgba(0,0,0,.35);
    backdrop-filter: blur(4px);
    user-select: none;
    font: 600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Arial, sans-serif;
  }
  #${TOGGLE_ID}:hover { background: rgba(25,32,52,.95); }

  #${IFRAME_ID} {
    border: 0;
    width: 100%;
    height: 100%;
    background: transparent;
  }
  `;

  function ensureStyles() {
    if (document.getElementById('__arkaios_overlay_styles__')) return;
    const s = document.createElement('style');
    s.id = '__arkaios_overlay_styles__';
    s.textContent = css;
    document.documentElement.appendChild(s);
  }

  function createOverlay() {
    ensureStyles();
    let container = document.getElementById(OVERLAY_ID);
    if (container) return container;

    container = document.createElement('div');
    container.id = OVERLAY_ID;

    const resizer = document.createElement('div');
    resizer.id = RESIZER_ID;

    const toggle = document.createElement('button');
    toggle.id = TOGGLE_ID;
    toggle.textContent = '×';
    toggle.title = 'Cerrar (Esc)';
    toggle.addEventListener('click', () => hideOverlay());

    const iframe = document.createElement('iframe');
    iframe.id = IFRAME_ID;
    iframe.src = chrome.runtime.getURL('chat-module.html');

    container.appendChild(resizer);
    container.appendChild(toggle);
    container.appendChild(iframe);
    document.documentElement.appendChild(container);

    // Restore width per host
    const key = storageKey(hostKey());
    chrome.storage.local.get({ [key]: null }, (v) => {
      const saved = v[key];
      if (saved && typeof saved === 'number') {
        setWidth(Math.max(360, Math.min(saved, Math.floor(window.innerWidth * 0.86))));
      }
    });

    // ESC to close
    window.addEventListener('keydown', escCloser, { passive: true });

    // Resizer
    resizer.addEventListener('mousedown', startResize);
    return container;
  }

  function openOverlay() {
    const el = createOverlay();
    el.dataset.hidden = 'false';
  }
  function hideOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    el.dataset.hidden = 'true';
    window.removeEventListener('keydown', escCloser, { passive: true });
  }
  function escCloser(e) {
    if (e.key === 'Escape') hideOverlay();
  }

  function setWidth(px) {
    const el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    el.style.width = `${px}px`;
  }

  let resizing = false;
  let startX = 0;
  let startWidth = 0;

  function startResize(e) {
    e.preventDefault();
    resizing = true;
    startX = e.clientX;
    const el = document.getElementById(OVERLAY_ID);
    startWidth = parseInt(getComputedStyle(el).width, 10);
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.userSelect = 'none';
  }
  function onResize(e) {
    if (!resizing) return;
    const dx = startX - e.clientX;
    const newW = Math.max(360, Math.min(startWidth + dx, Math.floor(window.innerWidth * 0.86)));
    setWidth(newW);
  }
  function stopResize() {
    if (!resizing) return;
    resizing = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.userSelect = '';

    // Save width per host
    const el = document.getElementById(OVERLAY_ID);
    if (el) {
      const w = parseInt(getComputedStyle(el).width, 10);
      const key = storageKey(hostKey());
      chrome.storage.local.set({ [key]: w });
    }
  }

  // Listen for background messages to open overlay
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'ARK_OPEN_OVERLAY') {
      openOverlay();
      sendResponse && sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  // Optional: auto-create container so first open is instant (hidden by default)
  createOverlay().dataset.hidden = 'true';
})();
// === End ARKAIOS Overlay Content Script ===
