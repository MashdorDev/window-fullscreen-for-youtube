# Architecture

A deliberately small Manifest V3 extension: plain JavaScript, no build step, no
runtime dependencies. Everything happens in a single content script plus an options
page.

## Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest. Permissions: `storage`; host: `*://www.youtube.com/*`. Declares the content script, the background script, the toolbar action popup, and `options_ui`. `browser_specific_settings.gecko` pins the AMO id, `strict_min_version: 142.0`, and `data_collection_permissions` (`required: ["none"]`, `optional: ["technicalAndInteraction"]`). |
| `content.js` | The entire in-page behavior (see below). Injected on `www.youtube.com` at `document_idle`. |
| `content.css` | All layout/visibility rules, keyed off classes the script sets on `<html>`. |
| `options.html` / `options.css` / `options.js` | The settings UI, shown both as the toolbar popup and the options page. Reads/writes `chrome.storage.sync`. |
| `errors.js` | Opt-in breakage reporting. Runs in both the content script and the options page, keeps the breadcrumb ring buffer, and builds the payload. Exposes `window.wfsReport` (health signals) and `window.wfsCrumb` for `content.js`, and installs the `error`/`unhandledrejection` handlers for the secondary exception path. |
| `background.js` | Event page (Firefox) / service worker (Chrome). Re-checks consent and POSTs the Sentry envelope to GlitchTip. |
| `icons/` | 16/32/48/128 px PNGs. |

### Why reporting is split across two files

`chrome.permissions` is not exposed to content scripts, so the Firefox
data-collection grant cannot be verified there, and a `fetch` issued from a
content script is subject to YouTube's CSP. Both problems go away by having
`errors.js` build the payload and hand it to `background.js` over
`runtime.sendMessage`, which sends from the extension origin.

The reporter is hand-rolled rather than `@sentry/browser`: GlitchTip accepts the
Sentry envelope format over plain `fetch`, and the SDK would drag a build step
into a repo that has none. Guard rails live in `errors.js`: five events per page
load, identical reports sent once, page stack frames dropped, and the
`moz-extension://<uuid>` prefix stripped from filenames because it is generated
per install and identifies a device.

### The health check

Exceptions are the wrong thing to watch for here. Every YouTube lookup in
`content.js` is guarded (`if (!controls) return;`), so a renamed class produces a
silent no-op, not a throw. `runHealthCheck()` closes that gap: 15s after each
watch-page navigation it re-runs the `SEL` selectors, confirms the injected button
exists and has non-zero width, and confirms the gear-menu items are still in the
settings panel when that panel exists. Anything that fails is reported by name,
fingerprinted so one YouTube change groups into one issue.

It defers (up to four times) rather than reporting while an ad is playing, while
the tab is hidden, or before the `video` element exists, since none of those mean
YouTube changed. `ensureTheaterMode` reports `theaterModeFailed` separately when
the size button is still present but clicking it no longer produces theater mode.

## How state works

The script never restyles the page directly for its main modes. Instead it toggles
**marker classes on `document.documentElement` (`<html>`)**, and `content.css` does the
rest. The key classes:

- `wfs-active` — windowed fullscreen is on
- `wfs-scrollable` — scrollable mode
- `wfs-sticky-chat` — chat pinned to the right edge
- `wfs-hide-masthead` / `wfs-hide-sidebar` / `wfs-hide-comments` — granular hiding
- `wfs-chat-available` / `wfs-chat-visible` — chat presence/visibility
- `wfs-menu-open`, `wfs-masthead-revealed` — transient UI states

This keeps toggling cheap and lets CSS handle transitions.

## The windowed-fullscreen mechanism

Rather than `position: fixed` on the player (which fights YouTube's own layout), the
script works *with* YouTube:

1. `ensureTheaterMode()` clicks YouTube's native size button (`.ytp-size-button`) and
   retries until the watch container (`ytd-watch-flexy`) reports `theater`.
2. `content.css` (gated on `wfs-active`) sets the player to `height: 100vh` and removes
   the top offset so it fills the window.
3. On exit, theater mode is restored to whatever it was before activating.

A `MutationObserver` watches the watch container's `theater` attribute and auto-exits
if YouTube drops theater mode underneath us.

## Injected UI

`scheduleWork()` (rAF-batched, re-run on every relevant DOM mutation and SPA navigation)
keeps these in place:

- **Player button** — injected into `.ytp-right-controls`, immediately before
  `.ytp-fullscreen-button`, styled to match native controls. Click = toggle.
- **Chat button** — a second control button that shows/collapses live chat, only present
  when a chat frame exists.
- **Gear-menu toggles** — three `ytp-menuitem` rows added to YouTube's settings popup
  (`.ytp-settings-menu .ytp-panel-menu`) for Auto window fullscreen, Scrollable mode, and
  Sticky chat.
- **Chat resize handle** — a draggable divider that sets `--wfs-chat-width` and persists
  the chosen width.

## Input and navigation

- **Hotkey** — a capture-phase `keydown` listener matches the configured combo
  (default `Shift+F`); `Esc` exits when active. Ignored while typing in inputs.
- **Masthead reveal** — when the top bar is hidden, moving the mouse to the top ~30px
  reveals it.
- **SPA navigation** — `yt-navigate-finish` resets per-video state, exits if you leave a
  watch page, and re-runs injection. `maybeAutoToggle()` enters windowed fullscreen on a
  new video when Auto mode is on.

## Chat layout

- **Sticky** (default): handled purely in `content.css` via `wfs-sticky-chat` — chat is
  fixed to the right edge and the comments column respects its width.
- **Non-sticky**: `applyNonStickyChatLayout()` sets a few `!important` inline styles on
  `ytd-watch-flexy`, `#secondary`, the chat container, and the chat frame so chat scrolls
  with the page. Styles are fully removed when the mode is off.

## Settings

`chrome.storage.sync` holds all preferences (with a `DEFAULTS` fallback). A
`storage.onChanged` listener keeps the content script, the gear-menu toggles, and the
options page in sync live, in any open tab.
