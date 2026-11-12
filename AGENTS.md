# Fundament — rules for AI agents

Fundament is a public Chrome MV3 security extension. Users trust it to say "safe" only when that is true, so **correctness beats features**. Every claim is measured; every regression is caught by a test. Read this before changing anything.

## Definition of done (all must pass, every change)

```powershell
npm.cmd run typecheck; npm.cmd run lint; npm.cmd test
$env:FUNDAMENT_E2E_BROWSER="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"; npm.cmd run test:e2e
```

- `npm test` includes `tests/security/corpus.test.ts`: **0** warnings on 20,000 real sites (Majestic 1–10k and 100,001–110,000) plus a detection floor on real phishing hosts. Never loosen thresholds, edit fixtures, or special-case domains to make it pass — fix the engine.
- E2E uses Edge locally because Norton deletes Playwright's Chromium. CI (GitHub Actions) runs Chromium.
- One focused branch/commit per change. Update `CHANGELOG.md`; update `PRIVACY.md` / `PERMISSIONS.md` / `STORE_LISTING.md` whenever data flow, network requests, or permissions change.

## Invariants — do not break

**Privacy**
- No remote code, no `eval`, CSP `script-src 'self'`. Nothing leaves the device except: opt-in reputation (origin only), the signed live feed GET, Chrome version check, user-initiated HIBP prefix.
- Never read typed values, cookie values, or the user's own clipboard. Page text is scanned locally only; only signal names (+ title/logo hints on credential pages) reach the worker.

**Trust paths**
- Live feed (`src/engine/feeds/live.ts`, `src/background/liveFeed.ts`): Ed25519 signature, strictly newer version, 14-day freshness, 30-day expiry, client-side filter that never blocks popular/official/public-suffix hosts. Do not weaken any of these.
- Feed builders (`scripts/fetch-threat-feeds.mjs`): never block platforms, shorteners, or popular domains host-wide; kits on user subdomains stay blocked.
- Popularity (`src/engine/reputation/popular.ts`) suppresses **name-based** impersonation only, never for user subdomains on hosting zones.
- DNR priorities: session bypass 10000 > pause 1000 > allowlist 100 > feeds/blocklist 5–6.
- MAIN-world bridge (`src/content/walletBridge.ts`): page messages may only *raise* warnings; nothing a page sends can turn protection off. ClickFix tiers must match `src/engine/page/clickfix.ts` (test enforces).

**Architecture**
- Content scripts are classic scripts: no imports (build fails otherwise).
- Tab state lives in `chrome.storage.session` (MV3 workers die after ~30 s). Alarms via `ensureAlarms()` only. Own pages are recognized by the fixed extension id, not `runtime.getURL("")`.
- Engine (`src/engine/`) is pure TypeScript, no Chrome APIs.
- Scoring: single weak hints never warn; phishing is a *combination* (`src/engine/risk/combos.ts`). Changing weights → bump `WEIGHTS_VERSION`.

**Copy**
- All signal text lives in `src/engine/i18n/signals.ts` (EN + DE), created with `textSignal(id, key, …)`. German uses informal **"du"** everywhere (test enforces). Short: what is wrong, what to do.

## Map

| Area | Files |
|---|---|
| Engine | `src/engine/analyze.ts`, `impersonation/`, `risk/`, `url/`, `page/merge.ts` |
| Worker | `src/background/index.ts`, `liveFeed.ts`, `downloads.ts`, `posture.ts`, `extensionWatch.ts` |
| Network rules | `src/network/dnr.ts`, `scripts/compile-filters.mjs` |
| Data | `filters/feeds/` (`npm run feeds`), `public/data/` + PSL (`npm run domain-data`) |
| Docs | `ARCHITECTURE.md`, `FILTERS.md`, `PRIVACY.md`, `CHANGELOG.md` |

Never commit `.env`, `.feed-signing-key`, or `server/.license-private`. Behind Norton, git over HTTPS may need `git -c http.sslBackend=schannel …`.
