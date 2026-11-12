# Changelog

## 1.1.0 — engine 2.0.0, weights 2.0.0

### New protection
- Shipped phishing feed: ~386,000 active hosts (Phishing.Database, MIT) as a static DNR ruleset; pages are redirected to the warning screen before they load. `npm run feeds` refreshes it with a platform/brand safety filter.
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
