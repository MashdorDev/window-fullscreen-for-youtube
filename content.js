(() => {
  'use strict';

  const BUTTON_ID = 'wfs-button';
  const CHAT_BUTTON_ID = 'wfs-chat-button';
  const RESIZE_HANDLE_ID = 'wfs-chat-resize';
  const ACTIVE_CLASS = 'wfs-active';
  const SCROLLABLE_CLASS = 'wfs-scrollable';
  const CHAT_AVAILABLE_CLASS = 'wfs-chat-available';
  const CHAT_VISIBLE_CLASS = 'wfs-chat-visible';
  const STICKY_CHAT_CLASS = 'wfs-sticky-chat';
  const HIDE_MASTHEAD_CLASS = 'wfs-hide-masthead';
  const HIDE_SIDEBAR_CLASS = 'wfs-hide-sidebar';
  const HIDE_COMMENTS_CLASS = 'wfs-hide-comments';
  const MENU_ITEM_CLASS = 'wfs-menuitem';
  const MIN_CHAT_WIDTH = 280;
  const LOG = (...a) => console.log('[WFS]', ...a);

  const DEFAULTS = {
    hotkey: 'Shift+F',
    autoToggle: false,
    scrollableMode: false,
    stickyChat: true,
    hideMasthead: true,
    hideSidebar: true,
    hideComments: true,
    chatWidth: 400,
  };

  let initialTheaterState = null;

  let settings = { ...DEFAULTS };

  const ICON_SVG = '<svg fill="none" height="24" viewBox="0 0 24 24" width="24"><path class="ytp-svg-fill" fill="#fff" fill-rule="evenodd" d="M 3,4 L 21,4 L 21,20 L 3,20 Z M 5,6 L 5,18 L 19,18 L 19,6 Z"/><rect class="ytp-svg-fill" fill="#fff" x="7" y="8" width="10" height="8"/></svg>';

  const CHAT_ICON_SVG = '<svg fill="none" height="24" viewBox="0 0 24 24" width="24"><path class="ytp-svg-fill" fill="#fff" d="M 3,5 L 21,5 L 21,17 L 13,17 L 9,21 L 9,17 L 3,17 Z"/></svg>';

  function applySettings() {
    const html = document.documentElement;
    html.classList.toggle(SCROLLABLE_CLASS, settings.scrollableMode);
    html.classList.toggle(STICKY_CHAT_CLASS, settings.stickyChat);
    html.classList.toggle(HIDE_MASTHEAD_CLASS, settings.hideMasthead);
    html.classList.toggle(HIDE_SIDEBAR_CLASS, settings.hideSidebar);
    html.classList.toggle(HIDE_COMMENTS_CLASS, settings.hideComments);
    html.style.setProperty('--wfs-chat-width', (settings.chatWidth || 400) + 'px');
    const btn = document.getElementById(BUTTON_ID);
    if (btn) btn.title = 'Window Fullscreen (' + settings.hotkey + ')';
    syncMenuItemStates();
    updateChatVisibilityClass();
    applyNonStickyChatLayout();
    if (isActive()) notifyResize();
  }

  function getWatchContainer() {
    return document.querySelector('ytd-watch-flexy') ||
           document.querySelector('ytd-watch-grid') ||
           document.querySelector('ytd-watch') ||
           document.querySelector('#player');
  }

  function isInTheaterMode() {
    const c = getWatchContainer();
    return c ? c.hasAttribute('theater') : false;
  }

  function clickTheaterButton() {
    const btn = document.querySelector('.ytp-size-button');
    if (btn) btn.click();
  }

  function ensureTheaterMode(retries) {
    if (retries === undefined) retries = 15;
    if (retries <= 0) return;
    if (isInTheaterMode()) return;
    clickTheaterButton();
    setTimeout(() => {
      if (!isInTheaterMode()) ensureTheaterMode(retries - 1);
    }, 300);
  }

  function loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(DEFAULTS, (loaded) => {
          settings = { ...DEFAULTS, ...loaded };
          applySettings();
          resolve();
        });
      } catch (e) {
        LOG('storage unavailable, using defaults', e);
        applySettings();
        resolve();
      }
    });
  }

  function saveSetting(key, value) {
    settings[key] = value;
    try {
      chrome.storage.sync.set({ [key]: value });
    } catch (e) {
      LOG('storage save failed', e);
    }
    applySettings();
  }

  try {
    chrome.storage.onChanged.addListener((changes) => {
      let touched = false;
      for (const k in changes) {
        if (k in DEFAULTS) {
          settings[k] = changes[k].newValue;
          touched = true;
        }
      }
      if (touched) applySettings();
    });
  } catch (e) {
    LOG('storage listener failed', e);
  }

  function parseHotkey(str) {
    if (!str) return null;
    const parts = str.split('+').map((s) => s.trim()).filter(Boolean);
    const keyRaw = parts.pop();
    if (!keyRaw) return null;
    return {
      key: keyRaw.toLowerCase(),
      shift: parts.some((p) => /^shift$/i.test(p)),
      ctrl: parts.some((p) => /^(ctrl|control)$/i.test(p)),
      alt: parts.some((p) => /^alt$/i.test(p)),
      meta: parts.some((p) => /^(meta|cmd|command)$/i.test(p)),
    };
  }

  function matchesHotkey(e, str) {
    const h = parseHotkey(str);
    if (!h) return false;
    return (
      e.key.toLowerCase() === h.key &&
      e.shiftKey === h.shift &&
      e.ctrlKey === h.ctrl &&
      e.altKey === h.alt &&
      e.metaKey === h.meta
    );
  }

  function notifyResize() {
    window.dispatchEvent(new Event('resize'));
  }

  function isActive() {
    return document.documentElement.classList.contains(ACTIVE_CLASS);
  }

  function setActive(on) {
    if (on) {
      initialTheaterState = isInTheaterMode();
      if (!initialTheaterState) ensureTheaterMode();
      window.scrollTo(0, 0);
    } else if (initialTheaterState === false && isInTheaterMode()) {
      clickTheaterButton();
      initialTheaterState = null;
    }
    document.documentElement.classList.toggle(ACTIVE_CLASS, on);
    applySettings();
    notifyResize();
  }

  function toggle() {
    setActive(!isActive());
  }

  function isAdPlaying() {
    return document.querySelector('.ad-showing') !== null;
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = 'ytp-button wfs-button';
    btn.title = 'Window Fullscreen (' + settings.hotkey + ')';
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
  }

  function getChatElement() {
    return document.querySelector('ytd-live-chat-frame#chat') || document.querySelector('#chat');
  }

  function isChatAvailable() {
    return !!getChatElement();
  }

  function toggleChat() {
    const chat = getChatElement();
    if (!chat) return;
    const nativeBtn =
      chat.querySelector('#show-hide-button button') ||
      chat.querySelector('#show-hide-button [role="button"]') ||
      chat.querySelector('ytd-toggle-button-renderer button') ||
      chat.querySelector('button[aria-label*="chat" i]');
    if (nativeBtn) {
      nativeBtn.click();
    } else if (chat.hasAttribute('collapsed')) {
      chat.removeAttribute('collapsed');
    } else {
      chat.setAttribute('collapsed', '');
    }
  }

  function createChatButton() {
    const btn = document.createElement('button');
    btn.id = CHAT_BUTTON_ID;
    btn.className = 'ytp-button wfs-button';
    btn.title = 'Toggle chat';
    btn.setAttribute('aria-label', 'Toggle chat');
    btn.innerHTML = CHAT_ICON_SVG;
    btn.addEventListener('click', toggleChat);
    return btn;
  }

  function injectChatButton() {
    const existing = document.getElementById(CHAT_BUTTON_ID);
    if (!isChatAvailable()) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    if (isAdPlaying()) return;
    const controls = document.querySelector('.ytp-right-controls');
    if (!controls) return;
    const wfsBtn = controls.querySelector('#' + BUTTON_ID);
    const anchor = wfsBtn || controls.querySelector('.ytp-fullscreen-button');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(createChatButton(), anchor);
    } else {
      controls.appendChild(createChatButton());
    }
  }

  function isChatVisible() {
    const chat = getChatElement();
    return !!(chat && !chat.hasAttribute('collapsed') && isActive());
  }

  function updateChatVisibilityClass() {
    const html = document.documentElement;
    html.classList.toggle(CHAT_AVAILABLE_CLASS, isChatAvailable());
    html.classList.toggle(CHAT_VISIBLE_CLASS, isChatVisible());
  }

  let popupObserver = null;
  function watchPopupState() {
    const popup = document.querySelector('.ytp-settings-menu, .ytp-popup');
    if (!popup) return;
    if (popupObserver && popupObserver._target === popup) return;
    if (popupObserver) popupObserver.disconnect();
    const update = () => {
      const open = getComputedStyle(popup).display !== 'none' && popup.offsetParent !== null;
      document.documentElement.classList.toggle('wfs-menu-open', open && isActive());
    };
    popupObserver = new MutationObserver(update);
    popupObserver._target = popup;
    popupObserver.observe(popup, { attributes: true, attributeFilter: ['style', 'class'] });
    update();
  }

  let theaterObserver = null;
  function watchTheaterState() {
    const container = getWatchContainer();
    if (!container) {
      if (theaterObserver) {
        theaterObserver.disconnect();
        theaterObserver = null;
      }
      return;
    }
    if (theaterObserver && theaterObserver._target === container) return;
    if (theaterObserver) theaterObserver.disconnect();
    theaterObserver = new MutationObserver(() => {
      if (isActive() && !isInTheaterMode()) {
        setActive(false);
      }
    });
    theaterObserver._target = container;
    theaterObserver.observe(container, { attributes: true, attributeFilter: ['theater'] });
  }

  let chatAttrObserver = null;
  function watchChatState() {
    const chat = getChatElement();
    if (!chat) {
      if (chatAttrObserver) {
        chatAttrObserver.disconnect();
        chatAttrObserver = null;
      }
      return;
    }
    if (chatAttrObserver && chatAttrObserver._target === chat) return;
    if (chatAttrObserver) chatAttrObserver.disconnect();
    chatAttrObserver = new MutationObserver(updateChatVisibilityClass);
    chatAttrObserver._target = chat;
    chatAttrObserver.observe(chat, { attributes: true, attributeFilter: ['collapsed'] });
    updateChatVisibilityClass();
  }

  function injectResizeHandle() {
    if (document.getElementById(RESIZE_HANDLE_ID)) return;
    const handle = document.createElement('div');
    handle.id = RESIZE_HANDLE_ID;

    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startWidth = settings.chatWidth || 400;
      handle.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    let resizePending = false;
    function scheduleResize() {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        resizePending = false;
        notifyResize();
      });
    }

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = startX - e.clientX;
      let next = startWidth + dx;
      const max = Math.floor(window.innerWidth * 0.7);
      if (next < MIN_CHAT_WIDTH) next = MIN_CHAT_WIDTH;
      if (next > max) next = max;
      document.documentElement.style.setProperty('--wfs-chat-width', next + 'px');
      scheduleResize();
    });

    const finishDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
      document.body.style.userSelect = '';
      const cs = getComputedStyle(document.documentElement).getPropertyValue('--wfs-chat-width');
      const px = parseInt(cs, 10);
      if (px && px !== settings.chatWidth) saveSetting('chatWidth', px);
      notifyResize();
    };
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);

    document.body.appendChild(handle);
  }

  const MENU_ITEMS = [
    {
      label: 'Auto window fullscreen',
      key: 'autoToggle',
      icon: '<svg fill="none" height="24" viewBox="0 0 24 24" width="24"><path class="ytp-svg-fill" fill="#fff" fill-rule="evenodd" d="M 4,5 L 20,5 L 20,19 L 4,19 Z M 6,7 L 6,17 L 18,17 L 18,7 Z"/><path class="ytp-svg-fill" fill="#fff" d="M 10,9 L 15,12 L 10,15 Z"/></svg>',
    },
    {
      label: 'Scrollable mode',
      key: 'scrollableMode',
      icon: '<svg fill="none" height="24" viewBox="0 0 24 24" width="24"><path class="ytp-svg-fill" fill="#fff" d="M 12,3 L 7,8 L 17,8 Z M 7,11 L 17,11 L 17,13 L 7,13 Z M 12,21 L 7,16 L 17,16 Z"/></svg>',
    },
    {
      label: 'Sticky chat',
      key: 'stickyChat',
      icon: '<svg fill="none" height="24" viewBox="0 0 24 24" width="24"><circle class="ytp-svg-fill" fill="#fff" cx="12" cy="7" r="3.5"/><path class="ytp-svg-fill" fill="#fff" d="M 11,10.5 L 13,10.5 L 13,17 L 12,21 L 11,17 Z"/></svg>',
    },
  ];

  function createMenuItem(label, key, iconSvg) {
    const div = document.createElement('div');
    div.className = 'ytp-menuitem ' + MENU_ITEM_CLASS;
    div.setAttribute('role', 'menuitemcheckbox');
    div.setAttribute('aria-checked', settings[key] ? 'true' : 'false');
    div.tabIndex = 0;
    div.dataset.wfsKey = key;

    const iconEl = document.createElement('div');
    iconEl.className = 'ytp-menuitem-icon';
    if (iconSvg) iconEl.innerHTML = iconSvg;

    const labelEl = document.createElement('div');
    labelEl.className = 'ytp-menuitem-label';
    labelEl.textContent = label;

    const contentEl = document.createElement('div');
    contentEl.className = 'ytp-menuitem-content';

    const toggleEl = document.createElement('div');
    toggleEl.className = 'ytp-menuitem-toggle-checkbox';

    contentEl.appendChild(toggleEl);
    div.appendChild(iconEl);
    div.appendChild(labelEl);
    div.appendChild(contentEl);

    const handler = (e) => {
      e.stopPropagation();
      saveSetting(key, !settings[key]);
    };
    div.addEventListener('click', handler);
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handler(e);
    });

    return div;
  }

  function injectMenuItems() {
    const panel = document.querySelector('.ytp-settings-menu .ytp-panel-menu');
    if (!panel) return;
    if (panel.querySelector('.' + MENU_ITEM_CLASS)) return;
    for (const cfg of MENU_ITEMS) {
      panel.appendChild(createMenuItem(cfg.label, cfg.key, cfg.icon));
    }
  }

  function syncMenuItemStates() {
    document.querySelectorAll('.' + MENU_ITEM_CLASS).forEach((el) => {
      const key = el.dataset.wfsKey;
      if (key in settings) {
        el.setAttribute('aria-checked', settings[key] ? 'true' : 'false');
      }
    });
  }

  let lastAutoSrc = null;
  function maybeAutoToggle() {
    if (!settings.autoToggle) return;
    const video = document.querySelector('video.html5-main-video');
    if (!video || !video.src) return;
    if (video.src === lastAutoSrc) return;
    lastAutoSrc = video.src;
    if (!isActive()) setActive(true);
  }

  const NON_STICKY_SECONDARY_PROPS = ['width', 'min-width', 'max-width', 'flex', 'position', 'display'];
  const NON_STICKY_CONTAINER_PROPS = ['width', 'min-width', 'max-width', 'flex', 'overflow'];
  const NON_STICKY_CHAT_PROPS = ['position', 'top', 'right', 'left', 'width', 'height', 'min-height', 'max-height', 'margin', 'z-index'];
  const NON_STICKY_FLEXY_PROPS = ['position'];

  function applyNonStickyChatLayout() {
    const flexy = document.querySelector('ytd-watch-flexy');
    const secondary = document.querySelector('ytd-watch-flexy #secondary');
    const chatContainer = document.querySelector('ytd-watch-flexy #chat-container') ||
                          document.querySelector('ytd-watch-flexy div.chat-container');
    const chat = getChatElement();
    const want = !!(isActive() && isChatVisible() && !settings.stickyChat);
    const width = (settings.chatWidth || 400) + 'px';

    if (flexy) {
      if (want) flexy.style.setProperty('position', 'relative', 'important');
      else NON_STICKY_FLEXY_PROPS.forEach((p) => flexy.style.removeProperty(p));
    }

    if (secondary) {
      if (want) secondary.style.setProperty('display', 'none', 'important');
      else NON_STICKY_SECONDARY_PROPS.forEach((p) => secondary.style.removeProperty(p));
    }

    if (chatContainer) {
      if (want) {
        chatContainer.style.setProperty('width', '0', 'important');
        chatContainer.style.setProperty('min-width', '0', 'important');
        chatContainer.style.setProperty('max-width', '0', 'important');
        chatContainer.style.setProperty('flex', '0 0 0', 'important');
        chatContainer.style.setProperty('overflow', 'visible', 'important');
      } else {
        NON_STICKY_CONTAINER_PROPS.forEach((p) => chatContainer.style.removeProperty(p));
      }
    }

    if (chat) {
      if (want) {
        chat.style.setProperty('position', 'absolute', 'important');
        chat.style.setProperty('top', '0', 'important');
        chat.style.setProperty('right', '0', 'important');
        chat.style.setProperty('left', 'auto', 'important');
        chat.style.setProperty('width', 'var(--wfs-chat-width, 400px)', 'important');
        chat.style.setProperty('height', '100vh', 'important');
        chat.style.setProperty('max-height', '100vh', 'important');
        chat.style.setProperty('margin', '0', 'important');
        chat.style.setProperty('z-index', '800', 'important');
      } else {
        NON_STICKY_CHAT_PROPS.forEach((p) => chat.style.removeProperty(p));
      }
    }
  }

  let pending = false;
  function scheduleWork() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      injectButton();
      injectChatButton();
      injectResizeHandle();
      injectMenuItems();
      watchChatState();
      watchTheaterState();
      watchPopupState();
      applyNonStickyChatLayout();
      maybeAutoToggle();
    });
  }

  document.addEventListener(
    'keydown',
    (e) => {
      const t = e.target;
      if (t && t.matches && t.matches('input, textarea, [contenteditable="true"]')) return;
      if (matchesHotkey(e, settings.hotkey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggle();
      } else if (e.key === 'Escape' && isActive()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setActive(false);
      }
    },
    true
  );

  function isWatchPage() {
    const p = location.pathname;
    return p.includes('/watch') || p.includes('/live/') || p.includes('/clip/');
  }

  window.addEventListener('yt-navigate-finish', () => {
    lastAutoSrc = null;
    if (!isWatchPage() && isActive()) {
      setActive(false);
    }
    scheduleWork();
  });

  new MutationObserver(scheduleWork).observe(document.body, {
    childList: true,
    subtree: true,
  });

  loadSettings().then(() => {
    LOG('settings loaded', settings);
    scheduleWork();
  });
})();
