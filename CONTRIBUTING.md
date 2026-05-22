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
- `web-ext build` — produces an `.xpi` artifact retained for 14 days

## Build locally

```sh
npx web-ext lint
npx web-ext build --overwrite-dest
```

Output goes to `web-ext-artifacts/`.

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
