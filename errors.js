// Opt-in health reporting. Loaded before content.js and options.js so that
// anything thrown during their startup is still caught.
//
// The signal this exists for is `reportSignal`: YouTube renaming a class breaks
// the extension without throwing anything, so content.js checks its own
// selectors and reports what stopped matching. `reportException` is the
// secondary path, for the rarer case where our code actually throws.
//
// This file only builds the payload — background.js decides whether consent is
// still valid and does the actual send.
(() => {
  'use strict';

  const MAX_CRUMBS = 20;
  const MAX_EVENTS = 5; // a MutationObserver loop can throw the same error thousands of times

  const ORIGIN = chrome.runtime.getURL('');
  const SURFACE = location.href.startsWith(ORIGIN) ? 'options' : 'content';

  // V8 ("at fn (moz-extension://…/content.js:1:2)") and SpiderMonkey
  // ("fn@moz-extension://…/content.js:1:2") in one pass.
  const FRAME_RE = /(?:at\s+(?:(.+?)\s+\()?|(.*?)@)((?:chrome|moz|safari-web)-extension:\/\/[^\s)]+?):(\d+):(\d+)\)?$/;

  let enabled = false;
  let sent = 0;
  const seen = new Set();
  const crumbs = [];

  function crumb(category, message, data) {
    crumbs.push({
      timestamp: Date.now() / 1000,
      type: 'default',
      category: category,
      message: message,
      data: data,
    });
    if (crumbs.length > MAX_CRUMBS) crumbs.shift();
  }

  function parseStack(stack) {
    if (typeof stack !== 'string') return [];
    const frames = [];
    for (const line of stack.split('\n')) {
      const m = FRAME_RE.exec(line.trim());
      // Page frames are dropped rather than anonymised: a YouTube script URL is
      // still a hint about what was being watched.
      if (!m || !m[3].startsWith(ORIGIN)) continue;
      frames.push({
        function: m[1] || m[2] || '?',
        // The moz-extension UUID is generated per install, so it identifies a
        // device. Never let it off the machine.
        filename: 'app:///' + m[3].slice(ORIGIN.length),
        lineno: Number(m[4]),
        colno: Number(m[5]),
        in_app: true,
      });
    }
    return frames.reverse(); // Sentry renders oldest frame first
  }

  function isOurs(stack) {
    return typeof stack === 'string' && stack.includes(ORIGIN);
  }

  function emit(key, event) {
    if (!enabled || sent >= MAX_EVENTS || seen.has(key)) return;
    seen.add(key);
    sent += 1;
    event.tags = Object.assign({ surface: SURFACE }, event.tags);
    event.breadcrumbs = { values: crumbs.slice() };
    try {
      const p = chrome.runtime.sendMessage({ type: 'wfs-event', event: event });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {
      // Extension context goes away mid-update; a lost report is fine.
    }
  }

  // `broken` is a list of names from content.js's own health check.
  function reportSignal(broken) {
    const list = broken.slice().sort();
    emit('signal:' + list.join(','), {
      level: 'warning',
      message: { formatted: 'Health check failed: ' + list.join(', ') },
      // Groups by what broke rather than by who reported it, so one YouTube
      // change is one issue no matter how many users hit it.
      fingerprint: ['selector-health'].concat(list),
      tags: { signal: 'selector-health' },
      extra: { broken: list },
    });
  }

  function reportException(err) {
    const type = err.name || 'Error';
    const value = String(err.message || err).slice(0, 500);
    emit(type + ':' + value, {
      level: 'error',
      exception: {
        values: [{
          type: type,
          value: value,
          stacktrace: { frames: parseStack(err.stack) },
          mechanism: { type: 'onerror', handled: false },
        }],
      },
      tags: { signal: 'exception' },
    });
  }

  // Content scripts share the page's window, so YouTube's own errors land here
  // too. The stack is what tells them apart.
  window.addEventListener('error', (event) => {
    if (event.error && isOurs(event.error.stack)) reportException(event.error);
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && isOurs(event.reason.stack)) reportException(event.reason);
  });

  try {
    chrome.storage.sync.get({ healthReporting: false }, (s) => {
      enabled = !!s.healthReporting;
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.healthReporting) {
        enabled = !!changes.healthReporting.newValue;
      }
    });
  } catch (e) {
    // Storage unavailable means we can't confirm consent, so stay off.
  }

  window.wfsCrumb = crumb;
  window.wfsReport = reportSignal;
})();
