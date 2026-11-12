# Security

This document describes how Fundament is defended, what it assumes, and what it does **not** claim.

## Assets

| Asset | Why it matters |
|-------|----------------|
| User navigations and tab URLs | Needed for local phishing analysis; sensitive |
| Allowlist / blocklist | Can weaken or strengthen protection |
| Settings (protection toggles) | Safety-critical defaults |
| Static DNR rules | Tracker/malicious request blocking |
| Optional reputation origin (scheme+host) | Sensitive; only if user opts in |
| Safe Browsing API key (server env only) | Quota / billing abuse if leaked |
| Service worker | Orchestrates analysis and tab redirects |

Fundament does **not** treat as assets (because it does not hold them): passwords, cookies, form bodies, auth tokens, browsing history beyond a short local event log.

## Attack surfaces

- Chrome extension APIs (`tabs`, `webNavigation`, `storage`, `declarativeNetRequest`, messaging)
- Popup, onboarding, and warning pages (extension origin)
- Optional HTTP client for threat intelligence (`HttpThreatIntelligence`)
- Reputation server (`server/`) if you run it
- User-controlled allow/block strings
- Malicious websites the user visits (phishing, drive-by, tracker)

## Trust boundaries

See [ARCHITECTURE.md](ARCHITECTURE.md). Summary: every website is hostile; every remote JSON payload is hostile; extension pages are privileged but still validate messages.

## Threat actors

- Phishing operators (lookalike domains, redirects, shorteners)
- Tracker / fingerprinting networks
- Malicious extensions on the same profile (limited by Chrome isolation)
- Network attackers (MITM on HTTP sites; we cannot replace TLS)
- Supply-chain attackers (npm dependencies — pin and audit)

## Security assumptions

- Chromium enforces Manifest V3 CSP and DNR correctly.
- The user installed the build we shipped (not a sideloaded impostor).
- Local clocks are reasonable (event timestamps).
- Without a reputation provider, **known-malware coverage is limited** to heuristics, user blocklist, and a tiny shipped **test-host** list.

## Mitigations

| Risk | Mitigation |
|------|------------|
| XSS in UI | React text rendering; CSP `script-src 'self'`; no `innerHTML` of URL data |
| `eval` / remote code | Forbidden; no remote scripts |
| Excessive permissions | No `<all_urls>` pattern; host access is `http`/`https` only; no `webRequest`; no cookies |
| Secrets in client | None. No API keys in the bundle. Safe Browsing key is server-only. |
| Message spoofing | Reject privileged messages from web tabs; `PAGE_CHECK` kinds are allowlisted |
| Tab URL spoof via message | Worker reads `tab.url` from `chrome.tabs.get` |
| Open redirect interstitial | Warning page only loads analysis from worker by tab id |
| Storage integrity | Settings schema parse with defaults; unknown keys ignored |
| Tracker bypass | Allowlist is explicit and user-visible; not silent |
| False sense of safety | Any warn/fail signal replaces “Protected”; HTTP is never green |
| History leakage | Event log stores host + event type, not full URLs with queries; 7-day cap |
| Interstitial bypass | User can continue; event is logged; allowlist is separate |

## Known limitations

- **Not a full antivirus.** Filename/URL download heuristics only; no file-content or memory scanning.
- **Not Safe Browsing.** No live malware feed is shipped.
- **No certificate intelligence** in MVP (Chrome does not expose full cert chains to MV3 extensions without extra, invasive APIs).
- **No domain age** without a backend.
- **Main-frame heuristics** only. Subresource phishing in iframes is not classified in MVP (trackers in subresources can still be blocked by DNR).
- **Shortener landing pages** are flagged as higher risk when they look like login flows; the hop after a shortener is analyzed as its own navigation.
- **Determined attackers** can register lookalikes that do not match the brand catalog or heuristic weights.
- **Allowlist** is a loaded gun: a phishing host on the allowlist will not get an interstitial.

## Reporting

Report suspected vulnerabilities privately to the project maintainers. Do not file public issues with exploit details until a fix is available.
