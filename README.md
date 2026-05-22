# Window Fullscreen for YouTube

A free, open-source Firefox + Chrome extension that gives YouTube a real windowed-fullscreen mode — the player fills the browser window without going OS-level fullscreen.

Built for ultrawide and dual-monitor users who lose real estate to YouTube's letterboxing in native fullscreen.

## Features

- Native player button in YouTube's own control bar (not a toolbar popup)
- Default hotkey: `Shift+F`
- `Esc` to exit
- Every feature free, forever — no paywall, no subscription, no nag prompts
- Open source (MIT)
- Zero runtime dependencies, no build step

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

## Status

v0.1 — prototype. Button injection + toggle + hotkey works. Options page is a placeholder.

Roadmap toward v1.0:
- Configurable hotkey
- Auto-toggle on video start
- Scrollable fullscreen mode
- Granular page-element hide toggles (comments, sidebar, masthead)
- Icons

## Support

This extension is free and will stay free. If it's useful to you, consider supporting development:

- GitHub Sponsors: _(link pending)_
- Ko-fi: _(link pending)_

## License

MIT — see [LICENSE](./LICENSE)
