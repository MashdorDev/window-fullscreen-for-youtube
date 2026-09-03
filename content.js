(() => {
  'use strict';

  const BUTTON_ID = 'wfs-button';
  const CHAT_BUTTON_ID = 'wfs-chat-button';
  const RESIZE_HANDLE_ID = 'wfs-chat-resize';
  const OVERLAY_ID = 'wfs-overlay';
  const ACTIVE_CLASS = 'wfs-active';
  const SCROLLABLE_CLASS = 'wfs-scrollable';
  const CHAT_VISIBLE_CLASS = 'wfs-chat-visible';
  const STICKY_CHAT_CLASS = 'wfs-sticky-chat';
  const HIDE_MASTHEAD_CLASS = 'wfs-hide-masthead';
  const HIDE_SIDEBAR_CLASS = 'wfs-hide-sidebar';
  const HIDE_COMMENTS_CLASS = 'wfs-hide-comments';
  const MENU_ITEM_CLASS = 'wfs-menuitem';
  const MENU_ROW_CLASS = 'wfs-menurow';
  const PANEL_CLASS = 'wfs-panel';
  const PANEL_TITLE = 'Window fullscreen';
  const MIN_CHAT_WIDTH = 280;
  const LOG = (...a) => console.log('[WFS]', ...a);
  const CRUMB = (category, message, data) => {
    if (window.wfsCrumb) window.wfsCrumb(category, message, data);
  };

  // Every YouTube selector the extension leans on, in one place so the health
  // check below and the code that uses them cannot drift apart.
  const SEL = {
    rightControls: '.ytp-right-controls',
    fullscreenButton: '.ytp-fullscreen-button',
    sizeButton: '.ytp-size-button',
    settingsPanel: '.ytp-settings-menu .ytp-panel',
    chromeBottom: '.ytp-chrome-bottom',
    player: '#movie_player',
    watchContainer: 'ytd-watch-flexy, ytd-watch-grid, ytd-watch, #player',
    video: 'video.html5-main-video',
  };

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

  function parseSvg(str) {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return document.importNode(doc.body.firstElementChild, true);
  }

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
    return document.querySelector(SEL.watchContainer);
  }

  function isInTheaterMode() {
    const c = getWatchContainer();
    return c ? c.hasAttribute('theater') : false;
  }

  function clickTheaterButton() {
    const btn = document.querySelector(SEL.sizeButton);
    if (btn) btn.click();
  }

  function ensureTheaterMode(retries) {
    if (retries === undefined) retries = 15;
    if (retries <= 0) {
      // The size button is still there but clicking it no longer produces
      // theater mode, which breaks the whole feature just as thoroughly.
      LOG('health check failed: theaterModeFailed');
      CRUMB('youtube', 'theater mode never engaged');
      if (window.wfsReport) window.wfsReport(['theaterModeFailed']);
      return;
    }
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
    CRUMB('settings', key, { value: value });
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

  // content.css animates the player width over 0.18s. YouTube sizes the video
  // from the player box at the moment it handles the resize, so a single event
  // fired mid-transition leaves the video at its old width with dead space
  // beside it. Ping again once the layout has settled.
  const LAYOUT_SETTLE_MS = 250;
  let settleTimer = null;

  function notifyResize() {
    window.dispatchEvent(new Event('resize'));
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => window.dispatchEvent(new Event('resize')), LAYOUT_SETTLE_MS);
  }

  function isActive() {
    return document.documentElement.classList.contains(ACTIVE_CLASS);
  }

  function setActive(on) {
    CRUMB('ui', on ? 'enter windowed fullscreen' : 'exit windowed fullscreen', {
      theater: isInTheaterMode(),
      chat: isChatAvailable(),
    });
    if (on) {
      initialTheaterState = isInTheaterMode();
      if (!initialTheaterState) ensureTheaterMode();
      window.scrollTo(0, 0);
    } else if (initialTheaterState === false && isInTheaterMode()) {
      clickTheaterButton();
      initialTheaterState = null;
    }
    document.documentElement.classList.toggle(ACTIVE_CLASS, on);
    if (!on) revealMasthead(false);
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
    btn.appendChild(parseSvg(ICON_SVG));
    btn.addEventListener('click', toggle);
    return btn;
  }

  // A scheduled stream that has not started yet, and one that has ended, both
  // sit on an offline slate: the player is there, chat is already running, and
  // YouTube takes the control bar down to display:none because there is nothing
  // to control. Buttons injected into it are present but zero-sized, which is
  // the whole feature gone right when someone wants to set the window up before
  // the stream begins. So the controls move onto the player itself for as long
  // as the bar is unusable, and move back into it the moment YouTube restores
  // it. Read the computed display rather than the player's state classes: the
  // bar is also hidden on the ended slate and on whatever slate comes next.
  function isControlBarHidden() {
    const bar = document.querySelector(SEL.chromeBottom);
    return !!bar && getComputedStyle(bar).display === 'none';
  }

  function controlHost() {
    if (isControlBarHidden()) {
      const player = document.querySelector(SEL.player);
      if (!player) return null;
      let overlay = document.getElementById(OVERLAY_ID);
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
      }
      if (overlay.parentNode !== player) player.appendChild(overlay);
      return overlay;
    }
    // Dropping the overlay takes whatever is still inside it with it; the
    // injectors below build fresh buttons in the bar on this same pass.
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    return document.querySelector(SEL.rightControls);
  }

  // The overlay has no fullscreen button to sit next to, so the same anchors
  // place both hosts: unmatched means "put it at the end", and the chat button
  // anchors on the window-fullscreen button, which does exist in either.
  function placeControl(host, el, anchorSelector) {
    const anchor = host.querySelector(anchorSelector);
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor);
    else host.appendChild(el);
  }

  function injectButton(host) {
    if (isAdPlaying()) return;
    if (!host) return;
    const existing = document.getElementById(BUTTON_ID);
    if (existing && host.contains(existing)) return;
    placeControl(host, existing || createButton(), SEL.fullscreenButton);
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
    CRUMB('ui', 'toggle chat', { collapsed: chat.hasAttribute('collapsed') });
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
    btn.appendChild(parseSvg(CHAT_ICON_SVG));
    btn.addEventListener('click', toggleChat);
    return btn;
  }

  function injectChatButton(host) {
    const existing = document.getElementById(CHAT_BUTTON_ID);
    if (!isChatAvailable()) {
      if (existing) existing.remove();
      return;
    }
    if (isAdPlaying()) return;
    if (!host) return;
    if (existing && host.contains(existing)) return;
    placeControl(host, existing || createChatButton(), '#' + BUTTON_ID);
  }

  function isChatVisible() {
    if (!isActive()) return false;
    const chat = getChatElement();
    if (!chat || chat.hasAttribute('collapsed')) return false;
    // Closing chat sets `collapsed` on most layouts but not all of them (chat
    // replay on a finished stream just hides the frame), and nothing in
    // content.css touches `display` on the frame, so this cannot latch on our
    // own styles the way a width or height check would.
    return getComputedStyle(chat).display !== 'none';
  }

  let chatWasVisible = null;
  function updateChatVisibilityClass() {
    const html = document.documentElement;
    const visible = isChatVisible();
    html.classList.toggle(CHAT_VISIBLE_CLASS, visible);
    if (visible === chatWasVisible) return;
    chatWasVisible = visible;
    // The player box changes width here; without this the video keeps the size
    // it had while chat was open and the old chat column stays black.
    applyNonStickyChatLayout();
    if (isActive()) notifyResize();
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
      // Reopening the gear should land on YouTube's menu, not wherever we left off.
      if (!open && !adjustingPopup) closePanel();
    };
    popupObserver = new MutationObserver(update);
    popupObserver._target = popup;
    popupObserver.observe(popup, { attributes: true, attributeFilter: ['style', 'class'] });
    update();
  }

  // The bar going up and down is a class flip on the player, and the page-wide
  // observer below only watches childList, so nothing else would notice a
  // stream leaving its slate and the controls would stay stranded on the player.
  let playerStateObserver = null;
  function watchPlayerState() {
    const player = document.querySelector(SEL.player);
    if (!player) {
      if (playerStateObserver) {
        playerStateObserver.disconnect();
        playerStateObserver = null;
      }
      return;
    }
    if (playerStateObserver && playerStateObserver._target === player) return;
    if (playerStateObserver) playerStateObserver.disconnect();
    playerStateObserver = new MutationObserver(scheduleWork);
    playerStateObserver._target = player;
    playerStateObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
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
        CRUMB('youtube', 'theater mode dropped, exiting');
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
    chatAttrObserver.observe(chat, {
      attributes: true,
      attributeFilter: ['collapsed', 'hide-chat-frame', 'hidden', 'style'],
    });
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

  // YouTube sizes the settings panel to its widest item, and every submenu you
  // open from it inherits that width. Keep these no wider than YouTube's own
  // longest label ("Playback speed") or the whole menu grows, badly so on a
  // large player where the panel font scales up with it. The unabbreviated
  // names live in the options page.
  const MENU_ITEMS = [
    {
      label: 'Auto windowed',
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
    if (iconSvg) iconEl.appendChild(parseSvg(iconSvg));

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

  // YouTube swaps panels through one container rather than keeping them side by
  // side, so ".ytp-panel-menu" resolves to whichever panel is showing: the
  // Quality list as readily as the top level. Appending to that blindly puts
  // extension rows at the bottom of Quality and Sleep timer. A submenu carries a
  // back-button header; the top level does not. Our own panel has one too, which
  // is what keeps this from finding itself.
  function getSettingsPanelMenu() {
    for (const panel of document.querySelectorAll(SEL.settingsPanel)) {
      if (panel.querySelector('.ytp-panel-header')) continue;
      const menu = panel.querySelector('.ytp-panel-menu');
      if (menu) return menu;
    }
    return null;
  }

  // One row in YouTube's menu instead of three. Three rows nearly doubled the
  // height of the top level and forced a scrollbar, and the widest of them set
  // the width of the whole menu including every submenu opened from it.
  function createMenuRow() {
    const row = document.createElement('div');
    row.className = 'ytp-menuitem ' + MENU_ROW_CLASS;
    row.setAttribute('role', 'menuitem');
    row.setAttribute('aria-haspopup', 'true');
    row.tabIndex = 0;

    const icon = document.createElement('div');
    icon.className = 'ytp-menuitem-icon';
    icon.appendChild(parseSvg(ICON_SVG));

    const label = document.createElement('div');
    label.className = 'ytp-menuitem-label';
    label.textContent = PANEL_TITLE;

    // YouTube draws the chevron from aria-haspopup; the value slot stays empty
    // because no single one of three toggles is "the" value of this row.
    const content = document.createElement('div');
    content.className = 'ytp-menuitem-content';

    row.append(icon, label, content);

    const open = (e) => {
      e.stopPropagation();
      openPanel();
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(e);
      }
    });
    return row;
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.className = 'ytp-panel ' + PANEL_CLASS;

    const header = document.createElement('div');
    header.className = 'ytp-panel-header';
    const backWrap = document.createElement('div');
    backWrap.className = 'ytp-panel-back-button-container';
    const back = document.createElement('button');
    back.className = 'ytp-button ytp-panel-back-button';
    back.setAttribute('aria-label', 'Back to previous menu');
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      closePanel();
    });
    backWrap.appendChild(back);
    const title = document.createElement('span');
    title.className = 'ytp-panel-title';
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '2');
    title.textContent = PANEL_TITLE;
    header.append(backWrap, title);

    const menu = document.createElement('div');
    menu.className = 'ytp-panel-menu';
    for (const cfg of MENU_ITEMS) {
      menu.appendChild(createMenuItem(cfg.label, cfg.key, cfg.icon));
    }

    panel.append(header, menu);
    panel.style.display = 'none';
    return panel;
  }

  // The popup's size is inline on .ytp-settings-menu and YouTube's controller
  // only maintains it for its own panels, so ours has to measure and restore.
  // Writing to that style attribute is also what the popup observer watches, so
  // `adjustingPopup` keeps it from deciding the menu closed mid-measurement.
  let savedPopupSize = null;
  let adjustingPopup = false;
  // Wide enough that no row wraps while being measured. Measuring inside a
  // popup that is already at its cramped width returns the wrapped height and
  // a width that bakes the wrapping in.
  const MEASURE_WIDTH = 600;

  // How wide the panel has to be for no row to wrap. YouTube's own CSS pins
  // .ytp-panel to the popup width, so neither `max-content` nor a roomy popup
  // makes the panel report what it actually needs; the labels have to be
  // measured directly, the way YouTube measures its own.
  function requiredPanelWidth(panel) {
    const rows = panel.querySelectorAll('.' + MENU_ITEM_CLASS);
    if (!rows.length) return 0;

    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;top:-9999px;';
    document.body.appendChild(probe);

    let widestLabel = 0;
    let chrome = 0;
    for (const row of rows) {
      const label = row.querySelector('.ytp-menuitem-label');
      if (!label) continue;
      probe.style.font = getComputedStyle(label).font;
      probe.textContent = label.textContent;
      widestLabel = Math.max(widestLabel, probe.getBoundingClientRect().width);
      // Everything in the row that is not the label: icon and toggle columns.
      chrome = Math.max(chrome, row.getBoundingClientRect().width - label.getBoundingClientRect().width);
    }
    probe.remove();

    const rowWidth = rows[0].getBoundingClientRect().width;
    const panelPadding = Math.max(0, panel.getBoundingClientRect().width - rowWidth);
    return Math.ceil(widestLabel + chrome + panelPadding);
  }

  function getPopup() {
    return document.querySelector('.ytp-settings-menu');
  }

  function openPanel() {
    const popup = getPopup();
    const topMenu = getSettingsPanelMenu();
    const topPanel = topMenu && topMenu.closest('.ytp-panel');
    const content = popup && popup.querySelector('.ytp-popup-content');
    if (!popup || !topPanel || !content) return;

    let panel = content.querySelector('.' + PANEL_CLASS);
    if (!panel) {
      panel = createPanel();
      content.appendChild(panel);
    }

    adjustingPopup = true;
    savedPopupSize = { width: popup.style.width, height: popup.style.height };
    topPanel.style.display = 'none';
    panel.style.display = '';

    // Lay it out somewhere roomy first so the row chrome measures at its real
    // size, then pin width and height: YouTube transitions both, and neither
    // animates from `auto`.
    popup.style.width = MEASURE_WIDTH + 'px';
    popup.style.height = 'auto';
    const width = requiredPanelWidth(panel);
    // A zero measurement means the popup was torn down underneath us. Leaving
    // 0px inline would make it invisible for good, so keep what YouTube had.
    if (width > 0) {
      popup.style.width = width + 'px';
      popup.style.height = Math.ceil(panel.getBoundingClientRect().height) + 'px';
    } else {
      popup.style.width = savedPopupSize.width;
      popup.style.height = savedPopupSize.height;
    }
    adjustingPopup = false;
    syncMenuItemStates();
    const first = panel.querySelector('.' + MENU_ITEM_CLASS);
    if (first) first.focus();
  }

  function closePanel() {
    const popup = getPopup();
    const panel = popup && popup.querySelector('.' + PANEL_CLASS);
    if (!popup || !panel || panel.style.display === 'none') return;

    panel.style.display = 'none';
    const topMenu = getSettingsPanelMenu();
    const topPanel = topMenu && topMenu.closest('.ytp-panel');
    if (topPanel) topPanel.style.removeProperty('display');
    if (!topPanel) {
      // Nothing left to go back to; the menu was rebuilt underneath us.
      panel.remove();
    }
    if (savedPopupSize) {
      popup.style.width = savedPopupSize.width;
      popup.style.height = savedPopupSize.height;
      savedPopupSize = null;
    }
    const row = topMenu && topMenu.querySelector('.' + MENU_ROW_CLASS);
    if (row) row.focus();
  }

  // YouTube rebuilds the top-level panel every time the menu opens, so a panel
  // of ours left showing belongs to a menu that no longer exists. Relying on the
  // popup observer alone to notice the close was not enough: reopening the gear
  // could land straight back inside our panel.
  function discardStalePanel() {
    document.querySelectorAll('.' + PANEL_CLASS).forEach((el) => el.remove());
    savedPopupSize = null;
  }

  // Our panel hides YouTube's top-level one to take its place, so if the popup
  // goes away while ours is showing, the top level stays hidden and the next
  // open lands inside our panel. Watching the popup for the close was not
  // enough on its own, so the invariant is re-asserted every pass instead:
  // popup not on screen means our panel is not open.
  function enforcePanelState() {
    const popup = getPopup();
    if (!popup) return;
    const visible = getComputedStyle(popup).display !== 'none' && popup.offsetParent !== null;
    if (!visible && !adjustingPopup) closePanel();
  }

  function injectMenuItems() {
    const panel = getSettingsPanelMenu();
    // A row that landed anywhere else rides along inside whichever submenu is
    // open, which is exactly the bug this replaced.
    document.querySelectorAll('.' + MENU_ROW_CLASS).forEach((el) => {
      if (el.parentElement !== panel) el.remove();
    });
    if (!panel || panel.querySelector('.' + MENU_ROW_CLASS)) return;
    discardStalePanel();
    panel.appendChild(createMenuRow());
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
    // Shorts play through the same <video>, and so does the home page's preview
    // on a hovered thumbnail, so a new source is not on its own a new video to
    // watch. Without this the extension turned itself on over the Shorts feed
    // and then spent fifteen clicks failing to put a shorts player into theater
    // mode, which is what most of the theaterModeFailed reports were.
    if (!isWatchPage()) return;
    const video = document.querySelector(SEL.video);
    if (!video || !video.src) return;
    if (video.src === lastAutoSrc) return;
    lastAutoSrc = video.src;
    if (!isActive()) {
      CRUMB('ui', 'auto-enter on new video');
      setActive(true);
    }
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

  // YouTube renaming a class does not throw. Every lookup above is guarded and
  // simply returns early, so the extension goes quiet instead of breaking
  // loudly. This is the only thing that notices.
  const HEALTH_DELAY_MS = 15000;
  const HEALTH_MAX_DEFERRALS = 4;
  const HEALTH_SELECTORS = ['rightControls', 'fullscreenButton', 'sizeButton', 'watchContainer'];
  let healthTimer = null;
  let healthDeferrals = 0;

  function scheduleHealthCheck() {
    clearTimeout(healthTimer);
    healthDeferrals = 0;
    healthTimer = setTimeout(runHealthCheck, HEALTH_DELAY_MS);
  }

  function runHealthCheck() {
    // An ad swaps out the control bar and a background tab may never lay the
    // player out at all. Neither means YouTube changed, so wait instead.
    const settled = isWatchPage() && !isAdPlaying() &&
      document.visibilityState === 'visible' &&
      !!document.querySelector(SEL.video);
    if (!settled) {
      if (healthDeferrals++ < HEALTH_MAX_DEFERRALS) {
        healthTimer = setTimeout(runHealthCheck, HEALTH_DELAY_MS);
      }
      return;
    }

    const broken = HEALTH_SELECTORS.filter((name) => !document.querySelector(SEL[name]));

    const btn = document.getElementById(BUTTON_ID);
    if (!btn) broken.push('buttonNotInjected');
    else if (btn.getBoundingClientRect().width === 0) broken.push('buttonInvisible');

    // Only checkable once YouTube has actually built the settings panel, which
    // it does lazily, and only while the top level is the panel on screen.
    // Absent panel means "unknown", not "broken".
    const panel = getSettingsPanelMenu();
    if (panel && !panel.querySelector('.' + MENU_ROW_CLASS)) broken.push('menuItemsNotInjected');

    if (!broken.length) return;
    LOG('health check failed:', broken.join(', '));
    CRUMB('health', 'check failed', { broken: broken.join(',') });
    if (window.wfsReport) window.wfsReport(broken);
  }

  let pending = false;
  function scheduleWork() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const host = controlHost();
      injectButton(host);
      injectChatButton(host);
      injectResizeHandle();
      injectMenuItems();
      enforcePanelState();
      watchChatState();
      watchTheaterState();
      watchPlayerState();
      watchPopupState();
      updateChatVisibilityClass();
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

  const TOP_HOVER_THRESHOLD = 30;
  const MASTHEAD_REVEAL_CLASS = 'wfs-masthead-revealed';
  // Reaching the top strip reveals the masthead, and moving back down hides it.
  // The pointer can also leave through the top of the window into the browser's
  // own toolbar, and mousemove stops firing there, so that exit needs a timer:
  // brushing past the top edge should not pin the bar open for the rest of the
  // video. Long enough that a quick detour to the tab strip and back does not
  // make it flicker.
  const MASTHEAD_HIDE_DELAY_MS = 1200;
  let mastheadHideTimer = null;

  function revealMasthead(on) {
    clearTimeout(mastheadHideTimer);
    document.documentElement.classList.toggle(MASTHEAD_REVEAL_CLASS, on);
  }

  document.addEventListener('mousemove', (e) => {
    if (!isActive() || !settings.hideMasthead) return;
    const html = document.documentElement;
    const revealed = html.classList.contains(MASTHEAD_REVEAL_CLASS);
    if (e.clientY <= TOP_HOVER_THRESHOLD) {
      if (!revealed) revealMasthead(true);
      else clearTimeout(mastheadHideTimer);
    } else if (revealed) {
      const masthead = document.querySelector('#masthead-container');
      const bottom = (masthead && masthead.offsetHeight) || 56;
      if (e.clientY > bottom + 20) revealMasthead(false);
      else clearTimeout(mastheadHideTimer);
    }
  });

  // Pointer left the page: out the top into the browser UI, or off the window
  // entirely. Nothing else will tell us to put the bar away. Focus stays
  // respected either way, since content.css keeps the masthead up on
  // :focus-within for as long as the search box holds the caret.
  document.documentElement.addEventListener('mouseleave', () => {
    if (!isActive() || !settings.hideMasthead) return;
    if (!document.documentElement.classList.contains(MASTHEAD_REVEAL_CLASS)) return;
    clearTimeout(mastheadHideTimer);
    mastheadHideTimer = setTimeout(() => revealMasthead(false), MASTHEAD_HIDE_DELAY_MS);
  });

  function isWatchPage() {
    const p = location.pathname;
    return p.includes('/watch') || p.includes('/live/') || p.includes('/clip/');
  }

  window.addEventListener('yt-navigate-finish', () => {
    // Deliberately no URL — which video is being watched is none of our business.
    CRUMB('navigation', 'yt-navigate-finish', { watchPage: isWatchPage() });
    lastAutoSrc = null;
    if (isWatchPage()) scheduleHealthCheck();
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
    if (isWatchPage()) scheduleHealthCheck();
  });
})();
