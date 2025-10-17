// openbar.js - handles open mode UI without inline JS (MV3 CSP-friendly)

(function(){
  const q = (s)=>document.querySelector(s);
  const label = () => q('#ark-openmode-label');

  function setModeLabel(m){
    const l = label();
    if (l) l.textContent = (m==='window'?'Ventana grande': m==='sidepanel'?'Panel lateral':'Integrado (overlay)');
  }

  // hydrate current value
  chrome.storage.local.get({openMode:'sidepanel'}, v=> setModeLabel(v.openMode));

  async function setOpenMode(mode){
    await chrome.runtime.sendMessage({type:'ARK_SET_OPEN_MODE', mode});
    setModeLabel(mode);
  }
  async function attachToTab(){
    try { await chrome.runtime.sendMessage({type:'ARK_ATTACH_TO_CURRENT_TAB'}); } catch(e){}
  }

  // Bind events (no inline handlers)
  window.addEventListener('DOMContentLoaded', () => {
    const mSide = q('#btnModeSidepanel');
    const mWin  = q('#btnModeWindow');
    const mOvl  = q('#btnModeOverlay');
    const attach= q('#btnAttachToTab');
    if (mSide) mSide.addEventListener('click', ()=>setOpenMode('sidepanel'));
    if (mWin)  mWin.addEventListener('click', ()=>setOpenMode('window'));
    if (mOvl)  mOvl.addEventListener('click', ()=>setOpenMode('overlay'));
    if (attach) attach.addEventListener('click', attachToTab);
  });
})();