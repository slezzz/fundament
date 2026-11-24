# Chrome Web Store submission checklist

Use this with `PRIVACY.md`, `PERMISSIONS.md`, and `STORE_LISTING.md`.

## Privacy practices tab

- [ ] Single purpose: **browser security / safer browsing** (phishing heuristics, tracker blocking, download heuristics). Do not also claim VPN, password manager, or antivirus file scanning.
- [ ] Remote code: **No**. All JS is in the package. Cosmetic CSS is bundled. Filter lists are static JSON in `public/rules/`.
- [ ] User data: **Not sold**. No ads. Optional HIBP check is user-initiated and sends only a SHA-1 prefix. Optional reputation sends origin only to a server the user configures.
- [ ] Certify: no use of the data for unrelated purposes.
- [ ] Host permission justification: needed for DNR host-access rules, HTTPS upgrades, content-script structure checks, and (opt-in) origin-only reputation. See `PERMISSIONS.md`.

## Permission justifications (paste short versions)

- **storage** — save settings and a short local log.
- **tabs** — analyze the current tab and show a warning page.
- **webNavigation** — run checks when the main frame navigates.
- **declarativeNetRequest** (+ WithHostAccess, Feedback) — block trackers without reading page bodies; count matches for the UI.
- **downloads** — stop obvious malware filename/URL tricks. Files stay on the device.
- **notifications** — tell the user a download was stopped (host only, on-device).
- **contentSettings** — optional block of website notification prompts (off by default).
- **privacy** — stop WebRTC from leaking a local IP when the user enables hardening.
- **contextMenus** — allow, block, or pause the current site.
- **management** — show other extensions’ declared permissions and alert when an update adds new ones. Fundament does not turn them off.
- **scripting** — register the optional fingerprint shield only while the user has it on.
- **Host access** — apply network rules and page checks on http/https sites.

## Assets

- [ ] 128×128 icon (exists in `public/icons/`)
- [ ] Small / marquee promo if required by the store at submit time
- [ ] Screenshots: `node scripts/store-screenshots.mjs` (after `npm run pack`) writes 1280×800 PNGs in German and English to `store-assets/screenshots/`

## Package

- [ ] `npm run pack` → `fundament-store.zip` (not `src/`, not a zip that still talks to 127.0.0.1)
- [ ] Version in `src/manifest.json` matches the store listing (1.2.0)
- [ ] `npm run feeds` run within the last week before packing (phishing list freshness), result committed
- [ ] Privacy policy URL hosted (copy from `PRIVACY.md`)
- [ ] Terms URL hosted (copy from `TERMS.md`) when you sell; for free, privacy URL is the blocker
- [ ] Stripe / production keys: later (`GO_LIVE.md`). This free zip must not accept the example license.

## Honest claims (do not tick unless true)

- [ ] Copy does **not** say “antivirus”, “100% of phishing”, or “we verify certificates”
- [ ] Copy does **not** say Fundament sets DNS-over-HTTPS
- [ ] Copy does **not** imply live EasyList auto-update until a signed precompiled pack exists
