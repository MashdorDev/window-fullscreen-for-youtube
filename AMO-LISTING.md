# AMO Listing Copy

Draft of the content to paste into the AMO submission form.

## Name

`Window Fullscreen for YouTube`

## Summary (max 250 chars)

Watch YouTube in true windowed fullscreen — the player fills your browser window without going OS-level fullscreen. Built for ultrawide monitors, dual-screen setups, and anyone who wants a bigger player. Free forever, open source.

## Description (markdown supported on AMO)

```markdown
**Window Fullscreen for YouTube** gives YouTube a real windowed-fullscreen mode. The player fills your browser window without taking over your screen — perfect for ultrawide monitors, dual-screen setups, or anyone who wants a bigger player while keeping the rest of the browser usable.

### Features

- **Native player button** right next to YouTube's own fullscreen icon
- **Configurable hotkey** (default Shift+F), Esc to exit
- **Auto-toggle on new videos** (optional)
- **Scrollable mode** — keep the player large and still reach comments below
- **Hover-to-reveal masthead** so the search bar is always one mouse-flick away
- **Live chat side-panel** with a draggable resize handle — choose sticky chat or scroll-with-the-page
- **Granular hide controls** for masthead, sidebar, comments
- **Native YouTube integration** — three settings live inside YouTube's gear menu, styled to match

### Why free?

The most popular extension for windowed-fullscreen moved its core features behind a paywall, and the community wasn't happy. This extension ships every previously-paid feature free, source available for inspection.

No paywall. No subscription. No nag prompts. Open source under MIT.

### Privacy

This extension only accesses youtube.com. It stores settings in your browser's sync storage. It does not collect, transmit, or sell any data.

### Source code

https://github.com/MashdorDev/window-fullscreen-for-youtube

### Support

If this extension is useful to you, consider sponsoring development:

- GitHub Sponsors: https://github.com/sponsors/MashdorDev
- Ko-fi: https://ko-fi.com/dorzairidev
```

## Categories

- Primary: **Photos, Music & Videos**
- Tags: `youtube`, `fullscreen`, `video`, `ultrawide`, `chat`, `productivity`

## Screenshot guide

Take 4-6 screenshots showing the extension in action. Recommended captures:

1. **Hero shot**: a video in windowed-fullscreen on an ultrawide-feeling layout. Show the player filling the viewport.
2. **Native button placement**: zoomed-in view of the player controls bar, highlighting our button between theater and fullscreen with the YouTube gear menu open showing our three toggles.
3. **Live chat side-panel (sticky mode)**: video on the left, chat docked on the right, resize handle visible. Bonus: include a hint of dragging.
4. **Scrollable mode**: scrolled-down view showing comments below the player.
5. **Options popup**: the extension popup open from the toolbar icon, showing the full settings.
6. **Before / after**: native YouTube fullscreen on ultrawide (with black bars) next to our windowed fullscreen (filling the browser). Optional but persuasive.

For AMO requirements:
- PNG or JPG
- Minimum 1280×800
- Show actual functionality, not promotional copy overlays

## Privacy policy

If AMO requires a privacy policy link, host this short text on GitHub Pages or similar:

```
Privacy Policy — Window Fullscreen for YouTube

This extension does not collect, transmit, or sell any personal data.

It accesses only www.youtube.com to inject its windowed-fullscreen functionality.
Settings (hotkey, toggles, chat width) are stored using your browser's sync
storage, which syncs across your own devices when you are signed in. We do
not have access to this data.

The extension makes no network requests of its own. It does not contact any
analytics services, advertising networks, or third-party servers.

Source code: https://github.com/MashdorDev/window-fullscreen-for-youtube
License: MIT
```

## Submission checklist

- [ ] Bump version in `manifest.json` if not already at the release version
- [ ] Tag the release in git: `git tag v0.2.0 && git push origin v0.2.0`
- [ ] Zip the extension folder (excluding `.git`, `node_modules`, `*.md`, `web-ext-artifacts/`):
      `web-ext build --overwrite-dest`
- [ ] Upload `.zip` (or `.xpi`) to AMO
- [ ] Paste summary + description
- [ ] Upload screenshots (4+)
- [ ] Provide source-code link (GitHub)
- [ ] Provide support email (or link to GitHub Issues)
- [ ] If using minified code: provide source for AMO reviewers (we don't — code is plain JS)
- [ ] Submit for review
