# Release audit

Baseline on 2026-11-15. Extension version 1.1.0, engine 2.0.0, weights 2.0.0. This is an inventory with measurements, not a release verdict. **Not release-ready.**

A row is done only when a test name or a command output from this date is cited. Historical comments inside tests are marked as such.

## Open items, in the order to work them

| Pri | Item | Why it blocks a release |
|-----|------|-------------------------|
| P1 | Permission review | Written 2026-11-15. No permission moves. Applying the optional-permission candidates still needs a yes. See “Permission proposal”. |
| P1 | `THREAT_MODEL.md` is behind the code | It says there is no `externally_connectable` and that DNR never redirects. `src/manifest.json` allows `http://127.0.0.1:8787/*` and `http://localhost:8787/*`. The store pack refuses a zip that still has those matches (`scripts/pack-store.mjs`). Static feed rules redirect to `warning.html`. Doc drift, not a measured code bug. |
| P2 | Shipped phishing list: file vs browser | Compiled file: **49 rules, 385,353 hosts**, priority 5, action `redirect` (counted 2026-11-15 from `public/rules/threats-feed.json`, 8,000 hosts per rule in `scripts/compile-filters.mjs`). Chrome’s limit is on **rules**, not on host entries: guaranteed minimum 30,000 static rules, 50 enabled rulesets since Chrome 120 ([DNR reference](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest), fetched 2026-11-15). 49 rules is inside that budget. The reference lists no numeric cap on `requestDomains` length. Browser enforcement is measured for **one** host in `tests/e2e/live.spec.ts` (“a host from the shipped phishing feed is redirected, and Continue works”), not for a host in the last chunk. |
| P2 | Current attack variants | AiTM, device-code and OAuth-consent phishing, passkey downgrade, FileFix and later ClickFix variants, current wallet delegation types, prompt injection against browser agents. Some older shapes have tests (`tests/unit/clickfix.test.ts`, `tests/unit/depth-layers.test.ts` “AI prompt injection and quishing”). No fresh corpus and no false-positive measurement for the variants named in the release plan. |
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
| `npm run pack` | `fundament-store.zip`, 4,196,942 bytes, SHA-256 `3a597b60c1b8568015b1183d5ab5119202a6ec55657cb7f665915eb4d7a237a0`. `dist/manifest.json` has no `externally_connectable` (the pack script removes the localhost pay origin). |
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

If a later yes moves `contentSettings`: request it from the options toggle’s click, leave the toggle off when `permissions.request` returns false, and do not treat a missing API as “prompts blocked”. Whether an update that removes a required permission and re-adds the same name as optional keeps the old grant is **nicht bestätigt**.

Commands after that review: typecheck pass, lint pass, `npm test` 35 files / **279 tests** pass (corpus ceilings unchanged), Edge E2E **11** pass. Manifest permissions unchanged.

`externally_connectable` matches only the local pay server in source. The store pack exits if those matches are still present.

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

## Sources read 2026-11-15

- [declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest): static ruleset caps, guaranteed 30,000 static rules, regex cap 1,000, dynamic safe-rule cap 30,000 from Chrome 121, unsafe dynamic cap 5,000.
- [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies) and [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements): single purpose, limited use of user data, no remote executable code. Remote JSON is data, not code.
