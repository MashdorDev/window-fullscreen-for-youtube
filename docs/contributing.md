# Contributing

## Project shape

Plain JavaScript, Manifest V3, **no build step and no runtime dependencies**. You edit
the source files and load the extension directly. Tooling is just `web-ext` for lint and
packaging.

## Local development

```sh
# Lint (must be clean — CI requires it)
npx web-ext lint

# Build a .zip into web-ext-artifacts/
npx web-ext build --overwrite-dest

# Run in a scratch Firefox with live reload
npx web-ext run
```

Ignore patterns live in `web-ext.config.cjs`. To load unpacked in Chrome: `chrome://extensions`
→ Developer mode → **Load unpacked** → select the repo root.

## Branches & PRs

- **`main`** — stable, store-published, and **branch-protected**: changes land only via
  pull request (direct pushes are rejected). A version bump merged here triggers the
  store deploy — see [Release & CI](./release-and-ci.md).
- **`dev`** — integration branch for active development.

Workflow:

1. Branch from `dev` (or `main` for release/CI changes): `feature/…`, `fix/…`, `ci/…`.
2. Commit with [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`,
   `fix:`, `chore:`, `docs:`, `ci:`, etc. One logical change per commit.
3. Open a PR. **Lint extension** and **Build .zip** must pass.
4. Squash-merge.

## Releasing

You do **not** push tags manually. Open a PR that bumps `version` in `manifest.json` and
adds a `CHANGELOG.md` entry; merging it to `main` runs the deploy chain (Firefox → Chrome
→ GitHub Release) and auto-creates the `v<version>` tag. Full details and the required
secrets are in [Release & CI](./release-and-ci.md).

## Where things live

See [Architecture](./architecture.md) for the file map and how the content script,
CSS marker classes, and options page fit together.
