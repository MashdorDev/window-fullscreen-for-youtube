// Background event page (Firefox) / service worker (Chrome).
//
// It exists for two reasons: consent has to be re-checked somewhere the
// content script can't reach (chrome.permissions is not exposed to content
// scripts), and the report has to be sent from the extension origin — a fetch
// from a content script runs against YouTube's CSP.
'use strict';

const DSN_KEY = 'a015d941e8214ab796b74cbfc04d8cbb';
const ENDPOINT =
  'https://glitchtip.dorzairi.com/api/4/envelope/?sentry_key=' + DSN_KEY + '&sentry_version=7';
const DATA_PERMISSION = 'technicalAndInteraction';
const RELEASE = 'window-fullscreen-for-youtube@' + chrome.runtime.getManifest().version;

async function consented() {
  const { healthReporting } = await chrome.storage.sync.get({ healthReporting: false });
  if (!healthReporting) return false;
  // Chrome has no data-collection permission model, so the settings toggle is
  // the whole of consent there. Firefox additionally requires the grant, which
  // the user can withdraw in about:addons at any time.
  const perms = await chrome.permissions.getAll();
  return !perms.data_collection || perms.data_collection.includes(DATA_PERMISSION);
}

async function send(event) {
  if (!(await consented())) return;

  const eventId = crypto.randomUUID().replace(/-/g, '');
  const sentAt = new Date().toISOString();
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: sentAt }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify({
      ...event,
      event_id: eventId,
      timestamp: sentAt,
      platform: 'javascript',
      release: RELEASE,
      environment: 'production',
      sdk: { name: 'wfs.minimal', version: '1' },
    }),
  ].join('\n');

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
    });
  } catch (e) {
    // A failed report must not become a second problem.
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'wfs-event') send(msg.event);
});

// Revoking the permission in about:addons has to actually stop reporting, not
// just stop it the next time the popup happens to be opened.
chrome.permissions.onRemoved.addListener((perms) => {
  if (perms.data_collection && perms.data_collection.includes(DATA_PERMISSION)) {
    chrome.storage.sync.set({ healthReporting: false });
  }
});
