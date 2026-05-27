# Architecture

A deliberately small Manifest V3 extension: plain JavaScript, no build step, no
runtime dependencies. Everything happens in a single content script plus an options
page.

## Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest. Permissions: `storage`; host: `*://www.youtube.com/*`. Declares the content script, the toolbar action popup, and `options_ui`. `browser_specific_settings.gecko` pins the AMO id, `strict_min_version: 142.0`, and `data_collection_permissions: ["none"]`. |
| `content.js` | The entire in-page behavior (see below). Injected on `www.youtube.com` at `document_idle`. |
| `content.css` | All layout/visibility rules, keyed off classes the script sets on `<html>`. |
| `options.html` / `options.css` / `options.js` | The settings UI, shown both as the toolbar popup and the options page. Reads/writes `chrome.storage.sync`. |
| `icons/` | 16/32/48/128 px PNGs. |

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
