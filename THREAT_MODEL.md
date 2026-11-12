# Threat model (STRIDE)

Scope: Fundament Chrome extension MVP (local engine + DNR + UI).  
Out of scope: a future reputation backend, Chrome itself, the operating system.

## Data flow (brief)

1. User navigates → Chromium → `webNavigation` URL to service worker.
2. Worker → local engine → risk band.
3. Worker → DNR (parallel, browser-enforced blocks).
4. Worker → popup/warning via extension messaging.
5. Optional future: worker → TI HTTP (origin only).

## STRIDE

### Spoofing

| Threat | Status | Mitigation |
|--------|--------|------------|
| Site spoofs PayPal | In scope | Impersonation + homograph + URL heuristics |
| Site spoofs Fundament UI | Residual | Chrome origin isolation; users should check `chrome-extension://` |
| Message claims a different tab URL | In scope | Ignore client URL; read from `tabs` API |
| Future TI spoofs reputation | Future | TLS + response schema; never take `from`/identity from JSON |

### Tampering

| Threat | Status | Mitigation |
|--------|--------|------------|
| Attacker edits settings in storage | Residual (same profile) | Schema validation; safe defaults on parse failure |
| Attacker tampers DNR rules | Residual (same profile / debugger) | Static rules in package; dynamic rules only from settings UI |
| Malicious npm package at build | Supply chain | Lockfile; few dependencies; no postinstall scripts expected |

### Repudiation

| Threat | Status | Mitigation |
|--------|--------|------------|
| User continues through a warning | In scope | Local event `user_continued` |
| We cannot prove a remote scan happened | N/A | MVP is local; no fake scan receipts |

### Information disclosure

| Threat | Status | Mitigation |
|--------|--------|------------|
| Extension exfiltrates history | Must not | Host access is for page-structure checks and HTTPS upgrade; events are local, query-stripped; typed passwords are never read |
| Popup XSS leaks URL | In scope | Text nodes only; CSP |
| TI request leaks query/PII | Future | `sanitizeForRemote` allows origin only |
| `tabs` permission exposes URLs to us | Accepted | Required to analyze the active site; documented in PRIVACY.md |

### Denial of service

| Threat | Status | Mitigation |
|--------|--------|------------|
| Huge URL / many query params | In scope | Max URL length; bounded parsing |
| Rule explosion | In scope | Cap allow/block list sizes; DNR dynamic rule quota |
| Service worker kill loop | Residual | Keep analysis CPU-bounded; cache by URL |

### Elevation of privilege

| Threat | Status | Mitigation |
|--------|--------|------------|
| Website talks to the worker | In scope | No `externally_connectable`; content script only sends `PAGE_CHECK`; other messages from web tabs are rejected |
| Warning page `continue` used as open redirect | In scope | Continue only to the tab’s last analyzed http(s) URL from worker state |
| `declarativeNetRequest` used to MITM | Residual | Actions are block/allow/`upgradeScheme` (HTTP→HTTPS), never redirect-to-attacker |

## Risk scoring abuse

Weights are public in-source. Attackers can stay under thresholds. That is accepted: the product prefers explainable scores over secret sauce. Thresholds can be tightened via `securityLevel` without claiming completeness.

## Residual risk statement

Fundament reduces *some* phishing and tracking. It does not make the browser a trusted computer. Users can still be phished via first-party lookalikes, phone social engineering, or compromised legitimate sites.

Chrome does not expose TLS certificates, live DNS answers, or HttpOnly cookie flags to extensions. Fundament records those as unavailable instead of inventing a green check. It does not fetch unpinned URLhaus/PhishTank dumps, does not replace site CSP wholesale, and does not randomize audio output.
