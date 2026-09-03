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
| `options.html` / `options.css` / `options.js` | The settings UI, shown both as the toolbar popup and the options page. Reads/writes `chrome.storage.sync`. Also renders the update notice and records the hotkey. |
| `whatsnew.js` | Per-release highlights plus the version arithmetic that decides which of them a given user still has to see. No side effects, so the tests can require it directly. |
| `errors.js` | Opt-in breakage reporting. Runs in both the content script and the options page, keeps the breadcrumb ring buffer, and builds the payload. Exposes `window.wfsReport` (health signals) and `window.wfsCrumb` for `content.js`, and installs the `error`/`unhandledrejection` handlers for the secondary exception path. |
| `background.js` | Event page (Firefox) / service worker (Chrome). Re-checks consent, POSTs the Sentry envelope to GlitchTip, and handles `runtime.onInstalled` for the update notice. |
| `icons/` | 16/32/48/128 px PNGs. |
| `test/` | `node --test` suites. Repo-only; `web-ext-config.cjs` keeps them out of the package. |
| `tools/capture.mjs` | Generates `docs/screenshots/<version>/` by driving a throwaway Chrome over the DevTools Protocol. Repo-only, no dependencies. See `docs/screenshots/README.md`. |
| `package.json` | Repo tooling only, no dependencies. It exists so `node --test` resolves CommonJS from the repo instead of inheriting a `type` field from a parent directory. |

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
- `wfs-chat-visible` — live chat is on screen. Deliberately not "a chat frame exists": a
  collapsed frame is still in the DOM, and treating the two as the same thing is what used
  to leave an empty chat column beside the video
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

## The gear-menu submenu

One row in YouTube's menu, opening a panel of ours. Three rows inline nearly doubled the
height of the top level and forced a scrollbar, and the widest of them set the width of
the whole menu, every submenu opened from it included.

The panel is built from YouTube's own markup (`.ytp-panel` > `.ytp-panel-header` with
`.ytp-panel-back-button` + `.ytp-panel-title`, then `.ytp-panel-menu`), so it inherits
their styling rather than approximating it. Three things about it are not obvious:

- **Finding the top level.** YouTube swaps panels through one container instead of keeping
  them side by side, so `.ytp-panel-menu` resolves to whichever panel is showing, and
  appending to it blindly drops extension rows into the bottom of Quality and Sleep timer.
  `getSettingsPanelMenu()` picks the top level by the absence of a back-button header,
  which also stops it finding our own panel, since ours has one.
- **Sizing it.** The popup's width and height are inline on `.ytp-settings-menu` and
  YouTube's controller maintains them only for its own panels. `requiredPanelWidth()`
  measures the label text directly and adds the row chrome, because YouTube's CSS pins a
  panel to the popup width: neither `max-content` on the panel nor a roomier popup makes it
  report the width it actually needs, and measuring it as-is just bakes in the wrapping.
- **Getting back out.** Ours takes the top level's place by hiding it, so a popup that
  closes while ours is open leaves the top level hidden and the next open lands inside our
  panel. Watching the popup for the close was not enough on its own; `enforcePanelState()`
  re-asserts "popup not on screen means our panel is not open" on every `scheduleWork()`
  pass instead.

## Chat visibility

Closing chat is not one signal. YouTube sets `collapsed` on `ytd-live-chat-frame#chat`,
adds `hide-chat-frame`, sets the frame to `display: none`, and moves `#chat-container`
out of `#columns` back into `#secondary`, and which of those happen depends on the layout
and on whether it is a live stream or a replay. `isChatVisible()` therefore checks the
attribute *and* the computed `display`. Nothing in `content.css` touches `display` on the
frame, so that check cannot latch on the extension's own styles the way a width or height
check would.

`updateChatVisibilityClass()` runs from the attribute observer and from every
`scheduleWork()` pass, and when the answer actually changes it re-applies the non-sticky
layout and fires a resize. That resize is the point: YouTube sizes the `<video>` from the
player box at the moment it handles the event, so without it the video keeps the width it
had while chat was open and the vacated column stays black. `notifyResize()` fires twice
for the same reason, once now and once after the 0.18s width transition in `content.css`
has settled.

## Injected UI

`scheduleWork()` (rAF-batched, re-run on every relevant DOM mutation and SPA navigation)
keeps these in place:

- **Player button** — injected into `.ytp-right-controls`, immediately before
  `.ytp-fullscreen-button`, styled to match native controls. Click = toggle.
- **Chat button** — a second control button that shows/collapses live chat, only present
  when a chat frame exists.
- **On-player fallback** — a scheduled stream that has not started, and one that has ended,
  both sit on an offline slate where YouTube takes `.ytp-chrome-bottom` down to
  `display: none`, so anything injected into it is present at zero pixels wide. While that
  is the case `controlHost()` hands the two buttons a `#wfs-overlay` box in the player's
  top-right corner instead, and hands them back to the control bar when YouTube restores
  it. One button element either way, moved rather than duplicated. The test is the bar's
  computed display, not the player's state classes, so it holds for whichever slate comes
  next; a `class` observer on `#movie_player` catches the switch, since the page-wide
  observer only watches `childList`.
- **Gear-menu submenu** — one `ytp-menuitem` row, "Window fullscreen", added to YouTube's
  settings popup. It opens a panel of ours holding the three toggles. See below.
- **Chat resize handle** — a draggable divider that sets `--wfs-chat-width` and persists
  the chosen width.

## Input and navigation

- **Hotkey** — a capture-phase `keydown` listener matches the configured combo
  (default `Shift+F`); `Esc` exits when active. Ignored while typing in inputs.
- **Masthead reveal** — when the top bar is hidden, moving the mouse to the top ~30px
  reveals it, and moving back down past it hides it again. The pointer can also leave
  through the top of the window into the browser's own toolbar, where `mousemove` stops
  firing entirely, so a `mouseleave` on the document arms a short timer: brushing past the
  top edge must not pin the bar open for the rest of the video. `content.css` keeps the
  masthead up on `:focus-within` independently, so a search in progress is never yanked
  away mid-type.
- **SPA navigation** — `yt-navigate-finish` resets per-video state, exits if you leave a
  watch page, and re-runs injection. `maybeAutoToggle()` enters windowed fullscreen on a
  new video when Auto mode is on.

## Chat layout

- **Sticky** (default): handled purely in `content.css` via `wfs-sticky-chat` — chat is
  fixed to the right edge and the comments column respects its width.
- **Non-sticky**: `applyNonStickyChatLayout()` sets a few `!important` inline styles on
  `ytd-watch-flexy`, `#secondary`, the chat container, and the chat frame so chat scrolls
  with the page. Styles are fully removed when the mode is off.

## Stacking order

Four things overlap in windowed fullscreen, and the order between them is deliberate:

| | z-index | why |
|---|---|---|
| Player popups (`.ytp-settings-menu`, `.ytp-contextmenu`) | 99999 | must clear everything, including chat |
| Masthead (`#masthead-container`, `ytd-masthead`) | 9995 | above chat, or the bar comes back with its right-hand side (account, notifications, Create) painted over |
| Chat resize handle | 9991 | sits on the chat's left edge, so it has to beat chat |
| Sticky chat (`ytd-live-chat-frame#chat`) | 9990 | fixed to the right edge |
| Player | 1000 | above the page, below all of the above |

The masthead rule is unconditional while `wfs-active`, not tied to the reveal: with
"hide masthead" off, the bar is on screen the whole time and chat would otherwise cover it
permanently.

## The update notice

Extensions update silently, so the first a user hears of a change is usually the change
itself. `background.js` catches `runtime.onInstalled`, records the version being updated
*from* in `storage.local` as `lastSeenVersion`, and puts a dot on the toolbar icon.
Opening the popup diffs that against the running version through `highlightsSince()` in
`whatsnew.js`, renders whatever falls in between, then marks the running version seen and
clears the dot. Opening it is the acknowledgement, so the notice is gone next time whether
or not the X was used.

Two deliberate choices:

- **`storage.local`, not `sync`.** This is "has this browser shown me this yet", not a
  preference. Syncing it would let one machine eat the notice for a second one that has
  not even updated yet.
- **The recorded version is never overwritten.** Two updates before the popup is opened
  would otherwise lose the skipped release's highlights.

The same entries back the popup's **Release notes** section, which lists every shipped
release rather than only the unseen ones, with the installed version marked. It is a
`<details>` collapsed by default, because a popup is capped at 800px tall before it starts
scrolling in a cramped box and this list only grows. `releasedUpTo()` is what stops it
announcing a version whose manifest bump has not shipped yet: an entry is written when the
release is prepared, which is usually a commit or two before the bump lands.

`whatsnew.js` is written for someone who opened the popup to change a setting and has
thirty seconds; `CHANGELOG.md` is the record for people reading the repo. A release with
nothing a user would notice gets no entry, and the popup falls back to a bare "Updated to
X" with a link to the full changelog.

## Settings

`chrome.storage.sync` holds all preferences (with a `DEFAULTS` fallback). A
`storage.onChanged` listener keeps the content script, the gear-menu toggles, and the
options page in sync live, in any open tab.

The hotkey is **recorded, not typed**: the keycap in the popup listens for one real
`keydown` and writes the combination `parseHotkey()` expects. A field people type into
invites `Ctrl-Shift-F`, `control+f` and other spellings that parse to nothing and then
fail silently on the page. Modifier keys alone are ignored while recording, `Esc` cancels,
and `Tab` and `Space` are refused: `Tab` has to keep moving focus, and a stored space
cannot survive the split-on-plus round trip.

## The options UI

`options.html` is both the toolbar popup and the embedded options page, which is why there
is one stylesheet and no per-surface branching. Two constraints come with that:

- **A popup is capped at roughly 800x600** before it starts scrolling inside a cramped box.
  Anything that grows without bound (the release notes list) goes behind a collapsed
  `<details>`.
- **The popup's document is destroyed the moment it closes.** Nothing may depend on async
  work outliving it; the update notice writes `lastSeenVersion` as it renders rather than
  on dismiss for exactly this reason.

`options.css` is driven by tokens on `:root` with a `prefers-color-scheme: light` override,
so the page follows the system preference instead of forcing dark. The accent is the one
colour the extension uses anywhere, including the chat resize handle in `content.css`.

If the settings ever outgrow a screen, the escape hatch is quick toggles in the popup plus
`chrome.runtime.openOptionsPage()` for the rest. `chrome.tabs.getCurrent()` distinguishes
the two surfaces without needing the `tabs` permission.

## Tests

`npm test` (`node --test`) covers `whatsnew.js`: which highlights a given
`lastSeenVersion` should produce and which releases the notes section should list,
including fresh installs, skipped releases, downgrades, and entries written before the
matching manifest bump has shipped. It is the one part of
the extension both pure and consequential enough to be worth pinning down, since getting
it wrong means users either see a stale notice forever or never see one, and neither shows
up in a manual click-through. The rest is DOM choreography against a page that changes
underneath it, which the health check watches instead.
