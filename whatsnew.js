// Release highlights shown once, in the popup, after the extension updates
// itself underneath the user.
//
// CHANGELOG.md is the record of what changed and is written for people reading
// the repo. This is the other audience: someone who opened the popup to change
// a setting and has thirty seconds. Two or three lines per release, phrased as
// what they will notice, not what was refactored. Releases with nothing a user
// would notice get no entry at all, and the popup falls back to a bare "updated
// to X" with a link to the full changelog.
//
// Loaded as a plain script by options.html and required directly by the tests,
// so it stays dependency-free and side-effect-free.

const WHATS_NEW_ENTRIES = [
  {
    version: '0.4.1',
    highlights: [
      "The buttons now work on a stream that has not started yet. YouTube takes its control bar away on the waiting screen, so they sit on the player's top-right corner until the stream begins and then move back.",
      'Auto windowed no longer switches itself on while you scroll Shorts.',
    ],
  },
  {
    version: '0.4.0',
    highlights: [
      'Closing live chat gives the video the whole window back, instead of leaving the chat column sitting there empty.',
      'With the sidebar hidden, it now stays hidden after you close chat.',
      'The top bar no longer stays up after the mouse leaves the page, and chat no longer covers it.',
      "The extension's toggles no longer turn up inside YouTube's Quality and Sleep timer lists.",
      "They now live behind a single \"Window fullscreen\" row in the gear menu, so the menu is back to the size YouTube builds it.",
    ],
  },
  {
    version: '0.3.0',
    highlights: [
      'New "Tell the developer when YouTube breaks this" setting, off by default. YouTube changes its player often, and this reports which piece stopped working so it can be fixed before you go looking for a fix.',
    ],
  },
];

// Manifest versions here are plain dotted numbers. Anything unparseable sorts
// as 0 rather than throwing, because a bad compare must not be what stops the
// popup from rendering.
function compareVersions(a, b) {
  const pa = String(a).split('.');
  const pb = String(b).split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i], 10) || 0;
    const nb = parseInt(pb[i], 10) || 0;
    if (na !== nb) return na < nb ? -1 : 1;
  }
  return 0;
}

// Everything that has actually shipped by the running version, newest first.
// An entry is written here when the release is prepared, which can be before the
// manifest bump lands, so anything ahead of `current` is still unreleased and
// must not be shown as if it were.
function releasedUpTo(current, entries) {
  const list = entries || WHATS_NEW_ENTRIES;
  if (!current) return [];
  return list
    .filter((e) => compareVersions(e.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version));
}

// Everything released between the version last seen and the one now running.
// A fresh install has no `lastSeen` and gets nothing: there is no "what's new"
// for someone who has not seen the old one. An already-seen version and a
// downgrade both fall out of the range check for free.
function highlightsSince(lastSeen, current, entries) {
  if (!lastSeen) return [];
  return releasedUpTo(current, entries).filter((e) => compareVersions(e.version, lastSeen) > 0);
}

const WFS_WHATS_NEW = {
  ENTRIES: WHATS_NEW_ENTRIES,
  compareVersions,
  highlightsSince,
  releasedUpTo,
};

if (typeof module !== 'undefined' && module.exports) module.exports = WFS_WHATS_NEW;
