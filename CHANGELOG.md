# Changelog

## 1.2.0 — 2026-11-24

The first Chrome Web Store package is the free product. Pro is not on its pages and cannot be switched on. `npm run build` can still show Pro. Weights unchanged.

### Pro

### Measured, not guessed
- A 40-page homepage probe on 2026-11-23, Edge, local, not CI. 35 measured, 5 not measured, 0 warnings. The measurer now follows a redirect to the host the extension actually recorded (`youtu.be` to `www.youtube.com`, `bit.ly` to `bitly.com`). The five misses are `twitter.com` and `x.com` (HTTP error), `w2rt6byl5nf1opmc-a.com` (name does not resolve), and `europa.eu` and `reddit.com` (browser closed). They are not counted as clean. This is not the 2 000-page run. Weights unchanged.
- One hundred mixed page analyses stay under three times a fixed calibration (`tests/unit/budget.test.ts`). The calibration is 38 500 000 `Math.imul` steps. On this machine, with nothing listening on port 5174, five of those loops took 35.9, 46.7, 38.2, 36.0 and 36.0 ms (median 36.0). The earlier analysis median on the same machine was 39.2 ms, and three times that was 118 ms. The multiple is still three. An absolute 118 ms is not the assertion, because that number is this machine. GitHub Actions on ubuntu-24.04 was not run. Service-worker start and content-script cost are still unmeasured. Weights unchanged.
- False-positive corpora from Majestic Million: ranks 1–10,000 and 100,001–110,000, each checked as home page and as `/login` with a password form. Enforced in `tests/security/corpus.test.ts`: at most 0.1 % / 0.2 % warnings, zero red. Current result: 0 of 20,000.
- Detection floor on a deterministic sample of real phishing hosts analyzed as if unlisted (URL only ≥ 4 %, with login form ≥ 28 %).
- Page signals on whole public pages, local only, not in CI. 629 pages opened in Edge with the built extension (22 corpus URLs, 107 install and support pages, 500 homepages). 536 measured, 93 did not load and are not counted as clean, 1 warning. The warning is `clickfix-unseen` on `berkeley-humanoid-lite.gitbook.io` after a copy click. ClickFix context, tech-support, prompt injection, browser-in-the-browser, and keyboard lock were 0. The README does not call this a measured false-alarm rate. Weights unchanged.
- Install and support pages reopened after the shell-form change, docs group only, local, not in CI. 107 pages, 105 measured, 2 did not load and are not counted as clean, 23 copy clicks, 0 warnings. The earlier GitBook host stayed up. The 500 homepages were not reopened. Weights unchanged.

### Free store
- The store package has no plan badge, no upgrade, no license field, and no grayed Pro switch. `ACTIVATE_LICENSE` is refused. The manifest has no `externally_connectable`. Extended tracker rules, the fingerprint shield, and the `scripting` permission are not in the package. A list stops at 10 entries and the history at 24 hours, and those messages do not mention Pro. Online reputation and a user-typed filter address are not called.
- Privacy pages for GitHub Pages are `pages/privacy/en.html` and `pages/privacy/de.html`. They have no scripts. `PRIVACY.md` names the live-feed GET, the Chrome version check, and the HIBP prefix.

### Page cost
- One service-worker restart, and one scan of the bridge and the content script, stay under three times a fixed calibration loop. The page has 3 000 elements and 20 frames. `tests/e2e/page-cost.spec.ts` builds with `VITE_FUNDAMENT_MARKS=1`. The store build does not. Port 5174 was empty. Weights unchanged.
- Those marks were visible to the page: `performance.getEntriesByType("measure")` returned `fundament-bridge` and `fundament-content`. The store build cuts them out before the bundle, and `release:check` fails if the zip still contains either name. The clock sits in `try` and the report runs after `collect()` returns, so a missing `performance` object cannot skip the scan. `tests/e2e/live.spec.ts`.
- The same local page opened without the extension has no script error the extension adds. Two console differences are named: HTTPS upgrade asks for the favicon over HTTPS on an HTTP-only server, and Chrome logs a sandboxed `about:blank` frame that already disallows scripts. `tests/security/page-cost.test.ts`.

### Content scripts
- `content.js` and `content-search.js` are wrapped in a function. They share one isolated world, and the minifier had reused one top-level name. On Google both run, so the second script replaced a function the first one calls (`s is not a function`) and the scan stopped. The manifest and the checks are unchanged. Weights unchanged.
- The store cut that drops cosmetic hiding had also dropped `hostAllowed` and left the call. The packed `content.js` threw `ReferenceError: hostAllowed is not defined` and returned before the scan, including on `google.com` and with the bridge script removed. The function now sits outside that cut. `tests/security/page-breakage.test.ts`. Weights unchanged. The zip hash in `STORE_LISTING.md` is the pack after this fix. Do not upload the earlier hash `6d33d3f0e0db1e98b6a2c9bea623a921008861f5bb3c091a8cdbf9d6df9005fb`.

### Store package
- `npm run pack` writes a zip with the ZIP epoch as the timestamp, sorted names, and fixed modes (files `0644`, directories `0755`). Two packs of one tree match. The SHA-256 is the release note in `STORE_LISTING.md`. `tests/security/pack-zip.test.ts`.
- `npm run release:check` is the free path. It fails if the zip contains `127.0.0.1`, an `http://localhost` address, `fundament-bridge`, `fundament-content`, `/pay/start`, `/v1/license/status`, `/v1/reputation`, or a user-pack download. The word localhost stays in the DNS-rebind check and in feed hosts such as `localhost.run`.

### Supply chain
- GitHub Actions are pinned to a full commit, with the version in a comment. `ci.yml` sets `permissions: contents: read`. The live-feed signature is a separate job: it receives the unsigned file and runs `scripts/sign-live-feed.mjs` (`node:crypto` only, no `npm ci`). The private key is an environment secret. The clicks in GitHub are in `GO_LIVE.md`. A workflow test fails if an action has no commit, a workflow has no permissions block, or a secret sits in a job that runs `npm ci`.
- Dev dependencies with a critical or high advisory are gone. Vite 8.3.8, Vitest 5.1.1, `@vitejs/plugin-react` 6.3.0. `esbuild` is a direct dev dependency because the bridge isolation test compiles one classic script and Vite 8 no longer pulls it in. `npm audit` after that: 0. Runtime dependencies were already 0. Weights unchanged. Corpora unchanged.

### Decisions
- Four concept memos, no code. ConsentFix, device-code phishing, and an extension-id list are not to be built. Confirmed 2026-11-17. `contentSettings` may move to `optional_permissions` later, alone. On Edge 157 an update from required to optional kept the grant, the API, and an on toggle. Branded Chrome 158 could not load the unpacked build, so that half is not measured and the manifest is unchanged. `privacy`, `scripting`, and `management` stay required. Weights unchanged.
- EIP-7702 and a lookalike address are not built. `concepts/wallet-delegation.md`. An authorization list does not hide the existing approval selectors. Address poisoning imitates an earlier recipient; comparing `from` with `to` on the same request misses that. Weights unchanged.

### Fixed
- A `wallet_sendCalls` batch can no longer hide the calldata that `eth_sendTransaction` already confirms: unlimited `approve` and `setApprovalForAll`. A plain call still reaches the wallet. The request is not rewritten. Weights unchanged.
- The bridge uses one copy decision for `writeText` and the `copy` event, and one helper for the head and tail of a long string. The tier rules, the 12 ms walks, and the wallet checks are unchanged. Weights unchanged.
- A download-and-run command is weak even when it is not `curl | sh`. The same tier now covers `bash -c "$(curl …)"` (CloudSEK, the pasted line is dated 2025 in the command itself; ThreatDown quotes the same shape), `wget … | sh`, `bash <(curl …)` (Garrett Stimpson, 1 June 2026), and `curl -o … && chmod +x`. Homebrew, oh-my-zsh, nvm, and rustup stay quiet: the command is on the page and the page does not ask for a key combination. A page that says Cmd+Space and copies the substituted curl reaches the warning screen. `curl | python`, `osascript` without `-e`, and a bare `iwr -OutFile` plus `Start-Process` stay unrated. The quoted PowerShell downloads are already `powershell -c` (weak) or a hidden window (strong). Weights unchanged.
- A copy that includes a visible install line plus other text is not a hidden command. The check looks at each weak line. A line the page does not show still warns, and a strong command is still judged on the whole string. The GitBook page that warned copied 48 lines; the install line was readable and the excerpt had stored only that line. That host is not special-cased. The 629-page run was not repeated. Weights unchanged.
- A visible lure is read before shadow trees. The click target, its ancestors, and elements on screen are checked for `::before` / `::after` before open or closed shadow text is walked, so 2 000 filler shadow roots cannot use up the 12 ms first. The same whitespace rule decides “shown” in the bridge and in the engine, and the hosted-doc test uses that result. Weights unchanged.
- A command printed on the page counts as shown only when a person could read it. Text in the background color, type under 8 px, opacity at or under 0.1, a box parked off-screen, or text clipped by overflow no longer makes a hosting-zone lure look like a documentation page. A readable command, including one split across spans in a code block, is still left alone. The 29 hosted-doc lines stay at 0 warnings. Weights unchanged.
- The page can no longer switch the clipboard check off by replacing built-in functions. The bridge captures those functions at `document_start` and calls only the captured ones. A strong command is still blocked when `RegExp.prototype.test` returns false. A weak command with a visible Win+R instruction is still blocked when `innerText` is forced to empty. A `::before` lure is still blocked when `performance.now` jumps or `getBoundingClientRect` returns zeros. Regex matching uses the captured `exec` on a fresh regexp, because `test` looks up `exec`. A test fails if the bridge calls a built-in method that was not captured. Weights unchanged.
- Closed shadow roots are kept as weak references, and a root whose host is no longer in the document is dropped. A page that creates and removes 10 000 components does not leave those trees in the extension, and a lure in a new closed root on that page is still blocked. `attachShadow` still returns the real root, uses the element as `this`, throws on a second call, and stays the same function on `Element.prototype`. A page of 200 custom elements that attach a shadow in the constructor still renders. Weights unchanged.
- A lure instruction past the first elements is still read. The scan no longer stops at the first 200 nodes, the first 80 for CSS `::before` / `::after`, or the first 6 frames. It reads open shadow roots (depth stop 32), every recorded closed root, generated content on elements that have a box on screen, and same-origin frames with a box. The walk stops after 12 ms. A `::before` after 3 000 empty divs, a declarative shadow seven levels deep, and the 7th frame still block a weak command, and the 3 000-div case reaches the warning screen in under a second. A script-created shadow was already covered by the `attachShadow` hook. Weights unchanged.
- A weak install command that is already visible on the page is not reported. Documentation on a hosting zone (`github.io`, `gitlab.io`, `gitbook.io`, `netlify.app`, `vercel.app`, `pages.dev`) can copy `curl | sh` without a warning screen. A weak command that the page does not show is still reported, and a user site on a hosting zone still reaches the warning screen. 17 of those doc pages, 29 copy lines, 0 warnings. Weights unchanged.
- A clipboard string is blocked when it is a `search-ms:`, `ms-search:`, or `ms-msdt:` URI, a `search:` URI with `query=` or `crumb=`, an `ms-settings:` URI, a WebDAV path (`\\host@SSL\`, `\\host@80\`, `\\host@443\`, or `\DavWWWRoot\`), or a path separated from a command by a long space run or a `#`. A normal `\\server\share`, a path on its own, and the word “search:” in a sentence stay quiet. The `.lnk` / `.hta` file-name rule is unchanged: the 32 copy buttons in the page-text corpus do not match it. Proofpoint, 1 March 2024; Huntress, 29 September 2025.
- Instructions hidden from `innerText` are still a lure when they sit in an open or closed shadow root or in CSS `::before` / `::after`. A picture, a canvas, or a cross-origin frame is not readable. A weak command copied from such a page is reported by name only (`clickfix-weak`, never the command). The warning is limited to a user site on a hosting platform. A popular site and an ordinary site stay quiet. Weights 2.1.0.
- A page that copies `finger` at a host, `cmd /c start finger.exe` or `ct.exe`, or a `.search-ms` / `.lnk` / `.hta` name is blocked even without a captcha. A weak install command is blocked when the page asks for a key combination, or when it claims this browser crashed or is out of date and also tells the visitor to paste or run a fix. “reCAPTCHA”, “I’m not a robot”, and “Your browser is out of date” on their own are not that page. “Open Terminal” on a Homebrew, winget, rustup, nvm, Docker, npm, or pip line is not that page. Whether Chrome is actually outdated stays the posture check. 22 real page excerpts and their copy buttons do not warn (`tests/security/page-text.test.ts`).
- A clipboard command longer than 12 000 characters was treated as harmless. Spaces, a long `#` comment, newlines, or Unicode spaces no longer hide a command at the start, the end, or next to a command name. The same cutoff on page-script, prompt, session-id, and QR checks scanned the start only or gave up; those now also look at the end. A normal install line such as rustup stays a weak match.
- The browser check for the shipped phishing list opens a host from the last rule, not only one from the top of the file. A live-list rule uses id 80000 and redirects that host only. A different host stays up, and deleting the rule lets the first host load.
- An update rewrites stored settings before rules are applied. A 1.0 blob (`enabled` / `allow`), a broken value, or an off switch that is not a boolean comes back with protection on. A public suffix in the allowlist (`com`, `github.io`) is dropped. A boolean the current settings stored, including an explicit off, is kept.
- Attacker-controlled strings are cut to a fixed length before a regular expression sees them (URL, host, page text, cookie name, filename, feed host). A worst-case input has to finish in under 100 ms (`tests/security/redos.test.ts`). Patterns keep working on a normal URL, a real ClickFix command, and a disguised filename.
- A page in the MAIN world could replace the clipboard and wallet hooks after they were installed and skip the check. Those hooks are now sealed: a later assignment is wrapped again. The isolated page scan reads a fake address bar from the HTML `value` attribute, not from the live field, and a `postMessage` raises a warning only when `__fundament` is the page's own property and one of the known kinds.
- Runtime messages are rebuilt from a fixed field list before the worker acts on them. A web page can only report page checks and search marks. Settings patches cannot set the license token. The checkout page can only activate a license, and only from an origin listed in the manifest. A sender with no extension id and no page is refused.
- Full Public Suffix List instead of ~45 hand-picked endings. `google.com.ua`, `google.com.vn` and dozens of other country sites were shown as "Fake Google address".
- The shipped feed blocked whole platforms because of single bad URLs on them: `bit.ly`, `pastebin.com`, `telegra.ph`, `blog.naver.com`, `mercadolibre.com.ar`, `name.com` and others. Platforms, shorteners and the top 50k domains are now filtered; kits on user subdomains stay blocked.
- Brands own many domains (`netflix.net`, `google.org`, `amazon.jobs`, `github.blog`): established sites are no longer judged by their name. User subdomains on platforms never inherit that (closes `paypal-login.weebly.com`).
- AI-login heuristic matched inside words (`capgemini`, `ngrok`, `copilotkit`).
- "Login on suspicious host" alone no longer turns a site yellow; it only feeds the brand + credential combination.
- `nip.io` / `sslip.io` home pages were flagged as DNS rebinding.
- Safe Browsing posture is only checked in Google Chrome; Edge (SmartScreen), Brave and others reported "Chrome Safe Browsing is off" without meaning.
- Chrome "needs update" during Google's staged rollouts (now measured against the version served to everyone, with a 3-day grace period).

### Live phishing updates
- Optional signed update of the phishing list every 6 hours (hosts active since the release). Ed25519 signature checked against a key compiled into the build, no rollback, 14-day freshness limit, 30-day expiry, and a client-side filter that never blocks popular or official brand hosts even from a valid list. Published by a scheduled GitHub Action to GitHub Pages; off when not configured. Dashboard shows list size, update state, and a toggle.

### Language
- Every warning, reason, and explanation now follows the browser language (German and English). Copy lives in one catalog (`src/engine/i18n/signals.ts`); a test fails if any signal the engine can emit lacks a translation or uses mismatched placeholders.
- Explanations shortened to what is wrong and what to do; hygiene findings say they are not a threat. Warnings name only the brand's main domain.
- German copy uses informal "du" throughout (matching the original voice); a test rejects formal "Sie".
- Onboarding describes the current protections (feed, ClickFix, wallet drainers, browser health, extension watch).

### Unchanged
- CrashFix and TerminalFix clipboard commands stay unimplemented. The Microsoft posts show them as figures, so the exact command is not confirmed. The existing `finger user@host |` check was not widened.
- `THREAT_MODEL.md` now matches the manifest. Unpacked builds can take a license from the local pay page. A store build does not keep that localhost exception. Feed rules redirect to this extension's warning page.
- Permissions stay as declared. The review is in `RELEASE_AUDIT.md`. `privacy` and `management` stay required because browser hardening and the extension watch run without an extra click. No manifest edit.

### Added
- `RELEASE_AUDIT.md`: baseline inventory of protections, permissions, network requests, and stored data, with test names and the 2026-11-15 measurements. Not a release verdict.
- False-alarm report on the warning page. After a second confirmation it opens a **public** GitHub issue with the hostname, signal ids, and engine / weights / extension versions. The full address is never included. Home-network names, private addresses, DNS-rebind names, and hosts outside the Public Suffix List have no report link. Settings links to an empty public form for phishing that was not caught.
- `scripts/store-screenshots.mjs`: Chrome Web Store screenshots (1280×800, DE + EN) from the real build. `popup.html?tab=<id>` shows a given tab (extension pages only).
- Third-party notices (Phishing.Database MIT, Public Suffix List MPL-2.0, Majestic Million CC BY 3.0) in the package and the dashboard.
- Git repository, LF line endings.

## 1.1.0 — engine 2.0.0, weights 2.0.0

### New protection
- Shipped phishing feed: ~385,000 active hosts (Phishing.Database, MIT) as a static DNR ruleset; pages are redirected to the warning screen before they load. `npm run feeds` refreshes it with a platform/brand safety filter.
- Brand impersonation rewritten: 150+ brands, embedded official domains, lookalike letters (digits, `rn`→`m`, Cyrillic/Greek/Armenian), brand + phishing keyword (EN/DE), brand on foreign endings, regional-bank exceptions.
- Page claims to be a brand (title / site name / logo) on a foreign domain while asking for credentials.
- Combination scoring: brand + credential form, credential form on free site-builder hosting.
- ClickFix commands are now replaced on the clipboard (writeText, write, setData, hidden-textarea execCommand); installer one-liners only on pages with fake-captcha instructions.
- Wallet drainer confirmation (unlimited approve, setApprovalForAll, Permit/Permit2, Seaport, eth_sign) for EIP-1193 and EIP-6963 providers.
- Clipboard wallet-address swap protection.
- Browser-in-the-browser fake login windows; tech-support scam screens (fullscreen is exited); keyboard-lock detection.
- Hidden autofill fields.
- Extension supply-chain watch (permission escalation on update) with notification.
- Browser posture: outdated Chrome, Safe Browsing off, third-party cookies.
- Downloads: held in `onDeterminingFilename`; 50+ executable types, right-to-left filenames, programs from free site builders or from dangerous pages.

### Fixed
- Warning appeared only after the page had committed; now at `onBeforeNavigate`.
- Tab state was lost whenever Chrome stopped the service worker (empty popup, "Continue" failed).
- Daily/12-hour alarms were reset on every worker start and effectively never fired.
- Page findings (ClickFix, seed form) never triggered the warning screen.
- `fc…`/`fd…` hostnames (fcbayern.de, fdp.de) were treated as private IPv6 and flagged as DNS rebinding.
- False positives: `groups.io`, `googleapis.com`, `pineapple.com`, `purchase.edu`, every umlaut domain, home routers, localhost dev servers, regional Sparkasse/Volksbank domains, cookie walls, login pages without a meta CSP.
- Fingerprint shield wrote into the page's real canvas; page messages could switch it off.
- Extension pages were not recognized when `runtime.getURL` returned a dynamic origin.
- Blocklisted / IOC pages showed Chrome's bare `ERR_BLOCKED_BY_CLIENT` instead of an explanation; the allowlist did not apply to page loads.
- The Pro tracker ruleset was enabled for every install until settings were applied.
- Lint picked up the `.store-pack` build output.

### Tests
- 223 unit tests (false-positive and phishing corpora, DNR layout, downloads, ClickFix tiers + bridge sync, extension diff, manifest wiring).
- Live-browser E2E (`tests/e2e/live.spec.ts`): phishing URL, brand-claiming page, ClickFix, installer copy left alone, feed redirect + continue, HTTP program download.
