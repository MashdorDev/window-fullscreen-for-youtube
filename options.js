(() => {
  'use strict';

  const DEFAULTS = {
    hotkey: 'Shift+F',
    autoToggle: false,
    scrollableMode: false,
    stickyChat: true,
    hideMasthead: true,
    hideSidebar: true,
    hideComments: true,
  };

  const CHECKBOX_KEYS = [
    'autoToggle',
    'scrollableMode',
    'stickyChat',
    'hideMasthead',
    'hideSidebar',
    'hideComments',
  ];

  const hotkeyInput = document.getElementById('hotkey');
  const resetBtn = document.getElementById('reset');
  const statusEl = document.getElementById('status');

  function showStatus(msg) {
    statusEl.textContent = msg;
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => { statusEl.textContent = ''; }, 1500);
  }

  function load() {
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      hotkeyInput.value = settings.hotkey || DEFAULTS.hotkey;
      for (const key of CHECKBOX_KEYS) {
        const el = document.getElementById(key);
        if (el) el.checked = !!settings[key];
      }
    });
  }

  function save(partial) {
    chrome.storage.sync.set(partial, () => showStatus('Saved'));
  }

  hotkeyInput.addEventListener('change', () => {
    const v = hotkeyInput.value.trim() || DEFAULTS.hotkey;
    hotkeyInput.value = v;
    save({ hotkey: v });
  });

  for (const key of CHECKBOX_KEYS) {
    const el = document.getElementById(key);
    if (!el) continue;
    el.addEventListener('change', () => save({ [key]: el.checked }));
  }

  resetBtn.addEventListener('click', () => {
    chrome.storage.sync.set(DEFAULTS, () => {
      load();
      showStatus('Reset to defaults');
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const k in changes) {
      if (k === 'hotkey') {
        hotkeyInput.value = changes.hotkey.newValue || DEFAULTS.hotkey;
      } else if (CHECKBOX_KEYS.includes(k)) {
        const el = document.getElementById(k);
        if (el) el.checked = !!changes[k].newValue;
      }
    }
  });

  load();
})();
