# Window Fullscreen for YouTube

A free, open-source Firefox + Chrome extension that gives YouTube a real windowed-fullscreen mode — the player fills the browser window without going OS-level fullscreen.

Built for ultrawide and dual-monitor users who lose real estate to YouTube's letterboxing in native fullscreen, and for anyone who wants a bigger player while keeping the browser chrome accessible.

## Features

- **Native player button** in YouTube's own control bar — not a toolbar popup, not a floating widget
- **Configurable hotkey** (default `Shift+F`), `Esc` to exit
- **Auto-toggle** on new video (optional)
- **Scrollable mode** — keep scrolling past the player to reach comments and related videos
- **Granular page-chrome hiding** — toggle masthead, sidebar, comments independently
- **Hover-to-reveal masthead** — search bar fades in when you move the cursor to the top edge
- **Live chat side-panel** — dedicated chat toggle button on live/post-live videos with a draggable resize handle. Choose sticky chat (always pinned to right) or non-sticky (scrolls with the page)
- **Native YouTube integration** — three toggles inside YouTube's gear menu, styled to match
- **Smooth transitions** that respect `prefers-reduced-motion`

Every feature is free, forever — no paywall, no subscription, no nag prompts. Open source (MIT). Zero runtime dependencies, no build step.

## Install

**Firefox:** coming soon to AMO
**Chrome:** coming soon to the Chrome Web Store

### Development install — Firefox

1. Clone this repo
2. Open `about:debugging` → "This Firefox" → "Load Temporary Add-on"
3. Select `manifest.json` from the cloned folder

### Development install — Chrome

1. Clone this repo
2. Open `chrome://extensions`, enable Developer mode
3. Click "Load unpacked", select the cloned folder

## Why this exists

The incumbent extension (YouTube Windowed FullScreen by navi.jador) pioneered the windowed-fullscreen pattern but moved core features behind a paywall in v4.7. The community noticed — the AMO reviews are bimodal, split between users who love the feature and users who feel rug-pulled. This extension ships every previously-paid feature for free, with the source open for inspection.

## Settings

Open settings by clicking the toolbar icon (after pinning the extension), or use the three toggles directly inside YouTube's gear menu:

| Setting | Default | Description |
|---|---|---|
| `hotkey` | `Shift+F` | Toggle hotkey, modifier combos supported (e.g. `Ctrl+Alt+W`) |
| `autoToggle` | off | Auto-enter windowed fullscreen on each new video |
| `scrollableMode` | off | Allow scrolling beneath the player to reach comments |
| `stickyChat` | on | Pin chat to the right edge (live videos); off = chat scrolls with page |
| `hideMasthead` | on | Hide YouTube's top bar (hover to reveal) |
| `hideSidebar` | on | Hide related videos sidebar (ignored on live videos so the chat stays accessible) |
| `hideComments` | on | Hide comments (ignored in scrollable mode) |

## Support

This extension is free and will stay free. If it's useful to you, consider supporting development:

- [GitHub Sponsors](https://github.com/sponsors/MashdorDev)
- [Ko-fi](https://ko-fi.com/dorzairidev)

## License

MIT — see [LICENSE](./LICENSE)
