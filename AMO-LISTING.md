# AMO Listing Copy

Draft of the content to paste into the AMO submission form.

## Name

`Window Fullscreen for YouTube`

## Summary (max 250 chars)

Watch YouTube in windowed fullscreen: the player fills your browser window without going OS-level fullscreen. Built for ultrawide monitors, dual-screen setups and anyone who wants a bigger player. Free and open source.

## Description

AMO stores this as Markdown. It renders bold, italics, lists and links, but not
headings, so section titles are bold lines. Paste this as is.

```markdown
**Window Fullscreen for YouTube** gives YouTube a real windowed-fullscreen mode. The player fills your browser window without taking over your screen, which suits ultrawide monitors, dual-screen setups, or anyone who wants a bigger player and still wants the rest of the browser.

**Features**

- **A button in the player**, next to YouTube's own fullscreen button. No toolbar popup, no floating widget.
- **Configurable hotkey** (default Shift+F). Esc exits, and that can be turned off.
- **Auto-enter on new videos** (optional)
- **Scrollable mode**: keep the player large and still scroll down to the comments
- **Hover to reveal the top bar**, so search is one mouse move away
- **Live chat side panel** with a drag handle to resize it. Pin it to the right or let it scroll with the page.
- **Hide what you don't want**: top bar, related videos, comments
- **Settings in YouTube's gear menu**: the three most used toggles sit there, styled to match

**Why free?**

The most popular windowed-fullscreen extension moved its main features behind a paywall. This one has all of them for free, and the source is public so you can check what it does.

No paywall. No subscription. No nag prompts. MIT licensed.

**Privacy**

The extension only runs on youtube.com and stores your settings in your browser's sync storage. It has no analytics, no tracking and no ads, and nothing is sold.

The one exception is breakage reports, which are off until you turn them on. YouTube changes its player often, and when it does this extension can stop working without any visible error. With the setting on, it notices and reports which piece broke, so it gets fixed quickly. A report is a list of internal YouTube element names plus the last few extension actions. It never includes the page address, the video, or anything you type. You can revoke it at any time in about:addons. Full policy: [privacy policy](https://docs.dorzairi.com/docs/5a8eb82d-4734-4ca3-8a4c-7d19c06787ce/).

**Source code and bug reports**

[github.com/MashdorDev/window-fullscreen-for-youtube](https://github.com/MashdorDev/window-fullscreen-for-youtube)
```

## Chrome Web Store description

Plain text only, no markup. The same content as AMO, with "about:addons" swapped for
the Chrome wording.

```text
Window Fullscreen for YouTube gives YouTube a real windowed-fullscreen mode. The player fills your browser window without taking over your screen, which suits ultrawide monitors, dual-screen setups, or anyone who wants a bigger player and still wants the rest of the browser.

FEATURES
- A button in the player, next to YouTube's own fullscreen button. No toolbar popup, no floating widget.
- Configurable hotkey (default Shift+F). Esc exits, and that can be turned off.
- Auto-enter on new videos (optional)
- Scrollable mode: keep the player large and still scroll down to the comments
- Hover to reveal the top bar, so search is one mouse move away
- Live chat side panel with a drag handle to resize it. Pin it to the right or let it scroll with the page.
- Hide what you don't want: top bar, related videos, comments
- Settings in YouTube's gear menu: the three most used toggles sit there, styled to match

WHY FREE?
The most popular windowed-fullscreen extension moved its main features behind a paywall. This one has all of them for free, and the source is public so you can check what it does.

No paywall. No subscription. No nag prompts. MIT licensed.

PRIVACY
The extension only runs on youtube.com and stores your settings in your browser's sync storage. It has no analytics, no tracking and no ads, and nothing is sold.

The one exception is breakage reports, which are off until you turn them on. YouTube changes its player often, and when it does this extension can stop working without any visible error. With the setting on, it notices and reports which piece broke, so it gets fixed quickly. A report is a list of internal YouTube element names plus the last few extension actions. It never includes the page address, the video, or anything you type. You can turn it off at any time in the extension's settings.

SOURCE CODE AND BUG REPORTS
https://github.com/MashdorDev/window-fullscreen-for-youtube
```

## Categories

- Primary: **Photos, Music & Videos**
- Tags (AMO picks from a fixed list): `youtube`, `video`, `streaming`, `chat`

## Screenshot captions (AMO)

By AMO preview id, in listing order:

| Preview | Caption |
|---------|---------|
| 375619 | Live chat docked beside the player |
| 375620 | The player fills the window, with the button next to YouTube's fullscreen button |
| 375621 | Settings: hotkey, auto-enter, scrollable mode, sticky chat and what to hide |
| 375622 | Windowed, not OS fullscreen: your tabs and toolbar stay put |
| 375623 | Scrollable mode: scroll down to the description and comments |
| 375624 | Three toggles added to YouTube's own gear menu |
| 375625 | A live stream with the chat side panel |
| 375626 | Sticky chat stays on the right while you read the comments |
| 375627 | Drag the chat edge to make it as wide as you like |

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

The canonical policy is `docs/privacy-policy.md`, published at
https://docs.dorzairi.com/docs/5a8eb82d-4734-4ca3-8a4c-7d19c06787ce/ — that is the
URL both store listings point at. Keep the two in sync; the live page has to be
updated separately (see `docs/release-and-ci.md`), it does not follow the repo.

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
