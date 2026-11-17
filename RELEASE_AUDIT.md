# Release audit

Baseline on 2026-11-15. Extension version 1.1.0, engine 2.0.0, weights 2.0.0. This is an inventory with measurements, not a release verdict. **Not release-ready.**

A row is done only when a test name or a command output from this date is cited. Historical comments inside tests are marked as such.

## Open items, in the order to work them

| Pri | Item | Why it blocks a release |
|-----|------|-------------------------|
| P1 | Permission review | Written 2026-11-15. No permission moves. Applying the optional-permission candidates still needs a yes. See “Permission proposal”. |
| P1 | `THREAT_MODEL.md` matched the code | Updated 2026-11-15. See “Threat model alignment”. |
| P2 | Current attack variants | AiTM, device-code and OAuth-consent phishing, passkey downgrade, FileFix and later ClickFix variants, current wallet delegation types, prompt injection against browser agents. Page text for install docs, captcha notices, an out-of-date banner, Win+R help, and a ClickFix write-up is measured: 22 snapshots, 32 copy buttons, 0 warnings (`tests/security/page-text.test.ts`, 2026-11-16). The other variants still have no corpus. |
| P2 | Password reuse, logo hash, card skimmers | Not started. Each needs a written plan before code, because the first changes the privacy promise and the third needs a checkout corpus. |
| P3 | No performance budget test | No assertion on milliseconds per navigation, service-worker start, or content-script cost. A comment in git history mentions an impersonation cache (4.5 ms → 1.6 ms). That number was not remeasured on 2026-11-15. |
| P3 | Accessibility of popup, warning page, and dashboard | Not measured (keyboard, names, contrast, dark mode). |
| P3 | Manual checklist | `tests/manual/CHECKLIST.md` updated with the warning-page report. A person did not click through it on 2026-11-15. Overlap with E2E is noted in that file. |
| P4 | Supply chain and reproducible zip | `npm audit`, action SHA pins, and “same commit → same zip” are not measured. |
| P5 | Store listing vs behavior | `STORE_LISTING.md` was updated for the public false-alarm issue. A full single-purpose and privacy-form pass against the dashboard text is still open. Policies read 2026-11-15: [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [MV3 remote code](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements). Remote executable code is forbidden; remote JSON data is allowed. The live feed is signed JSON, not code. |

`minimum_chrome_version` is 114. The manifest enables 7 static rulesets. Before Chrome 120 the cap was 10 enabled rulesets (same DNR page). No raise is required for the current manifest.

## P0 measurement, 2026-11-15

Commands:

```
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
$env:FUNDAMENT_E2E_BROWSER="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"; npm.cmd run test:e2e
```

| Command | Result |
|---------|--------|
| typecheck | pass |
| lint | pass |
| `npm test` | 31 files, **257 tests**, pass |
| E2E (Edge) | **11 tests**, pass, including the new false-alarm report |

`tests/security/corpus.test.ts` passed. What it enforces, and what it does not print:

| Corpus | Assertion in the test | Exact count this run |
|--------|------------------------|----------------------|
| Majestic 1–10,000 (`tests/fixtures/popular-top10k.txt`, n > 9000) | home warnings ≤ 0.1 %, login warnings ≤ 0.2 %, login band high/critical = 0 | not printed |
| Majestic 100,001–110,000 (`tests/fixtures/longtail-sample.txt`, n > 9000) | same ceilings, login high/critical = 0 | not printed |
| 3,000-host sample of `filters/feeds/phishing-hosts.txt`, analyzed as if unlisted | URL-only warn/fail > 4 %, with a login form > 28 %, popular-signal rate < 0.2 % | not printed. A comment in the test says the 2026-11-12 run was 5.8 % and 34 % |

Store package, after the unit run, without a second non-store build:

| Step | Result |
|------|--------|
| `npm run pack` | `fundament-store.zip`, 4,196,942 bytes, SHA-256 `3a597b60c1b8568015b1183d5ab5119202a6ec55657cb7f665915eb4d7a237a0`. That pack set `VITE_STORE_PACK=1` with no `VITE_PAY_ORIGIN`, so the build deleted `externally_connectable`. `scripts/pack-store.mjs` exits if localhost is still present. It does not delete the key itself. |
| `npx playwright test` on that `dist/`, Edge | 11 passed. This loaded the store build. The zip omits `.map` files; the scripts are the ones just packed. |
| `node scripts/store-screenshots.mjs` on that `dist/` | Wrote `store-assets/screenshots/{de,en}/`. Looked at DE and EN warning, DE protected, DE dashboard. |

Screenshot notes from that look: the warning page shows the full report link (“Fehlalarm melden” / “Report a false alarm”) with the three actions above it; nothing is clipped at 1280×800. German copy on that page uses “du” (“meldet dich”). The dashboard shot is scrolled to the phishing list, so the new “Verpasstes Phishing melden” link in the header is not in frame. The protected popup shows “1 Tracker-Anfrage(n)”, which is awkward German and is unchanged by this phase (P3 copy).

A person did not click `tests/manual/CHECKLIST.md`. The new warning-page items overlap the E2E test named below.

## Message gate, 2026-11-15

`src/shared/messageGate.ts` rebuilds every runtime message. `tests/unit/message-gate.test.ts` covers all 27 client message types. A web-tab sender is refused for every type except `PAGE_CHECK` and `SEARCH_MARK`. Those two require a tab and an `http` or `https` URL. A sender with no id and no URL is refused for `UPDATE_SETTINGS`. A type that exists only on the prototype is refused. An `UPDATE_SETTINGS` patch keeps `threatProtection` and drops `licenseToken`, `localAnalysis`, and an enumerable `__proto__` payload. Page-check kinds are capped and filtered to the catalog. `javascript:` search targets are dropped. `OPEN_SETTINGS_PAGE` accepts `chrome://settings/security` and rejects `chrome://flags` and `https://evil.example/`. External activation accepts `ACTIVATE_LICENSE` only when the sender origin is in the allowed list; `UPDATE_SETTINGS` from that origin is refused. The worker calls `activateLicense` directly and does not forge a trusted sender.

Commands after that change: typecheck pass, lint pass, `npm test` 32 files / **266 tests** pass (corpus ceilings unchanged), Edge E2E **11** pass.

## Content-script isolation, 2026-11-15

Chrome's content-script page ([isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [manifest `world`](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts), fetched 2026-11-15) says the MAIN world is shared with the page, and the page can interfere with it. `document_start` runs before page scripts ([RunAt](https://developer.chrome.com/docs/extensions/reference/api/extensionTypes)).

`tests/unit/content-isolation.test.ts` loads the real `walletBridge.ts` and `pageChecks.ts`. After the bridge installs, replacing `clipboard.writeText`, `Clipboard.prototype.writeText`, `DataTransfer.prototype.setData`, or `ethereum.request` still vets the command or still uses the confirm captured at start. A forged `postMessage` with `UPDATE_SETTINGS`, `login-form`, or an inherited `__fundament` does not leave the tab. `clickfix-clipboard` as an own property does, and the payload is only that kind. A `document.cookie` value `super-secret-cookie` is not in the message. `pageChecks.ts` has no `.value` read and no clipboard read. The fake address bar is taken from the HTML `value` attribute.

Commands after that change: typecheck pass, lint pass, `npm test` 33 files / **271 tests** pass (corpus ceilings unchanged), Edge E2E **11** pass, including the ClickFix clipboard case and the installer copy that must stay untouched.

False-alarm report, independent review before commit `cf8e751`: a public issue could have included `127.0.0.1.nip.io` because `.io` is a real public suffix. Fixed by reusing `looksLikeDnsRebindHost`. Evidence: `tests/unit/false-positive-report.test.ts` (“has no report link for local names, private addresses, or hosts outside the public suffix list”) expects null for `127.0.0.1.nip.io`, `192.168.1.5.sslip.io`, and `10-0-0-1.localtest.me`. The same test checks that a URL with userinfo, path, query token, and fragment does not appear in the GitHub URL, and that the URL origin and path equal `https://github.com/` + `REPORT_GITHUB_REPO` + `/issues/new`.

## ReDoS bounds, 2026-11-15

V8’s extra non-backtracking RegExp engine does not run for patterns with the `i` flag, lookaheads, or large counted repetitions ([v8.dev, “An additional non-backtracking RegExp engine”](https://v8.dev/blog/non-backtracking-regexp), fetched 2026-11-15). Fundament’s attacker-facing patterns use `i` or a lookahead (`HOST_RE`), so they stay on the backtracking engine. None of the current patterns is nested in the exponential shape `(a+)+`. A direct timing of the live-feed host expression on two million `a`s, and of the QR expression on two million `a`s, finished in 0.8 ms and 6.0 ms on this machine before the caps. That measurement is not a guarantee for a future pattern.

Caps applied before matching: URL 4096 (`parseHttpUrl` / `sessionIdInUrl`), feed host 253, quishing resource and content-script `src` 2048, page-script and DOM-XSS sources keep their existing 50 000 / 80 000 ceilings, prompt text 8000, cookie header 8192 and 40 names, cookie name 128, CSP 4000, field-name blob 240, filename suffix 180–512, worker URL 300, ClickFix command 12 000. `tests/security/redos.test.ts` (“regex time budget on attacker-sized input”) asserts each of those paths finishes in under 100 ms and that a real ClickFix command, a `qrserver` URL with a long query, a session id in a normal URL, and `report.pdf.html` at the end of a long filename still match.

Commands after that change: typecheck pass, lint pass, `npm test` 34 files / **276 tests** pass (corpus ceilings unchanged), Edge E2E **11** pass. The ReDoS file itself finished in 35 ms.

## Storage migration, 2026-11-15

Chrome fires `runtime.onInstalled` with `reason: "update"` when the extension package is replaced ([runtime.onInstalled](https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onInstalled), fetched 2026-11-15). `chrome.storage.local` survives that update. The service worker then runs `boot`, which now calls `healStoredSettings` before network rules are built.

There is no 1.0 settings file in this repository (`git log` for `src/storage/settings.ts` starts at the 1.1.0 baseline). The 1.0 blob in the test is the shape the audit asked for: a top-level `enabled: false` plus an `allow` list. Those flags are not the current switches, so they do not turn protection off.

`tests/unit/storage-migration.test.ts`:

| Blob | Result |
|------|--------|
| 1.0 `{ enabled: false, phishing: false, allow: ["com", "bank.example", "*"] }` through `healStoredSettings` | threat, phishing, page checks, downloads, live feed on. Allowlist is `bank.example` only. The healed object is what gets written. |
| Broken `null`, `"nope"`, `[]`, `{ threatProtection: "false" }` | protection on |
| Manipulated settings object whose `threatProtection: false` is only on the prototype, plus allowlist `com`, `github.io`, `co.uk`, `*.com`, `paypal.com`, and an own `phishingProtection: false` | inherited off switches ignored, suffix entries dropped, `paypal.com` kept, explicit phishing boolean kept |

A boolean `false` stored under the current key is a user choice and is not forced back on. `chrome.storage` is extension-specific ([storage](https://developer.chrome.com/docs/extensions/reference/api/storage), fetched 2026-11-15): this extension's service worker and content scripts can read it, and a page cannot. A content script of this extension could still write a boolean `false`. The page-check script also ignores an allowlist entry with no dot or with `*`, so a `com` entry does not skip page checks even before the rewrite finishes.

Commands after that change: typecheck pass, lint pass, `npm test` 35 files / **279 tests** pass (corpus ceilings unchanged), Edge E2E **11** pass.

## Feed rules in the browser, 2026-11-15

Compiled file from this tree, counted before the browser run: `dist/rules/threats-feed.json` has **49** rules. Rule id 1 is the first chunk. Rule id **49** holds **1,353** hosts. Its first host is `www-robinhood-com-login-guide.typedream.app`. Its last host is `zzzzzzbxxxx.weebly.com`. Chrome’s DNR reference (fetched 2026-11-15) states no numeric cap on `requestDomains` length. That is not the same as the browser applying the last entry.

`tests/e2e/live.spec.ts` “a host in the last shipped phishing-feed rule is redirected” loads both of those hosts through Edge with `--host-resolver-rules=MAP * 127.0.0.1`. Both must land on `warning.html?blocked=feed`.

`tests/security/live-feed.test.ts` “turns live hosts into warning-page redirects within the dynamic rule budget” pins `DYNAMIC_RULE_ID_LIVE_START` at 80000. 2,500 hosts become rules 80000, 80001, and 80002. The first host of 80000 is `kit0.example`. The last host of 80002 is `kit2499.example`.

`tests/e2e/live.spec.ts` “a dynamic rule at the live-feed id redirects only its own host” installs one dynamic redirect at that id for `live-rule-probe.example`. `live-rule-other.example` must stay on `/clean` while the rule exists. After `removeRuleIds` of that id, `live-rule-probe.example` must stay on `/clean` too.

Commands after that change: typecheck pass, lint pass, `npm test` 35 files / **279 tests** pass (corpus ceilings unchanged; the new assertions sit inside the existing live-feed test), Edge E2E **13** pass. The last-rule navigation and the id-80000 navigation both passed. Two hosts in a 1,353-host rule were loaded, not the other 1,351.

## Permissions

Source: `src/manifest.json`. Justification text: `PRIVACY.md`, `STORE_LISTING.md`. Wiring test: `tests/unit/layer-v2.test.ts` “manifest wiring” (bridge world, feed ruleset enabled, extended trackers off). No permission was added or removed for the false-alarm report. `tabs` was already declared; the report uses `chrome.tabs.create`.

| Permission | Role | Status |
|------------|------|--------|
| `storage` | Settings, lists, events, feed state | used, see storage table |
| `tabs` | Active tab URL, warning page, confirmed GitHub tab, settings pages | used |
| `webNavigation` | Main-frame analysis before commit | used |
| `declarativeNetRequest` | Tracker, threat, and feed rules | used |
| `declarativeNetRequestFeedback` | Matched-rule counts for the popup | used |
| `declarativeNetRequestWithHostAccess` | GPC/DNT and tracking-parameter stripping | used |
| `alarms` | Feed, posture, retention | used |
| `downloads` | Hold a download until the verdict | used; E2E cancels an HTTP program |
| `privacy` | WebRTC, prefetch, hyperlink auditing | used when the toggle is on |
| `contextMenus` | Allow, block, pause | used |
| `notifications` | Download block, extension permission change | used |
| `contentSettings` | Optional notification-prompt block, off by default | used |
| `management` | Other extensions’ names and permissions | used; `tests/unit/layer-v2.test.ts` “extension supply-chain watch” |
| `scripting` | Fingerprint shield only while that toggle is on | used |
| Host `http://*/*`, `https://*/*` | Page checks, DNR redirects, optional reputation POST | used |

`optional_permissions` is empty. The proposal below does not change the manifest.

## Permission proposal, 2026-11-15

Not applied. Moving a permission needs an explicit yes. Sources fetched the same day: [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions), [permission list](https://developer.chrome.com/docs/extensions/reference/permissions-list).

`permissions.request()` runs from a user gesture. These names cannot be optional: `debugger`, `declarativeNetRequest`, `devtools`, `geolocation`, `mdns`, `proxy`, `tts`, `ttsEngine`. `contentSettings`, `privacy`, `scripting`, and `management` are not on that list, so Chrome allows them as `optional_permissions`.

Install warnings from that list, for the permissions this extension declares:

| Permission | Warning on the list | Keep required because |
|------------|---------------------|------------------------|
| `contentSettings` | “Change your settings that control websites' access to features such as cookies, JavaScript, plugins, geolocation, microphone, camera etc.” | Only `blockNotificationPrompts`, default **false** (`src/storage/settings.ts`). Candidate to move, not moved. |
| `privacy` | “Change your privacy-related settings.” | `hardenBrowser` defaults **true** and `applyBrowserHardening` runs on every boot. Optional would skip WebRTC, prefetch, and hyperlink auditing until a click. That is a protection drop for the default install. |
| `scripting` | No warning text on the list. | `fingerprintShield` defaults false and the script is registered only while the toggle is on. Moving it removes no install warning and adds a runtime prompt. |
| `management` | “Manage your apps, extensions, and themes.” | `checkExtensions` runs from `boot` on every start (`src/background/index.ts`), not behind a toggle. Optional would stop that watch until a grant. |
| `declarativeNetRequest` | “Block content on any page.” | On the cannot-be-optional list. |
| `declarativeNetRequestFeedback` | “Read your browsing history.” The same page says this permission is for unpacked extensions and is ignored for Chrome Web Store installs. | `getMatchedRules` in `src/network/dnr.ts` uses it. Whether store installs still return matched rules is **nicht bestätigt**. Do not remove it on that guess. |
| `downloads` | “Manage your downloads.” | Holds a download until the verdict. E2E cancels an HTTP program. |
| `notifications` | “Display notifications.” | Download block and extension-permission change. |
| `tabs` | “Read your browsing history.” The warnings page says the `tabs` warning does not show when the extension also has broad host access. | Active-tab URL and the warning page. |
| `webNavigation` | “Read your browsing history.” | Main-frame analysis before commit. |
| `alarms`, `contextMenus`, `storage` | No warning text on the list. | Core: feed timer, site menu, settings. |
| `declarativeNetRequestWithHostAccess` | No separate warning line on the list. | Header and tracking-parameter rules. |
| Host `http://*/*`, `https://*/*` | The fetched list page did not include a host-permission warning sentence in the returned text. Not quoted. | Content scripts and DNR redirects. Optional host access would leave page checks off until each origin is granted. |

Recommendation, still not applied: leave every current permission required. The only names that are both optional-capable and unused at boot are `contentSettings` and `scripting`. `contentSettings` is the only one of those that removes an install warning. `scripting` does not. `privacy` and `management` stay required because the features they back are on without an extra click.

If a later yes moves `contentSettings`: request it from the options toggle’s click, leave the toggle off when `permissions.request` returns false, and do not treat a missing API as “prompts blocked”. Edge 157 kept the grant; branded Chrome 158 is still **nicht bestätigt**. See “contentSettings update, 2026-11-17”.

Commands after that review: typecheck pass, lint pass, `npm test` 35 files / **279 tests** pass (corpus ceilings unchanged), Edge E2E **11** pass. Manifest permissions unchanged.

`externally_connectable` in source matches only the local pay server. With `VITE_STORE_PACK=1` and no https `VITE_PAY_ORIGIN`, the build deletes the key (`src/billing/connectable.ts` returns null). `scripts/pack-store.mjs` then exits if localhost is still present.

## Threat model alignment, 2026-11-15

`THREAT_MODEL.md` used to say there is no `externally_connectable` and that DNR never redirects. Both sentences were false for this tree.

The elevation row now matches `storeConnectableMatches`: unpacked builds keep `http://127.0.0.1:8787/*` and `http://localhost:8787/*`. A store pack keeps a single `https` pay origin, or no key. External messages stay `ACTIVATE_LICENSE` only (`tests/unit/message-gate.test.ts`). The DNR row now says redirect goes to `/warning.html?blocked=feed` or `blocked=user`, which Edge enforced in the feed tests above.

No scoring change. Commands after that edit: typecheck pass, lint pass, `npm test` 35 files / **279 tests** pass (corpus ceilings unchanged), Edge E2E **13** pass.

`web_accessible_resources` is `warning.html` for `<all_urls>`, without `use_dynamic_url`. A site can probe that URL and learn the extension is installed. Documented in `PRIVACY.md`. The manifest test asserts `use_dynamic_url` is unset, so this fingerprint is current behavior, not an accident of a missing key.

CSP for extension pages: `script-src 'self'; object-src 'self'; frame-ancestors 'none'`.

## Network requests

Nothing in this table is a new background request from the false-alarm report. That report is a user-confirmed `chrome.tabs.create` to GitHub.

| Request | When | What leaves the device | Test |
|---------|------|------------------------|------|
| `GET` live-feed URL (build-time `VITE_LIVE_FEED_URL`, off when unset) | at most every 6 h, toggle on | no cookie, no browsing data; the host sees the IP | `tests/security/live-feed.test.ts` “live feed trust” (signature, freshness, client filter). The test does not perform the HTTP GET |
| `GET https://versionhistory.googleapis.com/v1/chrome/platforms/<platform>/channels/stable/versions/all/releases?filter=endtime=none&pageSize=50` | at most every 6 h | platform string only | `tests/unit/layer-v2.test.ts` “chrome staged rollout”, “browser posture” |
| `GET https://api.pwnedpasswords.com/range/<5 hex chars>` | user presses Check | SHA-1 prefix, padding header | `tests/unit/dashboard-modules.test.ts` “HIBP k-anonymity helpers” |
| `POST` reputation URL (default `http://127.0.0.1:8787`) | only if online reputation is on | scheme + host | `tests/unit/http-provider.test.ts`, `tests/unit/privacy-storage.test.ts` “privacy sanitizer” |
| Pinned filter-pack and IOC URLs | user sets an HTTPS URL and a SHA-256 pin | no browsing data | `tests/unit/filters.test.ts` “pinned host pack”, `tests/unit/depth-layers.test.ts` “IOC feeds” |
| Pay-host license status | Pro, configured pay origin | Stripe session or subscription id, not the page URL | `tests/unit/billing-live.test.ts` |
| GitHub `issues/new` | second click on the warning page, or the settings link | hostname, catalog signal ids, three version strings; or, from settings, no hostname | `tests/unit/false-positive-report.test.ts`, `tests/e2e/live.spec.ts` |

Telemetry has no endpoint (`PRIVACY.md`). No test fetches a telemetry URL because there is nothing to fetch.

## Data kept on the device

| Key | Store | Contents | Test |
|-----|-------|----------|------|
| `settings` | `local` | toggles, allow/block hosts, license token, feed URLs and pins. Parser drops unknown shapes back to defaults | `tests/unit/privacy-storage.test.ts` “settings parser” |
| `events` | `local` | time, event type, host, optional score. Cap 200, 7 days | same file, “event prune” |
| `lifetime` | `local` | counters | `tests/unit/fortress.test.ts` “lifetime stats” |
| `installFingerprint`, `integrityStatus` | `local` | install fingerprint | `tests/unit/depth-layers.test.ts` “self-tamper fingerprint” |
| `reputationCache` | `local` | origin verdicts when online reputation is on | not separately asserted in this audit |
| `iocState`, filter-pack hosts and status | `local` | pinned feed metadata | IOC and pack tests above |
| tab analysis | `session` | full URL and signals for the open tab. Cleared when the browser closes | architecture; no migration test |
| pauses | `session`, else `local` | host and expiry | `tests/unit/fortress.test.ts` “pauses” |

Typed values, cookie values, and the user’s own clipboard are not in these records. Page text used for ClickFix and tech-support wording is not stored. That is the design in `PRIVACY.md`. `tests/unit/content-isolation.test.ts` checks that `pageChecks.ts` does not read `.value` or the clipboard, and that a cookie value in `document.cookie` is not in the message sent to the worker.

`chrome.storage.sync` is not used.

## Protections

| Protection | Status | Evidence |
|------------|--------|----------|
| URL and domain heuristics, homoglyphs, bidi | measured | `tests/unit/analyze.test.ts`, `tests/unit/homograph.test.ts`, `tests/unit/report.test.ts`, `tests/security/url-payloads.test.ts` |
| Brand impersonation, including page title on credential pages | measured | `tests/unit/impersonation.test.ts`, `tests/unit/layer-v2.test.ts` “brand named on the page”; E2E Microsoft claim |
| Combination scoring | measured | `tests/unit/layer-v2.test.ts` phishing corpus. Single weak hints do not warn: false-positive corpus in the same file |
| Phishing feed redirect before load | partial | file count above; one live redirect in E2E |
| Signed live feed | measured for the trust rules, not for the HTTP GET | `tests/security/live-feed.test.ts` |
| ClickFix clipboard replacement | measured | `tests/unit/clickfix.test.ts`; E2E fake captcha. User copy of an installer one-liner on a normal page is left alone (E2E) |
| Wallet drainer confirm, address swap | partial | bridge and engine tiers are kept in sync (`tests/unit/layer-v2.test.ts` “ClickFix tiers” also checks the bridge copy). No E2E drives a wallet provider |
| Browser-in-the-browser, tech-support scam, hidden autofill | partial | page-signal tests in `tests/unit/depth-layers.test.ts` and `tests/unit/dashboard-modules.test.ts`. No E2E |
| Extension permission escalation | measured | `tests/unit/layer-v2.test.ts` “extension supply-chain watch” |
| Browser posture | measured | same file, “browser posture”. Safe Browsing is only reported in Google Chrome |
| Downloads | measured | `tests/unit/extra-protection.test.ts`, `tests/unit/layer-v2.test.ts` “downloads”; E2E HTTP program |
| Search-result marks, href not rewritten | partial | `tests/unit/search-hits.test.ts`. No E2E on a real SERP |
| Trackers, ads, HTTPS upgrade, tracking params, GPC | partial | rule files covered by `tests/unit/fortress.test.ts` “static rulesets” and `tests/unit/filters.test.ts`. No count of blocked trackers on a live news site |
| False-alarm and missed-phish reports | measured | tests named in the P0 section. Public GitHub issues. Local, private, and rebind names have no warning-page link |
| Password reuse, perceptual logo hash, card skimmers | open | README “Not implemented” for skimmers. No code |

## Out of scope for an extension

Chrome does not give an extension TLS certificates, live DNS answers, or HttpOnly cookie flags. OS malware, infostealers, and kernel bugs are outside this product. The UI must not say those are covered. `THREAT_MODEL.md` already says the residual risk; that paragraph still matches the code.

## Whole-page measurement, 2026-11-17

`scripts/measure-page-signals.mjs` loads `dist/` in Edge and opens public pages on the real network. It is not in CI. The raw file is `measure-output/page-signals.json` and is gitignored. This summary has counts, signal names, and hostnames only.

| | |
|---|---|
| Date | 2026-11-17 |
| Pages | 629 (22 corpus, 107 install and support, 500 homepages) |
| Measured | 536 |
| Not measured | 93 (55 no tab record, 26 network errors, 12 timeout or a closed browser). Not counted as clean. |
| Warnings | 1 |
| Copy buttons clicked | 32, of which 1 warned |

The warning is `clickfix-unseen` on `berkeley-humanoid-lite.gitbook.io`. The click was a button whose name is only “Copy”. The stored excerpt of that page already contains the install command, and the excerpt test does not warn. The live page did. These 629 pages were not opened again. The cause is under “GitBook copy, 2026-11-17”.

Page signals that can replace the page, on the 536 measured pages:

| Signal | Seen | Warned |
|---|---|---|
| clickfix-clipboard | 0 | 0 |
| clickfix-unseen | 1 | 1 |
| tech-support-scam | 0 | 0 |
| prompt-injection | 0 | 0 |
| browser-in-browser | 0 | 0 |
| keyboard-lock | 0 | 0 |
| clipboard-hijack | 0 | 0 |

Other page signals were present and did not warn: `fingerprint-canvas` 55, `permission-bait` 20, `fingerprint-audio` 10, `malvertising-chain` 8, `dom-xss` 5, `prototype-pollution` 4, `login-form` 4, `cookie-flags` 4, `obfuscated-js` 1, `miner-wasm` 1, `weak-csp` 1. `shortener` (URL signal) was seen 4 times and did not warn.

The README does not describe this as a measured false-alarm rate for page signals. Weights unchanged. No new permission and no new network request from the extension.

Same run: typecheck, lint, 293 tests, URL-corpus ceilings unchanged, Edge E2E 40.

## contentSettings update, 2026-11-17

The three declined detectors stay declined. `contentSettings` is still the only permission that may become optional. The manifest was not changed, because branded Chrome did not finish the same test.

A dedicated profile, not the daily one, installed a copy of `dist/` at 1.1.0 with `contentSettings` required. The notification toggle was stored on, and the notifications setting was set to block. The same folder was then written as 1.1.1 with that name only in `optional_permissions`, and the profile was opened again.

| Browser | What happened |
|---|---|
| Edge 157.0.4341.60 | The unpacked id stayed, the extension stayed enabled, `permissions.contains(["contentSettings"])` stayed true, `chrome.contentSettings` stayed an object, and the toggle stayed on. No prompt was required. |
| Chrome 158.0.8127.37 | `--load-extension` is ignored on branded Chrome (removed in Chrome 137; the feature-flag workaround has been gone since Chrome 142). `Extensions.loadUnpacked` returned an id. The only targets were the browser UI and a page. No service worker started, and the id was not written into the profile. The grant was not measured. |

`privacy`, `scripting`, and `management` stay required. `tests/e2e/scenarios.spec.ts` still expects `contentSettings` in `permissions`.

Same run: typecheck, lint, 293 tests, URL-corpus ceilings unchanged, Edge E2E 40. Docs only.

## GitBook copy, 2026-11-17

The copy button on `berkeley-humanoid-lite.gitbook.io` wrote 48 lines (2 877 characters). 18 of those lines are in the page text. The install line is one of them, in a readable light-DOM span below the fold. It is not in a shadow root. The other lines are not in the page text. The excerpt stored only the install line, so the excerpt test treated it as shown. The bridge asked whether the whole clipboard string was shown, so it reported `clickfix-weak`, and the worker turned that into `clickfix-unseen` on a user site on a hosting zone.

A weak clipboard is now shown when every weak line is readable. Lines that are not commands do not have to be on the page. A strong command is still judged on the whole string first. A weak line the page does not show still warns. The host is not special-cased. The 629 pages were not opened again, so the README still must not call page-signal false alarms measured.

Red first, on the build from `2b783fd`: a `github.io` page that shows the install line and copies it inside two extra lines went to `warning.html`. The same longer copy with the line absent also went to `warning.html`. After the change the first page stays up and the second still warns.

Weights unchanged. No new signal.

Same run: typecheck, lint, 293 tests, URL-corpus ceilings unchanged, Edge E2E 42.

## Shell forms, 2026-11-17

`clickFixTier` returned null for `/bin/bash -c "$(curl …)"`, `zsh -c "$(curl …)"`, `wget … | bash`, and `curl -o … && chmod +x … && /tmp/…`. `curl … | bash` was already weak. With no tier, the bridge does not block, including on a page that says Cmd+Space.

Quoted as text: CloudSEK’s clipboard line is `/bin/bash -c "$(curl -fsSL …/install.sh)"` and the line says Cloudflare 2025. ThreatDown quotes the same shape. Garrett Stimpson, 1 June 2026, quotes `bash <(curl …)`. Forcepoint and Emsisoft quote `curl … | nohup bash`. BadByte quotes the clipboard as base64 of the bash form, and quotes the `chmod +x` chain as the script that form downloads.

Those shapes are weak, not strong. Homebrew’s install button is the bash form, nvm’s is `wget … | bash`, and oh-my-zsh’s is `sh -c "$(curl …)"` and `sh -c "$(wget …)"`. The page-text corpus and the hosted-doc corpus stay at 0 warnings. A page that says Cmd+Space and copies the substituted curl reaches `warning.html`.

Not confirmed as the pasted command, and left unrated: `curl | python`, `osascript` without `-e`, and a bare `iwr -OutFile` plus `Start-Process`. The quoted PowerShell downloads are already `powershell -c` (weak) or a hidden window (strong). `zsh -c "$(curl …)"` is not a separate quoted campaign line. It matches the quoted bash form. The exact `wget -qO- | bash` campaign clipboard was not found as text. It is the same pipe, and it is the published nvm line.

Weights unchanged. No new signal. The sync test compares every tier regex in `clickFixTier` and `commandTier`.

Edge opened these 107 install and support pages again with the new build, on 2026-11-17. 105 loaded. 2 did not and are not counted as clean: `ddev.readthedocs.io` and `turbo.build`, both with no tab record. 23 copy clicks, 0 warnings. `berkeley-humanoid-lite.gitbook.io` stayed up. This is not the 2 000-page run.

Same run: typecheck, lint, 293 tests, URL-corpus ceilings unchanged, Edge E2E 43.

## Decision memos, 2026-11-17

No detector and no manifest change. The memos are the decision.

| Memo | Answer |
|------|--------|
| `concepts/consentfix.md` | No. Push Security, 11 December 2025. The paste is off limits, and localhost `code=` is a real loopback login. |
| `concepts/device-code.md` | No. Microsoft, 13 February 2025 and 6 April 2026. The device-login URL is the real page. An opener hint is one weak signal. |
| `concepts/extension-blocklist.md` | No. No ids, no feed. The permission diff stays the coverage. A license is still required before any id is written down. |
| `concepts/content-settings-optional.md` | Yes, not built. Edge 157 kept the grant. Branded Chrome 158 did not complete the test. Manifest unchanged. |

Weights unchanged. `tests/e2e/scenarios.spec.ts` still expects `contentSettings` in `permissions`.

Same run: typecheck, lint, 289 tests, URL-corpus ceilings unchanged, Edge E2E 40. Docs only.

## Scan order, 2026-11-16

The 12 ms walk read every open shadow root before `::before` / `::after`. Red first, on the build from `abda6a7`. A page put 2 000 open shadow roots of filler text in a zero-height box, then showed “Press Windows + R” in an on-screen `::before`, and copied a weak command. The page stayed up for 8 s.

The walk now reads the clicked element, its ancestors, and other elements with a box on screen before open shadow text, then closed roots, then frames. The same page reaches `warning.html`, and the click is under a second. `commandIsShown` and `weakCommandIsShown` are checked for the same whitespace class and the same length floor. The hosted-doc test feeds that visible result into `warnUnseenWeakCommand` instead of passing `commandShown: true` on its own. Weights stay 2.1.0.

Still open: a `::before` with no box, and a shadow lure that sits behind enough on-screen elements to spend the 12 ms.

Same run: typecheck, lint, 289 tests, URL-corpus ceilings unchanged, Edge E2E 40.

## Readable text, 2026-11-16

`commandIsShown` treated `innerText` as “the visitor can read this.” Red first, on the build from `b4c387e`. A picture lure on `fundament-lure-probe.weebly.com` also printed the install command in white on white, at 1 px, at opacity 0, at `left: -9999px`, and inside `overflow: hidden; height: 0`. All five stayed on the page.

A text node now counts only when the captured style and box functions say it is readable: area at least 1 px, font at least 8 px, opacity over 0.1, contrast at least 3:1 against the background behind it, not parked off the side of the viewport, and not covered by overflow or `clip`. Text below the fold still counts. Readable nodes are joined, so a code block split across spans still counts. After the change the five pages reach `warning.html`. The github.io doc stays up, including the split command. The 29 hosted-doc lines stay at 0 warnings. Weights stay 2.1.0.

Still open: the walk stops at 12 ms or 2 000 text nodes and then uses `innerText` again, so a padded page can keep an unreadable command looking shown. A pale color under 3:1 is treated as hidden.

Same run: typecheck, lint, 288 tests, URL-corpus ceilings unchanged, Edge E2E 39.

## Bridge functions, 2026-11-16

The clipboard check runs in the page's world and was calling functions the page can replace. Red first, on the build from `c22bbf4`. Four pages each replaced one function and then copied:

- `RegExp.prototype.test = () => false`, then a strong command. Stayed on the page.
- `innerText` forced to `""`, then a weak command next to a visible Win+R line. Stayed on the page.
- `performance.now` returned 0 and then `1e12`, with a `::before` lure after 300 divs. Stayed on the page.
- `getBoundingClientRect` returned a zero box, same lure. Stayed on the page.

The bridge now captures those functions at `document_start` and calls them with the captured `Reflect.apply`. Regex checks use the captured `exec` on a fresh regexp, because `RegExp.prototype.test` looks up `exec` on the way through. `::before` / `::after` text is read with `getPropertyValue("content")`. In Edge that property is own on the style object, not a prototype getter, so a captured `content` getter did not exist. After the change the four pages reach `warning.html`. `tests/security/bridge-natives.test.ts` walks the bridge and fails if a method call is not on the captured object. Weights stay 2.1.0.

Still open: a getter that is read as a property and is not in the captured list. `lastIndex` on a fresh regexp is assigned, because the property is not configurable.

Same run: typecheck, lint, 288 tests, URL-corpus ceilings unchanged, Edge E2E 33.

## Shadow-root list, 2026-11-16

`attachShadow` pushed every root into a strong array. Red first, on the build from `d378de3`. A page created 10 000 closed roots, removed them, then put the lure in one new closed root. The copy stayed on `tool-docs.example` for 8.3 s. The walk spent its 12 ms on the detached trees.

Roots are now `WeakRef`s. When the list reaches 512, and again on each copy, a root whose host is disconnected (or already collected) is dropped. The same page then reaches `warning.html`. That test finished in 356 ms, including the 10 000 create-and-remove, and the click limit is 1 000 ms. Heap size was not measured.

The sealed hook was checked on a Lit-style page: the return value is the `ShadowRoot`, an open root is `element.shadowRoot`, a closed root has `mode === "closed"` and `element.shadowRoot === null`, `element.attachShadow === Element.prototype.attachShadow`, that function's prototype is `Function.prototype`, `.call` attaches to the receiver, a second attach throws `DOMException`, and 200 custom elements that call `attachShadow` in the constructor render. The page reports `hook-ok`. Open and closed lure pages still warn. Weights stay 2.1.0.

Still open: thousands of closed roots that stay connected can still use up the 12 ms. Open roots are not taken from this list.

Same run: typecheck, lint, 287 tests, URL-corpus ceilings unchanged, Edge E2E 29.

## Element caps, 2026-11-16

The hidden-text walk stopped at the first 200 elements, the first 80 for CSS `::before` / `::after`, and the first 6 frames. Red first, on the build from `19b793b`. A `::before` after 300 empty divs, the same after 3 000, a declarative shadow seven deep after 300 divs, and the 7th same-origin frame stayed on `tool-docs.example`. A shadow created with `attachShadow` at those positions already warned, so that was not the gap.

The walk now has no document-order cap. Open roots are followed to a depth stop of 32. Closed roots come from the `attachShadow` list. Generated content is read only for `documentElement`, `body`, and elements whose box is at least 1×1 and within 80 px of the viewport. Same-origin frames are read when they have a box. The walk stops 12 ms after it starts. After the change those four pages reach `warning.html`. The 3 000-div case asserts click-to-warning under 1 000 ms, and that test finished in 339 ms including navigation. The older shadow, CSS, weebly picture, and github.io doc cases still pass. Weights stay 2.1.0. Page-text corpus and the 29 hosted-doc lines stay at 0.

Still open: a `::before` with no box, 400 text nodes inside one root, depth past 32, and a page that spends the 12 ms before the lure. The recorded shadow list still keeps removed roots.

Same run: typecheck, lint, 287 tests, URL-corpus ceilings unchanged, Edge E2E 27.

## Hosted documentation, 2026-11-16

`clickfix-unseen` warned on every non-popular user site on a hosting zone. That includes open-source docs. Red first: 17 pages fetched the same day from `github.io`, `gitlab.io`, `gitbook.io`, `netlify.app`, `vercel.app`, and `pages.dev`, plus three Read the Docs pages. 29 copy lines are weak install commands and each line is in the page text. All 29 were warnings. A local doc fixture on `project-docs.github.io` reached `warning.html`.

`free-hosting` has weight 0, so it is not a second signal. Taking `clickfix-unseen` out of the escalating set would also drop the picture lure on `fundament-lure-probe.weebly.com`, which has no brand, feed, credential form, keyboard lock, or fullscreen. That lure's command is not in the page text. The doc commands are. The page now reports `clickfix-weak` only when the copied command is not visible text. The 29 lines stay quiet. The weebly picture lure still reaches the warning screen. Weights stay 2.1.0.

Read the Docs is in the fixture and is not a hosting suffix, so it was already quiet. Same run: typecheck, lint, 287 tests, URL-corpus ceilings unchanged, Edge E2E 23.

## File and URI lures, 2026-11-16

Red first. `search-ms:query=…` was `null`. After the change it is `strong`, with `ms-search:`, `ms-msdt:`, `ms-settings:`, a `search:` URI that has `query=` or `crumb=`, `\\host@SSL\`, `\\host@80\`, `\\host@443\`, `\DavWWWRoot\`, and a path separated from a command by 40 spaces or a `#`. The command-then-path order is strong too. `\\fileserver\share\readme.txt`, a path alone, a path and `powershell Get-Process` with one space, and `search: see the manual` stay `null`.

The `.lnk` / `.hta` rule was not narrowed. The page-text corpus still has 0 blocked copy buttons, so a bare file name did not hit a real button. The shell-link paragraph that mentions `.lnk` is still `strong`. That assertion was left as it is for that reason.

Sources: Proofpoint, “Clipboard to Compromise”, TA571 on 1 March 2024 (`search-ms` opens a WebDAV share). Huntress, 29 September 2025 (FileFix pastes into the Explorer address bar). Same run: typecheck, lint, 286 tests, URL-corpus ceilings unchanged, Edge E2E 22.

Still open: a support page whose copy button is only `ms-settings:windowsupdate` would be blocked. That button is not in the 22 excerpts.

## Hidden instructions, 2026-11-16

Red first, on the build from `052fb6f`. A weak `curl | sh` with the only instruction in an open shadow root, a closed shadow root, or CSS `::before` stayed on `tool-docs.example`. The same command with the instruction only in an image, a canvas, or a cross-origin frame stayed on `fundament-lure-probe.weebly.com`. `pages.dev` could not be used: the `.dev` TLD is HTTPS-only, so the local fixture server never saw the request.

After the change, those six pages reach the warning screen. `netflix.net` (popular) and `tool-docs.example` (not a hosting zone) still allow the picture lure. The page-text corpus stays at 0. The command text is not sent. Weights 2.1.0. Same run: typecheck, lint, 285 tests, URL-corpus ceilings unchanged, Edge E2E 22.

Still open: a picture lure on a host that is neither popular nor a user site on a hosting zone. Reading pixels would be a new dependency. Not done.

## Page-text corpus, 2026-11-16

`tests/security/corpus.test.ts` still checks URLs and hosts only. Page signals are measured on `tests/fixtures/page-text/snapshots.json`: 22 excerpts, 32 copy buttons, fetched 2026-11-16.

| Check | Result |
|-------|--------|
| `clickFixTier` + `pasteLureContext` blocks a copy button | 0 |
| Visible text matches the prompt-injection pattern | 0 |
| Tech-support text (scam phrase, a call to action, and a phone number) | 0. A warning also needs fullscreen, which these snapshots are not. |

Before the fix, `pasteLureContext` was true for “This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.” and for “Your browser is out of date. Please update your browser.” Confirmed by a failing assertion, then fixed. A word is not a lure. A key combination is. A claim that this browser crashed or is out of date counts only together with a paste or run instruction.

The Windows shell-link excerpt mentions `.lnk`. `clickFixTier` of that paragraph is `strong`. The snapshot’s copy button is “Create Shortcut”, which is not. That gap stays for the file-lure pass.

Context is still `document.body.innerText`. An image, canvas, shadow root, iframe, or CSS `::before` / `::after` is not in this corpus.

Same run: typecheck pass, lint pass, 284 tests, URL-corpus ceilings held, Edge E2E 14. The report test reads the opened URL from `webNavigation`, because Edge turns the GitHub tab into `chrome-error` when every host is mapped to 127.0.0.1 and does not emit a request.

## Paste-lure class, 2026-11-15

Microsoft’s CrashFix post (5 Feb 2026) and TerminalFix post (28 Aug 2026) describe the class: the page copies a runnable command, or tells the user the browser is broken and to paste a fix. The clipboard figure itself is still not transcribed. The patterns below are the class, not a quote.

`tests/unit/clickfix.test.ts` “treats finger, a renamed ct.exe, and a file lure as strong”: `finger admin@10.0.0.5`, `cmd /c start finger.exe`, `cmd.exe /c start ct.exe`, `ChromeUpdate.search-ms`, a UNC `.lnk`, and `update.hta` are `strong`. “the finger utility prints who is logged in” and `ubuntu-24.04.iso` are not.

“does not treat install docs as a paste lure”: Homebrew, `winget install`, rustup, nvm, Docker’s `get-docker.sh`, `npm install -g`, and `pip install`, each under a sentence that says Terminal and PowerShell, do not set `pasteLureContext`. With the lure flag off, none of those lines is blocked. `Aw, Snap! Chrome has crashed` and `Chrome ist abgestürzt` do set it, including when the sentence sits after a long install-doc prefix. A weak `curl | sh` is blocked only when that flag is on.

`pasteLureContext` does not read `posture.ts`. A page that claims the browser is outdated is not a version verdict. The real outdated check stays `versionVerdict` in `src/engine/posture/version.ts`.

Edge: “a fake browser-crash page cannot copy a shell command” (no Win+R, no captcha word). The existing installer copy button stays on the page.

A page that only says “open Windows Terminal” and copies a normal install command is still not blocked. That is the install-doc case, not a miss of the crash class.

Commands after that change: typecheck pass, lint pass, `npm test` 35 files / **282 tests** pass (corpus ceilings unchanged), Edge E2E **14** pass. The crash page and the installer button both passed.

## Over-length give-up, 2026-11-15

`clickFixTier` returned null when the string was longer than 12 000 characters. Padding left the command itself runnable. `tests/security/redos.test.ts` had recorded that as “rejects an oversized command”. That assertion was the bug. It now requires a real command wrapped in one million spaces, and the same command after one million `a`s, to stay `strong`, each under 100 ms. A million `a`s with no command stay null.

`tests/unit/clickfix.test.ts` “still flags a command buried in padding” covers 12 000 and 100 000 spaces, a `#` comment, a newline, U+00A0 / U+2000 / U+3000, a U+200B inside `powershell`, and the command between two 20 000-character pads. `curl … | sh` for rustup stays `weak`. The Edge ClickFix test copies that command after 13 000 spaces, U+00A0, U+2000, U+3000, U+200B, and a 13 000-character `#` comment.

The same give-up was in `looksLikePromptInjection` (8 000), `looksDomXssSink` / `looksObfuscatedJs` / `looksPrototypePollution` (50 000), `looksMinerPayload` (80 000), `sessionIdInUrl` and `looksUrlPrototypePollution` (4 096, head only), and `looksQuishingResource` (2 048, head only). They now test a fixed head and a fixed tail. A host longer than 253 and a URL the parser rejects past 4 096 are still rejected: those are not markers hidden inside a longer string.

Commands after that change: typecheck pass, lint pass, `npm test` 35 files / **280 tests** pass (corpus ceilings unchanged). `tests/security/redos.test.ts` finished in 104 ms. Edge E2E **13** pass, including the padded fake-captcha copy.

## Paste-lure advisories read 2026-11-15

[CrashFix](https://www.microsoft.com/en-us/security/blog/2026/02/05/clickfix-variant-crashfix-deploying-python-rat-trojan/) (5 Feb 2026) and [TerminalFix](https://www.microsoft.com/en-us/security/blog/2026/08/28/terminalfix-campaign-deploys-reverse-tunnel-through-multistage-intrusion/) (28 Aug 2026). The clipboard command is in a figure in both posts. The CrashFix hunting query requires `cmd.exe`, `start`, `finger.exe`, and `ct.exe` together. No pattern was added. The extension id in that post was not added to any list.

Commands after that note: typecheck pass, lint pass, `npm test` 35 files / **279 tests** pass (corpus ceilings unchanged), Edge E2E **13** pass.

## Sources read 2026-11-15

- [declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest): static ruleset caps, guaranteed 30,000 static rules, regex cap 1,000, dynamic safe-rule cap 30,000 from Chrome 121, unsafe dynamic cap 5,000.
- [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies) and [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements): single purpose, limited use of user data, no remote executable code. Remote JSON is data, not code.
