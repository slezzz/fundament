# Changelog

## Unreleased

### Measured, not guessed
- False-positive corpora from Majestic Million: ranks 1–10,000 and 100,001–110,000, each checked as home page and as `/login` with a password form. Enforced in `tests/security/corpus.test.ts`: at most 0.1 % / 0.2 % warnings, zero red. Current result: 0 of 20,000.
- Detection floor on a deterministic sample of real phishing hosts analyzed as if unlisted (URL only ≥ 4 %, with login form ≥ 28 %).

### Fixed
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
