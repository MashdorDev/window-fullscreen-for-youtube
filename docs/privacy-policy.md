# Privacy Policy — Window Fullscreen for YouTube

_Last updated: 31 July 2026_

Window Fullscreen for YouTube ("the extension") is a free, open-source browser
extension that adds a windowed-fullscreen mode to the YouTube video player.

## Summary

The extension collects nothing unless you switch on crash reports, which are off
by default. There is no analytics, no tracking, no advertising, and nothing is
ever sold or shared.

## What data the extension handles

### Your settings

The only data the extension stores about you is your own settings:

- your chosen toggle hotkey;
- which optional behaviors are enabled (auto-enter on new video, scrollable mode,
  sticky chat, crash reports);
- which elements are hidden while active (masthead, sidebar, comments);
- the width you dragged the chat panel to.

These preferences are saved with your browser's built-in `storage.sync` API. If you
are signed into your browser, it may sync these settings across your own devices via
your browser account. This data stays within your browser/account: the developer
never receives it and has no access to it.

### Crash reports (off by default, opt-in)

If you turn on "Send crash reports" in the extension settings, then when code
inside this extension throws an error, a report about that error is sent to a
GlitchTip server run by the developer at `glitchtip.dorzairi.com`. GlitchTip is
open-source error tracking, self-hosted on the developer's own hardware. No
third-party company receives the report.

A report contains:

- the error type, message, and the file and line number inside the extension
  where it happened;
- the extension version and which part of the extension crashed (the YouTube
  page script, or the settings popup);
- a list of up to 20 recent extension actions, for example "enter windowed
  fullscreen", "toggle chat", "changed the sticky chat setting", each with a
  timestamp;
- whether you were on a watch page when the error occurred.

A report does **not** contain:

- the page address, the video ID, the video title, or any part of what you were
  watching;
- your search or browsing history;
- anything you typed, including chat and comments;
- your name, email, account, or any identifier for you or your browser profile;
- your IP address. The server is configured to discard it on arrival.

Reports are capped at five per page load and identical errors are only sent once,
so the feature cannot become a stream of data about your session. Crash reports
are used only to find and fix bugs, and are deleted on the server's normal
retention schedule.

**Turning it off.** Uncheck "Send crash reports" in the extension settings. In
Firefox you can also revoke it under `about:addons` → this extension → Permissions
and data → "Technical and interaction data". Either action stops reporting
immediately.

## What the extension does NOT do

- It does not collect personally identifiable information.
- It does not track your browsing history or activity.
- It does not read, record, or transmit the videos you watch.
- It makes no network requests at all unless you have opted into crash reports,
  and then only when the extension itself has crashed.
- It contains no remote code; all code is bundled in the package.
- It shows no advertisements.

## Permissions

- **storage** — to save your settings locally (described above).
- **Access to `www.youtube.com`** — so the extension runs only on YouTube and can
  modify the player layout there. It runs on no other website.
- **Technical and interaction data** (optional, Firefox) — only requested if you
  turn on crash reports, and revocable at any time.

## Data sharing

Crash reports go to the developer's own self-hosted server and nowhere else. They
are not sold, shared, or handed to any analytics or advertising provider. All
other data stays in your browser.

## Open source

Full source code: https://github.com/MashdorDev/window-fullscreen-for-youtube

The crash reporter is about a hundred lines in `errors.js` and `background.js`
and can be read in a couple of minutes.

## Contact

Questions: dorzairidev@gmail.com, or open an issue on the GitHub repository.

## Changes

If this policy changes, the updated version will be posted on this page.
