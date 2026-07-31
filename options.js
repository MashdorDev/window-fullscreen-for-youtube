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
    healthReporting: false,
  };

  const DATA_PERMISSION = 'technicalAndInteraction';

  // healthReporting is deliberately absent — it needs a permission round-trip,
  // so it can't ride the plain save-on-change path below.
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
  const healthReportingEl = document.getElementById('healthReporting');

  function showStatus(msg) {
    statusEl.textContent = msg;
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => { statusEl.textContent = ''; }, 1500);
  }

  // Firefox lets the user revoke the data-collection grant in about:addons. If
  // that happened, the stored flag is stale and the checkbox must not claim
  // reporting is on.
  async function hasDataConsent() {
    try {
      const perms = await chrome.permissions.getAll();
      return !perms.data_collection || perms.data_collection.includes(DATA_PERMISSION);
    } catch (e) {
      return true;
    }
  }

  function load() {
    chrome.storage.sync.get(DEFAULTS, async (settings) => {
      hotkeyInput.value = settings.hotkey || DEFAULTS.hotkey;
      for (const key of CHECKBOX_KEYS) {
        const el = document.getElementById(key);
        if (el) el.checked = !!settings[key];
      }
      healthReportingEl.checked = !!settings.healthReporting && (await hasDataConsent());
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

  healthReportingEl.addEventListener('change', async () => {
    const on = healthReportingEl.checked;
    // Firefox shows its own consent prompt for technical data. Chrome doesn't
    // know the key and rejects, which is fine: there the checkbox is consent.
    try {
      const changed = on
        ? await chrome.permissions.request({ data_collection: [DATA_PERMISSION] })
        : await chrome.permissions.remove({ data_collection: [DATA_PERMISSION] });
      if (on && !changed) {
        healthReportingEl.checked = false;
        showStatus('Permission declined');
        return;
      }
    } catch (e) {
      // Browser has no data-collection permissions; fall through to the toggle.
    }
    save({ healthReporting: on });
  });

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
      } else if (k === 'healthReporting') {
        healthReportingEl.checked = !!changes.healthReporting.newValue;
      } else if (CHECKBOX_KEYS.includes(k)) {
        const el = document.getElementById(k);
        if (el) el.checked = !!changes[k].newValue;
      }
    }
  });

  load();
})();
