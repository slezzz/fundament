# Fundament

**The security layer for your browser.**

Fundament is a Chrome extension (Manifest V3) meant to be **the security layer** for everything an extension can actually protect: phishing and impersonation, trackers, plaintext HTTP, mixed content upgrades, obvious malware downloads, and a deterministic local risk engine.

Simple on the outside. Serious security underneath. If something is wrong, the popup is never green “Protected”.

## What the MVP actually does

These features are **real**, local, and tested (unit tests, live-browser E2E, and real-world corpora).

**Measured, enforced on every test run** (`tests/security/corpus.test.ts`):

| Corpus | Home page warned | `/login` + password form warned | Red (warning page) |
|---|---|---|---|
| Majestic ranks 1–10,000 | 0 | 0 | 0 |
| Majestic ranks 100,001–110,000 (outside the shipped popularity list) | 0 | 0 | 0 |

Real phishing hosts from the feed, analyzed *as if they were not listed*: about 6 % are flagged from the URL alone and about 34 % once the page shows a password form; brand claims in the page title/logo add more. Listed hosts (~385,000) are blocked before they load.

Features:

- **Shipped phishing feed:** ~385,000 active phishing hosts (Phishing.Database, MIT) compiled into a static DNR ruleset. A visit is redirected to the warning page *before the request leaves*; the user can still continue (per tab, per session). Platforms, URL shorteners, and the 50,000 most-linked domains are filtered out, so a single bad URL on bit.ly or pastebin can never take down the whole service; kits on user subdomains (evil.pages.dev, x.weebly.com) stay blocked.
- **Early interstitial:** the URL engine runs at `onBeforeNavigate`, again on commit and on single-page-app route changes. Tab state lives in `chrome.storage.session`, so it survives the service worker being stopped.
- **Brand impersonation that holds up on real traffic:** 150+ brands (incl. German/Austrian/Swiss banks, carriers, crypto, AI). Embedded official domains (`paypal.com.evil.top`), lookalike letters (`paypa1`, `rnicrosoft`, `аррӏе`), brand + phishing keyword (`sparkasse-sicherheit`), brand on a foreign ending, and brands named in the page title/logo of a page that asks for a password. Regional banks on their own city domains (`sparkasse-hannover.de`) and ordinary words (`groups.io`, `pineapple.com`) stay green.
- **Combination scoring:** single weak hints never turn a site red; brand lookalike + credential form, or credential form on free site-builder hosting, does.
- **ClickFix blocked, not just reported:** page-initiated clipboard writes of malware commands are replaced with a warning text (`writeText`, `write`, `setData`, hidden-textarea `execCommand`). Real installer one-liners (`curl … | sh`, `irm … | iex`) are only blocked on pages that show fake-captcha / Win+R instructions. User copies (Ctrl+C, context menu) are never touched.
- **Wallet drainer guard:** unlimited `approve`, `setApprovalForAll`, Permit/Permit2 signatures, Seaport listings, and `eth_sign` need a native confirm before they reach the wallet (EIP-1193 + EIP-6963 providers). Requests are never modified.
- **Clipboard address swap:** if you copy a wallet address and the page swaps in another one, your address is kept.
- **Browser-in-the-browser and tech-support scams:** fake login windows with a painted address bar, and fullscreen/keyboard-lock "your PC is infected, call…" screens (fullscreen is exited for you).
- **Hidden autofill fields** that silently collect card/address data.
- **Extension supply-chain watch:** alert when another extension updates itself with new permissions (all-site access, cookies, debugger…).
- **Browser posture:** Chrome out of date (compared with Google's public version API), Safe Browsing off, third-party cookies allowed.
- **Downloads held before they finish** (`onDeterminingFilename`): programs over HTTP, from free site builders, from dangerous pages; disguised and right-to-left filenames; 50+ executable types.
- URL and domain heuristics (punycode, homographs, bidi/RTL override, encoding, shorteners, login-page patterns, unusual ports, disguised file paths, AI login bait, crypto claim/seed URLs, ClickFix/CAPTCHA lures, fake browser updates, OAuth consent proxies)
- Brand impersonation matching against a versioned local brand catalog (banks, shops, AI products, wallets/exchanges)
- Deterministic risk scoring (0–100) from multiple independent signals
- Honest status: any `warn` or `fail` signal replaces “Protected” with the actual problem (e.g. “Not encrypted”)
- Tracker and **ad-network** blocking via `declarativeNetRequest` (`trackers-core` + Free `ads-extra`)
- Cryptominer blocking plus a small shipped list of AI/crypto demonstration threat hosts
- Strip tracking parameters from links (`utm`, `fbclid`, `gclid`, …)
- Global Privacy Control / DNT request headers
- Browser hardening (WebRTC IP leak, prefetch, hyperlink pings)
- Optional block of website notification prompts (off by default)
- Local marks on risky Google / Bing / DuckDuckGo results (no link rewrite, no Safe Browsing blast from the SERP)
- Pause this site for 15 minutes (popup + right-click)
- HTTPS upgrades for HTTP subresources (pages optional; can break LAN devices)
- Page checks: password field on HTTP, forms that submit to HTTP, seed/API-key field *names*, wallet object on HTTP, ClickFix clipboard writes, fullscreen-over-login, large overlays — **never reads typed values**, **does not rewrite wallet transactions**, **does not read your clipboard**
- Bundled cosmetic hide for common ad slots (off by default; skipped on allowlisted hosts)
- Pro-only extended tracker hosts compiled at build (`filters/trackers-extended.txt`); Free ads compile from `filters/ads-networks.txt` only
- Extension permission audit on the dashboard (`chrome.management`)
- User-initiated Have I Been Pwned check (SHA-1 prefix only)
- Download protection: cancel programs over HTTP and double-extension tricks (`invoice.pdf.exe`)
- User allowlist / blocklist (dynamic DNR rules)
- Interstitial warning for high / critical risk navigations
- Local security event history (short retention)
- Privacy controls: telemetry **off** by default; no passwords, cookies, or form data collected

## Plans

| | Free | Pro |
|--|------|-----|
| Local phishing & risk engine | yes | yes |
| Bundled ad-network blocking | yes | yes |
| HTTP / downloads / WebRTC / HIBP | yes | yes |
| AI / crypto lookalike + URL traps | yes | yes |
| ClickFix / fake CAPTCHA clipboard | yes | yes |
| Extended tracker catalog | no | yes |
| Fingerprint / social / telemetry blocking | no | yes |
| Cosmetic hiding | no | yes |
| Allow/block entries | 10 | 200 |
| History | 24 hours | 7 days |
| Security level | Standard | Relaxed / Standard / Strict |

Free is the real product, not a demo. Pro is extra coverage and limits.

Issue a license (dev key in `.env.example` — rotate before production):

```powershell
npm.cmd run license:issue
```

Paste the token in the popup under **Upgrade**, or click **Activate in Fundament** on the payment success page. Stripe: see `BILLING.md`. Set `VITE_PRO_PRICE_LABEL` if you want the price shown in the popup.

Chrome still owns TLS (the lock icon) and built-in Safe Browsing. Fundament adds a layer on top; it does not replace OS updates or a full antivirus.

Not implemented:

- Domain age / WHOIS
- Certificate transparency or live certificate inspection
- Compiling EasyList/EasyPrivacy inside the service worker (Chrome rule caps). Use a pinned host pack instead.
- User-Agent spoofing (the optional fingerprint shield only adds per-session noise to canvas/WebGL/audio read-backs)
- Setting DNS-over-HTTPS (Chrome settings only; we document the path)
- Scanning download *contents* (only URL/filename heuristics)
- Simulating or rewriting crypto transactions (dangerous wallet requests need your confirmation; they are never altered)
- Stopping a command you type or paste yourself into Windows Run or a terminal. Fundament stops the **page** from putting it on the clipboard.
- Live feed updates between releases without a server you run (the shipped phishing list is refreshed per release with `npm run feeds`; a signed, pinned IOC feed URL can be configured)
- Anything below the browser: infostealer malware, OS exploits, stolen session cookies on an infected PC
- Card skimmers (Magecart) injected into a shop's own scripts. Behavioral detection is possible but looks like ordinary checkout code; without a measured false-positive rate on real checkouts it is not shipped. Hidden autofill fields on payment forms are detected.

The extension does not ask a reputation service whether a site is safe, and it does not download a filter list from an address you type.

## Develop

```bash
npm install
npm run feeds      # refresh the shipped phishing list (network), commit filters/feeds/
npm run build
npm test
npm run test:e2e   # loads dist/ into a real browser: phishing, ClickFix, feed, download scenarios
```

Live E2E needs a Chromium that still accepts `--load-extension` (Playwright's Chromium, or Edge). If security software quarantines Playwright's browser, point the tests at Edge:

```powershell
$env:FUNDAMENT_E2E_BROWSER="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"; npm.cmd run test:e2e
```

Load `dist/` as an unpacked extension in `chrome://extensions`. Free store zip (no Stripe): `npm run pack` → `fundament-store.zip`. Paid store zip later: `npm run release` after key rotation (`GO_LIVE.md`).

### Reputation service

The store build does not call `/v1/reputation`. Safe Browsing v4 is limited to non-commercial use, so Pro does not include it. The server route can stay in the repo. It is not on the store path.


## Docs

| File | Purpose |
|------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Module map, data flow, trust boundaries |
| [SECURITY.md](SECURITY.md) | Assets, assumptions, mitigations |
| [THREAT_MODEL.md](THREAT_MODEL.md) | STRIDE |
| [PRIVACY.md](PRIVACY.md) | Data, permissions, non-collection |
| [STORE_LISTING.md](STORE_LISTING.md) | Chrome Web Store copy |

Engine version is defined in `src/engine/version.ts` and shown in Settings → About.
