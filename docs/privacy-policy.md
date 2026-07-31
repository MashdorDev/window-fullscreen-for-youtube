# Privacy Policy — Window Fullscreen for YouTube

_Last updated: 31 July 2026_

Window Fullscreen for YouTube ("the extension") is a free, open-source browser
extension that adds a windowed-fullscreen mode to the YouTube video player.

## Summary

The extension collects nothing unless you switch on breakage reports, which are
off by default and were added in version 0.3.0. Versions before that make no
network requests at all. There is no analytics, no tracking, no advertising, and
nothing is ever sold or shared.

## What data the extension handles

### Your settings

The only data the extension stores about you is your own settings:

- your chosen toggle hotkey;
- which optional behaviors are enabled (auto-enter on new video, scrollable mode,
  sticky chat, breakage reports);
- which elements are hidden while active (masthead, sidebar, comments);
- the width you dragged the chat panel to.

These preferences are saved with your browser's built-in `storage.sync` API. If you
are signed into your browser, it may sync these settings across your own devices via
your browser account. This data stays within your browser/account: the developer
never receives it and has no access to it.

### Breakage reports (version 0.3.0 and later, off by default, opt-in)

YouTube changes its player markup regularly. When it does, this extension can stop
working without any visible error: the button simply never appears. If you turn on
"Tell the developer when YouTube breaks this", the extension checks its own
assumptions on a watch page and, when one of them no longer holds, sends a short
report to a GlitchTip server run by the developer at `glitchtip.dorzairi.com`.
GlitchTip is open-source error tracking, self-hosted on the developer's own
hardware. No third-party company receives the report.

A report contains:

- which internal checks failed, as a list of short names such as
  `rightControls`, `buttonNotInjected`, or `theaterModeFailed`. These name
  YouTube's own page elements and the extension's own features, nothing about you;
- the extension version and which part of the extension noticed;
- a list of up to 20 recent extension actions, for example "enter windowed
  fullscreen", "toggle chat", "changed the sticky chat setting", each with a
  timestamp;
- if the extension's own code threw an error, the error message and the file and
  line number inside the extension where it happened.

A report does **not** contain:

- the page address, the video ID, the video title, or any part of what you were
  watching;
- your search or browsing history;
- anything you typed, including chat and comments;
- your name, email, account, or any identifier for you or your browser profile;
- your IP address. The server is configured to discard it on arrival.

Reports are capped at five per page load, and the same problem is only reported
once, so the feature cannot become a stream of data about your session. Reports
are used only to find and fix breakage, and are deleted on the server's normal
retention schedule.

**Turning it off.** Uncheck the setting in the extension's popup. In Firefox you
can also revoke it under `about:addons` → this extension → Permissions and data →
"Technical and interaction data". Either action stops reporting immediately.

## What the extension does NOT do

- It does not collect personally identifiable information.
- It does not track your browsing history or activity.
- It does not read, record, or transmit the videos you watch.
- It makes no network requests at all unless you have opted into breakage
  reports, and then only when something has actually broken.
- It contains no remote code; all code is bundled in the package.
- It shows no advertisements.

## Permissions

- **storage** — to save your settings locally (described above).
- **Access to `www.youtube.com`** — so the extension runs only on YouTube and can
  modify the player layout there. It runs on no other website.
- **Technical and interaction data** (optional, Firefox) — only requested if you
  turn on breakage reports, and revocable at any time.

## Data sharing

Breakage reports go to the developer's own self-hosted server and nowhere else.
They are not sold, shared, or handed to any analytics or advertising provider. All
other data stays in your browser.

## Open source

Full source code: https://github.com/MashdorDev/window-fullscreen-for-youtube

The reporter is about a hundred lines in `errors.js` and `background.js`, plus the
health check at the bottom of `content.js`, and can be read in a couple of minutes.

## Contact

Questions: dorzairidev@gmail.com, or open an issue on the GitHub repository.

## Changes

If this policy changes, the updated version will be posted on this page.
