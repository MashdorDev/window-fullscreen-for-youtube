# Store Metrics

Where the numbers live, what each source will and will not give you, and how to pull
them by hand. The pull is deliberately manual; the reasons are in
[Why this is not automated](#why-this-is-not-automated).

## At a glance

| Metric | Store | Source | Auth | Scriptable |
|--------|-------|--------|------|-----------|
| Daily users, weekly downloads, rating | Firefox | Public API v5 | none | yes |
| Users by version, OS, locale, country | Firefox | Developer statistics JSON | site session cookie | with a stored cookie |
| Installs by referrer | Firefox | Developer statistics JSON | site session cookie | with a stored cookie |
| Total users, rating count | Chrome | Public listing page | none | yes, by scraping |
| Weekly users, installs, uninstalls | Chrome | Developer Dashboard | Google sign-in | **no** |
| Impressions, listing page views by source | Chrome | Developer Dashboard | Google sign-in | no, unless Google Analytics is enabled |

## Firefox

### Public API, no auth

```sh
curl -s https://addons.mozilla.org/api/v5/addons/addon/window-fullscreen-for-youtube/ \
  | jq '{users: .average_daily_users, weekly: .weekly_downloads, rating: .ratings, version: .current_version.version}'
```

Good enough for a trend line, and it needs no credentials, so it works from CI.
The same call against another add-on's slug gives the competitor's numbers.

> `average_daily_users` is a **lagging average**, not today's figure. On 26 August 2026
> it reported 52 while the developer dashboard showed 60 for the previous day. Do not
> mix the two in one chart.

### Developer statistics, session cookie only

The addons-server API documents 23 sections and none of them is statistics. What exists
are the undocumented endpoints the dashboard itself calls:

```
https://addons.mozilla.org/en-US/firefox/addon/<slug>/statistics/<metric>-day-<from>-<to>.json
```

`<metric>` is one of `usage`, `downloads`, `versions`, `os`, `locales`, `countries`,
`apps`, `sources`, `mediums`, `contents`, `campaigns`. Dates are `YYYYMMDD`. Each returns
an array, newest first, of `{date, count}` plus a `data` map for the breakdown metrics.

They answer 403 to an unauthenticated request. The AMO JWT keys in GitHub Actions do not
help: those authenticate the signing API only. The one thing that works is a logged-in
`sessionid` cookie, which is why this is a browser job.

`sources` is the one to watch. It attributes each install, and the values seen so far are
`addons.mozilla.org` (store search), `chatgpt.com`, and `(none)` for direct or
unattributed.

**Mozilla publishes no uninstall count at all.** Firefox retention can only be inferred
from installs against active users, never measured. Chrome is the only side that reports
removals.

## Chrome

### The API does not do analytics

The Chrome Web Store API covers `media/upload`, `publish`, `fetchStatus`,
`cancelSubmission` and staged rollout percentage. There is no endpoint for installs,
users, uninstalls or impressions, and no undocumented one worth relying on.

### The dashboard cannot be automated either

Chrome refuses to let any extension script `chrome.google.com/webstore/*`, which includes
the developer console. Any browser-automation tool built on an extension, Claude in Chrome
included, gets `The extensions gallery cannot be scripted` on both reads and screenshots.
Signing in does not change this. The numbers have to be read by a person and copied.

When copying, take a screenshot rather than selecting the text. The region, language and
OS charts serialise with their labels and values misaligned: a text copy on 26 August 2026
produced "weekly users by region: Sweden 66%" alongside "installs by region: United States
66%", which cannot both be true. The scalar totals copy fine.

### Google Analytics would fix half of it

The dashboard has an **Opt in to Google Analytics** control under Additional metrics. It
creates a GA4 property keyed to the extension id and records listing page views, a custom
install event fired when someone accepts the permission prompt, and UTM parameters. GA4 is
fully scriptable through the Data API with a service account.

That would make listing page views and referrers automatable, which is the half that
matters most right now. It would still not give uninstalls, weekly users or store
impressions. Data retention is two months, so it has to be pulled regularly rather than
backfilled. **Not currently enabled.**

## Why this is not automated

Decided 26 August 2026, after checking both APIs. Chrome's half cannot be scripted at any
price, and the Firefox half would need a stored session cookie that expires and has to be
renewed by hand, so a scheduled job would fail silently between renewals. That is the same
failure shape that cost this project two releases (see
[Release & CI](./release-and-ci.md), "History worth knowing"), and it is not worth
introducing for a monthly report.

Revisit if Google Analytics gets switched on, at which point the Chrome side becomes a
service-account API call and only Firefox needs a cookie.

## The monthly pull

1. **Firefox headline.** The `curl` above. No login.
2. **Firefox breakdowns.** Open
   `addons.mozilla.org/en-US/firefox/addon/window-fullscreen-for-youtube/statistics/`
   in a logged-in browser, then fetch the JSON endpoints from that page's context so the
   session cookie is sent. Take `usage`, `sources`, `versions`, `os`, `locales`,
   `countries`.
3. **Chrome.** Developer Dashboard, item `jghckcdnmagoohfbjplpfjbnbkpfcekl`, Analytics.
   Screenshot **Installs and uninstalls**, **Impressions**, and **Users**, last 30 days.
4. **Competitors.** Same public API call with their slug, plus their store listing for
   the Chrome user count.
5. Record the result. Compare against the baseline below.

## Baseline, 25 August 2026

Three months after launch, at 0.4.0.

| | Firefox | Chrome |
|---|---|---|
| Users | 60 daily | 87 weekly |
| Installs | 130 all time, 54 in August | 79 in 30 days |
| Uninstalls | not published | 5 in 30 days |
| Ratings | 1 at 5.0 | none |
| Top referrer | direct 25, AMO search 20, ChatGPT 9 (August) | ChatGPT, 79% of page views |

Two findings worth re-checking every time:

- **ChatGPT is the largest single referrer on both stores.** On Firefox it went from one
  install in July to nine in August. On Chrome it is 79% of everyone who reached the
  listing page. Store search contributes almost nothing on Chrome: 113 impressions in a
  month, growing 4% while installs grew 39%.
- **Chrome uninstalls are 6% of installs.** Retention is not the problem; discovery is.

## Also worth knowing

Firefox and Chrome count different things. Firefox reports **average daily users**, Chrome
reports **weekly users**. Weekly is always the larger number for the same population.
Never add them together, and never put them on one axis.
