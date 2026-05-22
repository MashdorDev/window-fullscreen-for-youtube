(() => {
  'use strict';

  const BUTTON_ID = 'wfs-button';
  const ACTIVE_CLASS = 'wfs-active';

  const ICON_SVG = `
    <svg viewBox="0 0 36 36" width="100%" height="100%">
      <path d="M10 14 L10 10 L14 10 M22 10 L26 10 L26 14 M26 22 L26 26 L22 26 M14 26 L10 26 L10 22"
        stroke="white" stroke-width="2" fill="none" stroke-linecap="square"/>
    </svg>
  `;

  function isAdPlaying() {
    return document.querySelector('.ad-showing') !== null;
  }

  function isActive() {
    return document.documentElement.classList.contains(ACTIVE_CLASS);
  }

  function toggle() {
    document.documentElement.classList.toggle(ACTIVE_CLASS);
  }

  function exit() {
    document.documentElement.classList.remove(ACTIVE_CLASS);
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
    if (fullscreenBtn) {
      controls.insertBefore(btn, fullscreenBtn);
    } else {
      controls.appendChild(btn);
    }
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

    if (e.key === 'F' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Escape' && isActive()) {
      exit();
    }
  });

  window.addEventListener('yt-navigate-finish', injectButton);

  const observer = new MutationObserver(scheduleInject);
  observer.observe(document.body, { childList: true, subtree: true });

  injectButton();
})();
