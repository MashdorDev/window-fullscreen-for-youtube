(() => {
  'use strict';

  const BUTTON_ID = 'wfs-button';
  const ACTIVE_CLASS = 'wfs-active';
  const LOG = (...args) => console.log('[WFS]', ...args);
  LOG('content script loaded at', location.href);

  const ICON_SVG = '<svg fill="none" height="24" viewBox="0 0 24 24" width="24"><path class="ytp-svg-fill" fill="#fff" fill-rule="evenodd" d="M 3,4 L 21,4 L 21,20 L 3,20 Z M 5,6 L 5,18 L 19,18 L 19,6 Z"/><rect class="ytp-svg-fill" fill="#fff" x="7" y="8" width="10" height="8"/></svg>';

  function isAdPlaying() {
    return document.querySelector('.ad-showing') !== null;
  }

  function isActive() {
    return document.documentElement.classList.contains(ACTIVE_CLASS);
  }

  function notifyResize() {
    window.dispatchEvent(new Event('resize'));
  }

  function toggle() {
    document.documentElement.classList.toggle(ACTIVE_CLASS);
    notifyResize();
  }

  function exit() {
    document.documentElement.classList.remove(ACTIVE_CLASS);
    notifyResize();
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = 'ytp-button wfs-button';
    btn.title = 'Window Fullscreen (Shift+F)';
    btn.setAttribute('aria-label', 'Window Fullscreen');
    btn.innerHTML = ICON_SVG;
    btn.addEventListener('click', toggle);
    return btn;
  }

  function injectButton() {
    if (isAdPlaying()) return;
    const controls = document.querySelector('.ytp-right-controls');
    if (!controls) return;
    if (controls.querySelector('#' + BUTTON_ID)) return;

    const fullscreenBtn = controls.querySelector('.ytp-fullscreen-button');
    const btn = createButton();

    if (fullscreenBtn && fullscreenBtn.parentNode) {
      fullscreenBtn.parentNode.insertBefore(btn, fullscreenBtn);
    } else {
      controls.appendChild(btn);
    }
    LOG('button injected', { hasFullscreenBtn: !!fullscreenBtn });
  }

  let injectPending = false;
  function scheduleInject() {
    if (injectPending) return;
    injectPending = true;
    requestAnimationFrame(() => {
      injectPending = false;
      injectButton();
    });
  }

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('input, textarea, [contenteditable="true"]')) return;

    if ((e.key === 'F' || e.key === 'f') && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      LOG('hotkey Shift+F → toggle');
      toggle();
    } else if (e.key === 'Escape' && isActive()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      exit();
    }
  }, true);

  window.addEventListener('yt-navigate-finish', injectButton);

  const observer = new MutationObserver(scheduleInject);
  observer.observe(document.body, { childList: true, subtree: true });

  injectButton();
})();
