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

  const hotkeyBtn = document.getElementById('hotkey');
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
      renderHotkey(settings.hotkey || DEFAULTS.hotkey);
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

  // --- Hotkey recorder ----------------------------------------------------
  //
  // Read back, not typed: the binding has to survive content.js's matchesHotkey,
  // and a field people type into invites "Ctrl-Shift-F", "control+f" and other
  // spellings that parse to nothing and fail silently on the page.

  // Held down while choosing, so they are never the binding themselves.
  const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta', 'AltGraph'];
  // Tab has to keep moving focus for anyone driving this page by keyboard, and
  // Space cannot round-trip: content.js splits the stored string on '+' and
  // drops empty parts, so ' ' would come back as no key at all.
  const RESERVED_KEYS = { Tab: 'Tab', ' ': 'Space' };

  let hotkey = DEFAULTS.hotkey;
  let recording = false;

  function renderHotkey(value) {
    hotkey = value;
    hotkeyBtn.textContent = value;
    hotkeyBtn.setAttribute('aria-label', 'Toggle hotkey, ' + value + '. Activate, then press a new combination.');
  }

  function stopRecording() {
    recording = false;
    hotkeyBtn.classList.remove('recording', 'rejected');
    hotkeyBtn.textContent = hotkey;
  }

  function reject(message) {
    hotkeyBtn.classList.add('rejected');
    hotkeyBtn.textContent = message;
  }

  function comboFrom(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    // Single characters are stored uppercase to read like a keycap; parsing on
    // the page lowercases both sides, so the case is presentation only.
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    return parts.join('+');
  }

  hotkeyBtn.addEventListener('click', () => {
    if (recording) {
      stopRecording();
      return;
    }
    recording = true;
    hotkeyBtn.classList.add('recording');
    hotkeyBtn.textContent = 'Press a key';
  });

  hotkeyBtn.addEventListener('keydown', (e) => {
    // Not recording yet: let Enter and Space activate the button normally.
    if (!recording) return;
    e.preventDefault();
    if (e.key === 'Escape') {
      stopRecording();
      return;
    }
    if (MODIFIER_KEYS.includes(e.key)) return;
    if (RESERVED_KEYS[e.key]) {
      reject(RESERVED_KEYS[e.key] + ' is reserved');
      return;
    }
    const combo = comboFrom(e);
    stopRecording();
    renderHotkey(combo);
    save({ hotkey: combo });
  });

  hotkeyBtn.addEventListener('blur', () => {
    if (recording) stopRecording();
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

  // --- What's new --------------------------------------------------------
  //
  // Shown once. Opening the popup is itself the acknowledgement, so the version
  // is marked seen as it renders: the notice is gone next time whether or not
  // the X was used. background.js is what decides there is anything to show, by
  // recording the version the update came from.

  function clearUpdateBadge() {
    try {
      chrome.action.setBadgeText({ text: '' });
    } catch (e) {
      // Badges are cosmetic; an older browser without action.setBadgeText must
      // not take the settings page down with it.
    }
  }

  function renderWhatsNew() {
    const section = document.getElementById('whats-new');
    const list = document.getElementById('whats-new-list');
    const title = document.getElementById('whats-new-title');
    const dismiss = document.getElementById('whats-new-dismiss');
    const current = chrome.runtime.getManifest().version;

    dismiss.addEventListener('click', () => { section.hidden = true; });

    chrome.storage.local.get({ lastSeenVersion: null }, ({ lastSeenVersion }) => {
      if (!lastSeenVersion || lastSeenVersion === current) return;
      const entries = WFS_WHATS_NEW.highlightsSince(lastSeenVersion, current);

      title.textContent = entries.length ? 'New in ' + entries[0].version : 'Updated to ' + current;
      for (const entry of entries) {
        for (const text of entry.highlights) {
          const li = document.createElement('li');
          li.textContent = text;
          list.appendChild(li);
        }
      }
      section.hidden = false;

      chrome.storage.local.set({ lastSeenVersion: current });
      clearUpdateBadge();
    });
  }

  // Same source as the update notice: the highlights people would actually
  // notice, not the repo-facing record. Collapsed by default because a popup is
  // capped at 800px tall and this list only grows.
  function renderChangelog() {
    const current = chrome.runtime.getManifest().version;
    const entries = WFS_WHATS_NEW.releasedUpTo(current);
    if (!entries.length) return;

    const body = document.getElementById('changelog-body');
    for (const entry of entries) {
      const heading = document.createElement('h3');
      heading.textContent = entry.version;
      if (entry.version === current) {
        const badge = document.createElement('span');
        badge.className = 'changelog-badge';
        badge.textContent = 'installed';
        heading.appendChild(badge);
      }
      const list = document.createElement('ul');
      for (const text of entry.highlights) {
        const item = document.createElement('li');
        item.textContent = text;
        list.appendChild(item);
      }
      body.append(heading, list);
    }

    document.getElementById('changelog-current').textContent = 'v' + current;
    document.getElementById('changelog-section').hidden = false;
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
        if (!recording) renderHotkey(changes.hotkey.newValue || DEFAULTS.hotkey);
      } else if (k === 'healthReporting') {
        healthReportingEl.checked = !!changes.healthReporting.newValue;
      } else if (CHECKBOX_KEYS.includes(k)) {
        const el = document.getElementById(k);
        if (el) el.checked = !!changes[k].newValue;
      }
    }
  });

  load();
  renderWhatsNew();
  renderChangelog();
})();
