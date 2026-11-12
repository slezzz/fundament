# Fundament architecture

## Goal

Local-first browser protection that stays correct when the network is down, and stays honest when a capability is not implemented.

```text
┌─────────────┐     messages      ┌──────────────────────┐
│ Popup /     │◄─────────────────►│ Service worker       │
│ Warning /   │                   │  - navigation hook   │
│ Onboarding  │                   │  - DNR orchestration │
└─────────────┘                   │  - event log         │
                                  └──────────┬───────────┘
                                             │
                                  ┌──────────▼───────────┐
                                  │ Security engine      │
                                  │ (pure TypeScript)    │
                                  └──────────┬───────────┘
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
              Local heuristics      ThreatIntelligence      TelemetryClient
              (always on)           Provider (optional)     (opt-in, default off)
```

## Package layout

| Path | Responsibility |
|------|----------------|
| `src/engine/` | Deterministic analyzers and risk scoring. **No Chrome APIs.** |
| `src/privacy/` | Local analysis wrapper, TI client, HTTP reputation client, telemetry, URL sanitization |
| `server/` | Reputation API. Holds the Safe Browsing key. Not bundled into the extension. |
| `src/storage/` | Settings, allow/block lists, short-lived events, analysis cache |
| `src/network/` | DNR static/dynamic rule management |
| `src/background/` | Service worker: navigation, messaging, interstitial |
| `src/ui/` | Popup, warning page, onboarding, options dashboard |
| `src/shared/` | Message protocol, types, permission notes |
| `public/rules/` | Static `declarativeNetRequest` rulesets |
| `public/icons/` | Toolbar and store icons |
| `tests/` | Unit, security fixtures, Playwright E2E |

## Runtime pieces

### Extension UI

- **Popup** — status is “Protected” only when there is no warn/fail signal. Otherwise the primary issue title (e.g. “Not encrypted”).
- **Options dashboard** — lifetime stats, module toggles, extension permission audit, user-initiated HIBP check, DoH honesty.
- **Warning page** — extension-origin interstitial (`warning.html`). Shown for high/critical scores when threat protection is on.
- **Onboarding** — three steps; permissions explained by purpose.
- **Content script** (`content.js` isolated + `content-bridge.js` MAIN world + `content-search.js` on search hosts) — classic scripts (no `import`). Structure-only page checks, ClickFix clipboard *writes*, wallet-on-HTTP ping, `target=_blank` noopener, bundled cosmetic CSS. Search marks stamp lookalike destinations; they never rewrite `href`. Never reads typed values, cookies, page text, or the user’s clipboard. Never wraps wallet APIs.

### Background service worker

0. **Known-bad hosts never reach the worker:** static (`threats-feed`, `threats-core`) and dynamic (IOC feed, user blocklist) DNR rules redirect pages to `warning.html?blocked=<reason>` before the request is sent. The worker remembers the original URL from `onBeforeNavigate` and builds the analysis when the warning page asks for it. "Continue" adds a tab-scoped session allow rule.
1. `webNavigation.onBeforeNavigate` (main frame) → `analyzeUrl` → interstitial *before* the response arrives when the band is `high`/`critical`. Repeated on `onCommitted` (final URL after server redirects) and `onHistoryStateUpdated` (single-page apps).
2. Tab state (`src/storage/tabs.ts`) lives in `chrome.storage.session` with an in-memory cache, because MV3 stops idle workers after ~30 s.
3. Page checks (`PAGE_CHECK` from every frame; subframes may only report credential/clipboard kinds) are merged into the tab analysis. Escalating kinds (ClickFix, browser-in-the-browser, tech-support scam, clipboard swap) or a band jump to `high` replace the page with the warning.
4. Count tracker blocks via `declarativeNetRequest.getMatchedRules` (requires `declarativeNetRequestFeedback`).
5. Validate every incoming message (source + schema). Never trust the sender’s claimed tab URL without reading it from `chrome.tabs`. Own pages are recognized by the fixed extension id, not `runtime.getURL("")`.
6. Alarms are created only if missing (re-creating an alarm restarts its timer, which used to starve the daily jobs).
7. Downloads are held in `onDeterminingFilename` until the verdict (filename, URL, offering page).
8. Extension watch (`extensionWatch.ts`) and browser posture (`posture.ts`) run on install/startup and on alarms.

### Content scripts

| Script | World / timing | Job |
|--------|----------------|-----|
| `content-bridge.js` | MAIN, `document_start`, all frames | Holds original clipboard/wallet functions before page scripts; replaces ClickFix commands, keeps swapped wallet addresses, confirms drainer requests, pings kinds |
| `content.js` | isolated, `document_start`, all frames | Structure checks + `MutationObserver` re-checks; brand hints only on credential pages |
| `content-search.js` | isolated, search hosts | Local marks on result links |
| `content-shield.js` | MAIN, registered via `chrome.scripting` only when the fingerprint shield is on | Per-session noise on canvas/WebGL/audio read-backs (never on the page's own drawing) |

Bridge pings are unauthenticated `postMessage`s: a page can forge one, which can only *raise* a warning. No page message can turn a protection off.

### Security engine

Pipeline (`src/engine/analyze.ts`):

1. Parse and normalize URL (rejects malformed / oversized input).
2. Domain parse (eTLD+1, IDN, IP literals).
3. URL heuristics, homograph/punycode, impersonation, phishing indicators, redirect-shaped URLs.
4. Local reputation (user blocklist + shipped **test** malicious hosts only).
5. Optional `ThreatIntelligenceProvider` — timeout, fail-closed on *availability*, not on *verdict*.
6. `scoreSignals` — weighted sum, cap 0–100, versioned weights.

Unavailable optional signals are recorded as `unavailable`, never as “safe”.

### Network protection

- Static rulesets `trackers-core` / `ads-extra` (Free) / `trackers-extended` (Pro) / `trackers-plus`
- `threats-core` — cryptominer hosts plus a small shipped AI/crypto demonstration host list (including `main_frame` for those threat hosts).
- `tracking-params` — strip `utm` / `fbclid` / `gclid` and similar from main-frame URLs via `queryTransform` (no `regexFilter`: Chrome’s compiled regex cap is 2KB).
- `privacy-headers` — `Sec-GPC` and `DNT`.
- `https-upgrade` — `upgradeScheme` for HTTP subresources (on by default).
- `https-upgrade-pages` — `upgradeScheme` for `main_frame` (off by default).
- Dynamic rules — user blocklist, allowlist, and temporary site pause (`allowAllRequests`).
- `chrome.privacy` — WebRTC policy, prefetch, hyperlink auditing.
- Download listener — cancel HTTP executables and double-extension filenames.
- No request body access, no cookie access.

### Privacy layer

| Component | Role |
|-----------|------|
| `LocalSecurityAnalyzer` | Only entry used by the worker for heuristics |
| `ThreatIntelligenceClient` | Optional remote checks; sends **origin only** (scheme + host) |
| `HttpThreatIntelligence` | POST `/v1/reputation`; timeout; cache; untrusted JSON |
| `TelemetryClient` | Opt-in counts of event *types*, never URLs |

### Storage

- `sync` is not used (avoid account-cloud copies of allowlists).
- `local`: settings, lists, events (capped, 7-day retention).
- Tab analysis lives primarily in the worker memory map.

## Trust boundaries

1. **Web origin → extension.** Untrusted. Never `innerHTML` with page data. Warning page renders with React text nodes.
2. **UI page → service worker.** Same extension origin, still schema-validated. Privileged messages are rejected if they arrive from a web tab. `PAGE_CHECK` is the only message a content script may send.
3. **Service worker → remote TI.** Untrusted JSON. Timeouts. No secrets in the bundle.
4. **DNR → network.** Browser-enforced; extension does not see bodies.

## Why no API keys in the extension

Google Safe Browsing requires a server-side key. Fundament’s extension calls only `VITE_REPUTATION_URL` (default `http://127.0.0.1:8787`). The key never leaves `SAFE_BROWSING_API_KEY` on the server. If that process is down, heuristics still run.

## Extension of the engine

Add a signal:

1. Emit a `RiskSignal` with stable `id`.
2. Add a weight in `src/engine/risk/weights.ts` and bump `ENGINE_VERSION` if scores change.
3. Add a unit test with a frozen expected score.
4. Add a user-facing explanation string (no “AI detected something weird”).
