# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.5] - 2026-05-22

### Added
- `web-ext.config.cjs` so lint/build commands no longer need `--ignore-files` flags
- `CHANGELOG.md` (Keep a Changelog format)
- README badges (CI status, latest release, license)
- GitHub issue templates (bug report, feature request) + Discussions link
- `.github/FUNDING.yml` (Sponsor button: GitHub Sponsors + Ko-fi)
- `CONTRIBUTING.md` documenting the dev/main branch strategy
- CI workflow that lints + builds on every push and, on `v*` tag push:
  - Uploads to AMO listed channel (auto-publish, continue-on-error)
  - Signs `--channel=unlisted` for self-distribution
  - Attaches both `.zip` (source) and signed `.xpi` (installable) to the GitHub Release

### Changed
- README install section reflects AMO-pending state and points users to
  GitHub Releases as the install source until the AMO listing is live.
- `strict_min_version` already at 142.0 (since v0.2.2); no change here, noted for completeness.

## [0.2.4] - 2026-05-22

### Fixed
- SVG icons not rendering after the v0.2.2 `innerHTML` → `DOMParser` switch. `parseSvg` now uses `text/html` mime type so the HTML parser handles SVG namespacing automatically.

## [0.2.3] - 2026-05-22

### Fixed
- AMO submission rejection (`data_collection_permissions property is missing`). The key is now declared at both top-level and inside `browser_specific_settings.gecko` to satisfy both AMO's upload validator and `web-ext lint`.

## [0.2.2] - 2026-05-22

### Changed
- Replaced `innerHTML` SVG injection with `DOMParser` + `appendChild` (silences AMO's static-analysis `UNSAFE_VAR_ASSIGNMENT` warnings).
- Declared `data_collection_permissions = ["none"]` to satisfy AMO's new policy.
- Bumped `strict_min_version` to 142.0 (when `data_collection_permissions` key was introduced).

## [0.2.1] - 2026-05-22

### Added
- Real Ko-fi ([ko-fi.com/dorzairidev](https://ko-fi.com/dorzairidev)) and GitHub Sponsors ([github.com/sponsors/MashdorDev](https://github.com/sponsors/MashdorDev)) links in the options popup, styled as branded buttons with each platform's SVG logo and brand hover color.

## [0.2.0] - 2026-05-22

First feature-complete release.

### Added
- Settings infrastructure backed by `chrome.storage.sync`
- Three native-styled toggles inside YouTube's gear menu: auto window fullscreen, scrollable mode, sticky chat
- Full options page (toolbar icon popup) with hotkey input, behavior toggles, granular hide toggles, reset-to-defaults
- Configurable hotkey (default `Shift+F`), `Esc` to exit
- Auto-toggle on each new video (optional)
- Scrollable mode — body remains scrollable, page chrome visible below the player
- Live chat side-panel with draggable resize handle. Sticky (pinned right) and non-sticky (scrolls with page) modes
- Hover-to-reveal masthead (search bar fades in at top edge)
- Smooth fullscreen transitions (0.18s ease-out) with `prefers-reduced-motion` guard
- Extension icons at 16/32/48/128 px
- Toolbar action button + popup options

### Changed
- Player layout approach: replaced `position: fixed` on `.html5-video-player` with theater-mode + `height: 100vh` on `#movie_player`. Works WITH YouTube's layout instead of fighting it.

## [0.1.0] - 2026-05-22

### Added
- Initial prototype
- Native button injection into YouTube's player controls
- Hardcoded `Shift+F` hotkey
- `Esc` to exit
- SPA navigation handling
- MV3 manifest, MIT license
