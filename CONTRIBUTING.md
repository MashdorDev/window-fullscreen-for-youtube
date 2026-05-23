# Contributing

## Branches

- **`main`** — stable. Every commit here is a release candidate. Tagged releases (`vX.Y.Z`) are cut from main and submitted to Firefox AMO, Chrome Web Store, and (in the future) Safari Extensions.
- **`dev`** — active development. Features and fixes land here first.

## Workflow

1. Create a feature branch from `dev`:
   ```sh
   git checkout dev
   git pull
   git checkout -b feature/my-feature
   ```
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `docs:`, etc.
3. Open a PR against `dev`.
4. After review, merge to `dev`.
5. When `dev` is stable and ready to ship, merge `dev` → `main`, bump the version in `manifest.json`, tag `vX.Y.Z`, build the `.xpi`, and upload.

## CI

GitHub Actions runs on every push to `main` / `dev` and every PR:
- `web-ext lint` — must pass 0 errors
- `web-ext build` — produces a `.zip` artifact retained for 14 days

Additionally on `v*` tag pushes:
- `sign-unlisted` — Mozilla-signs the build via `web-ext sign --channel=unlisted` and attaches the signed `.xpi` to the GitHub Release. This is the user installer.
- `deploy-amo-listed` — uploads to AMO's listed channel via `web-ext sign --channel=listed`. Has `continue-on-error: true` because this **fails when a version is already in AMO's review queue** (e.g., after a manual upload of the same version). The signed-unlisted job and release attachment still complete in that case.
- `release-zip` — attaches the unsigned `.zip` source bundle to the GitHub Release.

Secrets needed (Settings → Secrets and variables → Actions):
- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

Get them at https://addons.mozilla.org/en-US/developers/addon/api/key/ (Firefox Account required).

## Build locally

```sh
npx web-ext lint
npx web-ext build --overwrite-dest
```

Output goes to `web-ext-artifacts/`. File ignore patterns live in `web-ext.config.cjs`.

## Release checklist

- [ ] All changes merged from `dev` to `main`
- [ ] `manifest.json` `version` bumped (semver)
- [ ] `web-ext lint` clean
- [ ] `web-ext build` succeeds
- [ ] Tag pushed: `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`
- [ ] GitHub Release created (`gh release create`) with the `.xpi` attached
- [ ] AMO listing updated with new version
- [ ] Chrome Web Store listing updated (when published)
- [ ] Safari Extension submission updated (when published)
