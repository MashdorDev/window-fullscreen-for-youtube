# Release & CI

The store release is driven by a **version bump on `main`**. Merge a PR that raises the
`version` in `manifest.json`, and CI publishes to Firefox, then Chrome, then cuts a
GitHub Release. No manual tag pushing.

## Branch protection

`main` is protected:

- Pull request required to merge (direct pushes rejected, admins included).
- 0 required approvals — a solo maintainer can self-merge.
- Required status checks: **Unit tests**, **Lint extension**, and **Build .zip**.
- Force-pushes and branch deletion disabled.

Day-to-day work happens on `dev` / feature branches; releases are squash-merged into
`main`.

## The pipeline (`.github/workflows/ci.yml`)

On every push and PR:

- **Unit tests** — `npm test` (`node --test`).
- **Lint extension** — `web-ext lint`.
- **Build .zip** — `web-ext build`, uploaded as a workflow artifact. Needs both of the
  above.

On a push to `main` only:

- **Detect version bump** — compares `manifest.json`'s version against the pre-push
  commit. If unchanged (docs/refactor merges), the deploy chain is skipped.

When the version changed:

1. **Publish to Firefox (AMO)** — `web-ext sign --channel=listed`.
2. **Publish to Chrome Web Store** — uploads the built `.zip` via the Chrome Web Store
   API. Runs only after Firefox succeeds. Skips gracefully if Chrome secrets are absent.
3. **GitHub Release** — tags `v<version>` and attaches the Mozilla-signed `.xpi` plus
   the `.zip`. Fires on Firefox success; does not require Chrome.

   The `.xpi` is **downloaded from AMO**, not signed a second time. Step 1 already signed
   this version on the listed channel, and AMO allows a version number to exist exactly
   once per add-on regardless of channel, so signing it again as unlisted comes back
   `Version X already exists`. The job polls the public API
   (`/api/v5/addons/addon/<gecko-id>/`) until `current_version.version` matches, then
   downloads `current_version.file.url`. That file is byte-for-byte what users install
   from AMO.

   If AMO has not served the version within ten minutes the step warns and the release is
   published without the `.xpi`. Both store deploys have already succeeded by then, so a
   missing installer should not turn a good release red.

## Required secrets

| Secret | Used by | Notes |
|--------|---------|-------|
| `AMO_JWT_ISSUER` | Firefox publish | From addons.mozilla.org API credentials. |
| `AMO_JWT_SECRET` | Firefox publish | |
| `CWS_EXTENSION_ID` | Chrome publish | Chrome Web Store item id. |
| `CWS_CLIENT_ID` | Chrome publish | Google OAuth client. |
| `CWS_CLIENT_SECRET` | Chrome publish | |
| `CWS_REFRESH_TOKEN` | Chrome publish | Only survives long-term if the Google OAuth consent screen is **In production**. In *Testing* it expires after 7 days and `deploy-chrome` fails on auth. |

Set with `gh secret set <NAME> --repo MashdorDev/window-fullscreen-for-youtube`.

## Cutting a release

1. Open a PR that bumps `version` in `manifest.json` and adds a `CHANGELOG.md` entry.
2. Ensure Lint + Build pass, then squash-merge to `main`.
3. CI detects the bump and deploys. Watch the run; verify the new version on the store
   listing(s).

> The Chrome upload action is pinned to a commit SHA (not a moving tag) because it
> handles the store OAuth secrets.

## History worth knowing

Two failure modes have already cost this project a release, both of the same shape: a
deploy step failing quietly.

- **0.2.4 / 0.2.5 never reached AMO.** The old tag-driven job ran with
  `continue-on-error: true`, so upload failures were swallowed and the store sat on 0.2.3
  while tags said otherwise. That flag is gone; do not reintroduce it on a publish step.
- **0.2.6 and 0.3.0 got no GitHub Release.** The release job re-signed an
  already-signed version as unlisted and exited 1 on every run from the May rework until
  it was fixed. Nobody noticed because the store deploys ahead of it were green.

The lesson both times: a red publish step is useful, a silent one is not. Check the whole
run, not just the store listing.
