# Contributing

## Branches

- **`main`** — stable, store-published, and **branch-protected**. Changes land only via
  pull request (direct pushes are rejected). A version bump merged here triggers the
  store deploy.
- **`dev`** — active development. Features and fixes land here first.

## Workflow

1. Create a branch from `dev` (or from `main` for release/CI changes):
   ```sh
   git checkout dev && git pull
   git checkout -b feature/my-feature
   ```
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`,
   `fix:`, `chore:`, `docs:`, `ci:`, etc. One logical change per commit.
3. Open a PR. **Lint extension** and **Build .zip** must pass (required checks).
4. Squash-merge.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR:

- **Lint extension** — `web-ext lint`, must be clean.
- **Build .zip** — `web-ext build`, uploaded as a 14-day artifact.

On a push to `main`, a **version bump in `manifest.json`** triggers the deploy chain:

1. **Publish to Firefox (AMO)** — `web-ext sign --channel=listed`.
2. **Publish to Chrome Web Store** — uploads the `.zip`; runs only after Firefox
   succeeds, and skips gracefully if Chrome secrets are absent.
3. **GitHub Release** — tags `v<version>` and attaches the signed unlisted `.xpi` and the
   `.zip`. Fires on Firefox success.

Merges that don't change the version (docs, refactors) run lint + build only.

Secrets (Settings → Secrets and variables → Actions):

- `AMO_JWT_ISSUER`, `AMO_JWT_SECRET` — from <https://addons.mozilla.org/developers/addon/api/key/>
- `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` — Chrome Web Store API

## Build locally

```sh
npx web-ext lint
npx web-ext build --overwrite-dest
```

Output goes to `web-ext-artifacts/`. File ignore patterns live in `web-ext-config.cjs`
(auto-loaded by web-ext — note the hyphen; `docs/` and `Assets/` are excluded from the
package).

## Releasing

You do **not** push tags manually. Open a PR that:

- [ ] Merges any pending `dev` work
- [ ] Bumps `version` in `manifest.json` (semver)
- [ ] Adds a `CHANGELOG.md` entry
- [ ] Passes `web-ext lint` + `web-ext build`

Squash-merge it to `main`; CI deploys to Firefox → Chrome → GitHub Release and creates
the `v<version>` tag automatically. Then verify the new version on the store listing(s).
