// === ARKAIOS Overlay Content Script ===
// Injects a right-side overlay that hosts chat-module.html inside an <iframe>.
// Includes a drag resizer and remembers width per domain in chrome.storage.local.
(() => {
 const OVERLAY_ID = '__arkaios_overlay__';
 const IFRAME_ID = '__arkaios_overlay_iframe__';
 const RESIZER_ID = '__arkaios_overlay_resizer__';
 const TOGGLE_ID = '__arkaios_overlay_close__';
 const DOM_HIGHLIGHT_CLASS = '__arkaios_dom_highlight__';
 // Utility
 const hostKey = () => (location.host || 'default');
 const storageKey = (host) => `ark_overlay_width:${host}`;
 let iframeRef = null;
 let domListenerAttached = false;
 // CSS (scoped by container id to avoid leaking styles) - FIXED: pointer-events and no global body modifications
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
 pointer-events: auto;
 }
 #${OVERLAY_ID}[data-hidden="true"] { display: none !important; }
 #${OVERLAY_ID}[data-hidden="true"] * { pointer-events: none !important; }
 #${RESIZER_ID} {
 position: absolute;
 left: -6px;
 top: 0;
 width: 6px;
 height: 100%;
 cursor: ew-resize;
 background: transparent;
 pointer-events: auto;
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
 pointer-events: auto;
 }
 #${TOGGLE_ID}:hover { background: rgba(25,32,52,.95); }
 #${IFRAME_ID} {
 border: 0;
 width: 100%;
 height: 100%;
 background: transparent;
 pointer-events: auto;
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
 iframeRef = iframe;
 container.appendChild(resizer);
 container.appendChild(toggle);
 container.appendChild(iframe);
 document.documentElement.appendChild(container);
 ensureDomBridgeListener();
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
 function ensureDomBridgeListener() {
 if (domListenerAttached) return;
 domListenerAttached = true;
 window.addEventListener('message', (event) => {
 if (!iframeRef || event.source !== iframeRef.contentWindow) return;
 const payload = event.data || {};
 if (payload.type !== 'ARKAIOS_DOM_COMMAND') return;
 const { requestId, command } = payload;
 let result = null;
 let success = true;
 let error = null;
 try {
 result = executeDomAction(command);
 } catch (err) {
 success = false;
 error = err.message || 'Error desconocido ejecutando DOM';
 }
 event.source.postMessage({
 type: 'ARKAIOS_DOM_RESULT',
 requestId,
 success,
 result,
 error
 }, '*');
 });
 }
 function executeDomAction(command = {}) {
 if (!command || typeof command !== 'object') {
 throw new Error('Comando DOM inválido');
 }
 const action = (command.action || '').toUpperCase();
 if (!action) {
 throw new Error('El comando DOM requiere "action"');
 }
 if (action === 'PAGE_INFO') {
 return {
 url: location.href,
 title: document.title,
 viewport: {
 width: window.innerWidth,
 height: window.innerHeight
 }
 };
 }
 const requiresSelector = !['PAGE_INFO'].includes(action);
 if (requiresSelector && !command.selector) {
 throw new Error('Falta "selector" para la acción DOM');
 }
 const nodes = command.selector ? Array.from(document.querySelectorAll(command.selector)) : [];
 if (requiresSelector && nodes.length === 0) {
 throw new Error(`No se encontraron elementos para selector: ${command.selector}`);
 }
 const index = typeof command.index === 'number' ? command.index : 0;
 const target = nodes[index] || nodes[0];
 const allTargets = command.all ? nodes : [target];
 switch (action) {
 case 'READ_TEXT':
 return command.all
 ? allTargets.map((el) => el.textContent.trim())
 : target.textContent.trim();
 case 'READ_HTML':
 return command.all
 ? allTargets.map((el) => el.innerHTML)
 : target.innerHTML;
 case 'READ_ATTR':
 if (!command.attribute) throw new Error('"attribute" requerido para READ_ATTR');
 return target.getAttribute(command.attribute);
 case 'SET_TEXT':
 ensureHighlightStyles();
 allTargets.forEach((el) => {
 el.textContent = command.value ?? '';
 });
 highlightTargets(allTargets);
 return { updated: allTargets.length };
 case 'SET_VALUE':
 ensureHighlightStyles();
 allTargets.forEach((el) => {
 if ('value' in el) {
 el.value = command.value ?? '';
 el.dispatchEvent(new Event('input', { bubbles: true }));
 el.dispatchEvent(new Event('change', { bubbles: true }));
 }
 });
 highlightTargets(allTargets);
 return { updated: allTargets.length };
 case 'SET_ATTR':
 if (!command.attribute) throw new Error('"attribute" requerido para SET_ATTR');
 ensureHighlightStyles();
 allTargets.forEach((el) => el.setAttribute(command.attribute, command.value ?? ''));
 highlightTargets(allTargets);
 return { updated: allTargets.length };
 case 'REMOVE_ATTR':
 if (!command.attribute) throw new Error('"attribute" requerido para REMOVE_ATTR');
 ensureHighlightStyles();
 allTargets.forEach((el) => el.removeAttribute(command.attribute));
 highlightTargets(allTargets);
 return { updated: allTargets.length };
 case 'CLICK':
 target.click();
 highlightTargets([target]);
 return { clicked: true };
 case 'FOCUS':
 target.focus({ preventScroll: !!command.preventScroll });
 highlightTargets([target]);
 return { focused: true };
 case 'SCROLL_INTO_VIEW':
 target.scrollIntoView({
 behavior: command.behavior || 'smooth',
 block: command.block || 'center'
 });
 highlightTargets([target]);
 return { scrolled: true };
 case 'INSERT_HTML':
 if (typeof command.html !== 'string') {
 throw new Error('"html" requerido para INSERT_HTML');
 }
 target.insertAdjacentHTML(command.position || 'beforeend', command.html);
 highlightTargets([target]);
 return { inserted: true };
 case 'REMOVE':
 ensureHighlightStyles();
 allTargets.forEach((el) => el.remove());
 return { removed: allTargets.length };
 case 'HIGHLIGHT':
 highlightTargets(allTargets, { duration: command.duration || 4000, persistent: !!command.persistent });
 return { highlighted: allTargets.length };
 case 'QUERY_ALL':
 case 'INSPECT': {
 const limit = Math.min(nodes.length, command.limit || 10);
 const items = nodes.slice(0, limit).map((el, idx) => ({
 index: idx,
 tag: el.tagName,
 text: (el.textContent || '').trim().slice(0, 280),
 html: el.innerHTML.slice(0, 280),
 attributes: serializeAttributes(el)
 }));
 if (command.highlight) {
 highlightTargets(nodes.slice(0, limit));
 }
 return { count: nodes.length, items };
 }
 default:
 throw new Error(`Acción DOM no soportada: ${action}`);
 }
 }
 function serializeAttributes(el) {
 return Array.from(el.attributes || []).reduce((acc, attr) => {
 acc[attr.name] = attr.value;
 return acc;
 }, {});
 }
 function ensureHighlightStyles() {
 if (document.getElementById('__arkaios_dom_styles__')) return;
 const style = document.createElement('style');
 style.id = '__arkaios_dom_styles__';
 style.textContent = `.${DOM_HIGHLIGHT_CLASS}{outline:2px solid rgba(0,224,255,0.9)!important;box-shadow:0 0 0 2px rgba(0,224,255,0.4)!important;}`;
 document.documentElement.appendChild(style);
 }
 function highlightTargets(elements, options = {}) {
 ensureHighlightStyles();
 const duration = options.duration || 2000;
 elements.forEach((el) => {
 if (!el || typeof el.classList === 'undefined') return;
 el.classList.add(DOM_HIGHLIGHT_CLASS);
 if (!options.persistent) {
 setTimeout(() => {
 el.classList.remove(DOM_HIGHLIGHT_CLASS);
 }, duration);
 }
 });
 }
})();
// === End ARKAIOS Overlay Content Script ===
