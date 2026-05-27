# Release & CI

The store release is driven by a **version bump on `main`**. Merge a PR that raises the
`version` in `manifest.json`, and CI publishes to Firefox, then Chrome, then cuts a
GitHub Release. No manual tag pushing.

## Branch protection

`main` is protected:

- Pull request required to merge (direct pushes rejected, admins included).
- 0 required approvals — a solo maintainer can self-merge.
- Required status checks: **Lint extension** and **Build .zip**.
- Force-pushes and branch deletion disabled.

Day-to-day work happens on `dev` / feature branches; releases are squash-merged into
`main`.

## The pipeline (`.github/workflows/ci.yml`)

On every push and PR:

- **Lint extension** — `web-ext lint`.
- **Build .zip** — `web-ext build`, uploaded as a workflow artifact.

On a push to `main` only:

- **Detect version bump** — compares `manifest.json`'s version against the pre-push
  commit. If unchanged (docs/refactor merges), the deploy chain is skipped.

When the version changed:

1. **Publish to Firefox (AMO)** — `web-ext sign --channel=listed`.
2. **Publish to Chrome Web Store** — uploads the built `.zip` via the Chrome Web Store
   API. Runs only after Firefox succeeds. Skips gracefully if Chrome secrets are absent.
3. **GitHub Release** — tags `v<version>` and attaches the signed unlisted `.xpi` plus
   the `.zip`. Fires on Firefox success; does not require Chrome.

## Required secrets

| Secret | Used by | Notes |
|--------|---------|-------|
| `AMO_JWT_ISSUER` | Firefox publish + unlisted signing | From addons.mozilla.org API credentials. |
| `AMO_JWT_SECRET` | Firefox publish + unlisted signing | |
| `CWS_EXTENSION_ID` | Chrome publish | Chrome Web Store item id. |
| `CWS_CLIENT_ID` | Chrome publish | Google OAuth client. |
| `CWS_CLIENT_SECRET` | Chrome publish | |
| `CWS_REFRESH_TOKEN` | Chrome publish | |

Set with `gh secret set <NAME> --repo MashdorDev/window-fullscreen-for-youtube`.

## Cutting a release

1. Open a PR that bumps `version` in `manifest.json` and adds a `CHANGELOG.md` entry.
2. Ensure Lint + Build pass, then squash-merge to `main`.
3. CI detects the bump and deploys. Watch the run; verify the new version on the store
   listing(s).

> The Chrome upload action is pinned to a commit SHA (not a moving tag) because it
> handles the store OAuth secrets.
