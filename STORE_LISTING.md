# Chrome Web Store listing (draft)

## Name

Fundament

## Short description (≤ 132 characters)

Local Chrome security: phishing lookalikes, ClickFix, HTTP warnings, ads/trackers, unsafe downloads.

## Positioning (vs the next products)

Do not market against uBlock Origin Lite on ads. That is the ads champion under MV3. Fundament sits next to **Malwarebytes Browser Guard** and **Bitdefender TrafficLight**: warn on bad destinations, keep the page honest, stay quiet when nothing is wrong.

What those tools do that we also do, locally: lookalike / phishing URL checks, search-result flags, a simple pause when a site breaks.

What they often imply that we will not: live global intel in the extension, antivirus file scanning, “we replaced Chrome’s Safe Browsing.”

**What it does today**

- Checks addresses for phishing tricks such as lookalike brands (banks, shops, AI apps, wallets), punycode/homograph domains, odd encodings, login-style URLs, fake CAPTCHA / ClickFix lures, and OAuth consent proxies
- Combines several independent signals into a 0–100 risk score you can inspect
- Never shows a green “Protected” state when something is actually wrong (including plain HTTP)
- Blocks advertising and analytics hosts with the catalog shipped in the extension (not live EasyList).
- Blocks ClickFix: when a fake CAPTCHA tries to put a PowerShell/Terminal command on your clipboard, Fundament replaces it with a warning. What you copy yourself is never touched
- Ships a list of ~385,000 active phishing hosts (Phishing.Database) that is matched inside Chrome — nothing you visit is sent anywhere
- Recognizes pages that claim to be your bank, PayPal, Microsoft, or a wallet on a domain that is not theirs
- Stops fake browser login pop-ups (browser-in-the-browser) and tech-support scam screens
- Asks before a site gets an unlimited token approval or a Permit signature from your wallet, and keeps your wallet address if a page swaps it on the clipboard
- Alerts you when another extension updates itself with new permissions
- Tells you when Chrome is out of date or Safe Browsing is off
- Upgrades HTTP subresources to HTTPS (optional for whole pages)
- Warns if a page has a password box on HTTP or a form that submits to HTTP — without reading what you type
- Marks lookalike or high-risk destinations on Google, Bing, and DuckDuckGo result pages (local check; links are not rewritten)
- Optional: block sites from asking for notification permission (off by default)
- Stops obvious malware and HTML-smuggling download tricks
- Warns on high-risk navigations and lets you go back or see why
- Keeps a short local log of protections — not a full browsing history
**What it does not do**

- It is not a full antivirus (no scanning of file contents)
- It does not replace Chrome’s lock icon or OS security
- It does not claim to catch every scam or “100% of threats”
- It does not send your passwords, cookies, or form data anywhere
- It does not intercept or rewrite crypto wallet transactions
- It does not put Safe Browsing API keys in the extension

**Privacy**

Analysis runs on your device. Optional telemetry is off unless you turn it on. If you confirm a false-alarm report, Fundament opens a public GitHub issue with the hostname and signal ids only. See the privacy policy for permissions and data handling.

## Feature list

- Local phishing and impersonation heuristics
- Explainable risk score
- Tracker blocking (MV3 declarativeNetRequest)
- Allowlist and blocklist
- High-risk interstitial
- Dark and light UI
- Inspect which DNR rulesets matched on the current tab
- Dashboard: lifetime stats, extension permission audit, optional HIBP k-anonymity check

## Privacy explanation (store form)

Fundament processes the URL of pages you visit locally to detect phishing patterns and count blocked trackers. A content script looks only at whether a password field exists and where forms submit — never at typed values. It stores settings and a short host-only event log on the device. Optional telemetry is off and this build has no address for it. A confirmed false-alarm report opens a public GitHub issue containing the hostname and signal ids, not the path or query.

## Permission justification (store form)

- **storage:** Save settings, allow/block lists, and a short local event log.
- **tabs:** Show protection status for the current site, open a warning page when needed, and, after you confirm, open a public GitHub issue.
- **webNavigation:** Analyze main-frame navigations and redirect chains.
- **declarativeNetRequest:** Block tracker and user-blocklisted requests without reading their content.
- **declarativeNetRequestFeedback:** Count blocked tracker requests for the popup summary.
- **alarms:** Periodically trim local caches and logs.
- **downloads:** Cancel HTTP programs and double-extension filenames. Files are not uploaded.
- **notifications:** Local desktop notice when a download was stopped (host + reason only).
- **contentSettings:** Optional block of website notification prompts. Off by default.
- **privacy:** Optional hardening of WebRTC, prefetch, and hyperlink auditing.
- **contextMenus:** Allow, block, or pause the current site.
- **declarativeNetRequestWithHostAccess:** GPC/DNT headers and tracking-parameter stripping.
- **management:** Show other extensions' permissions and alert when an update adds new ones. Fundament never disables them.
- **Host access `http://*/*`, `https://*/*`:** Page-structure checks, ClickFix/clipboard and wallet guards, and redirecting known phishing pages to the local warning screen. Not the `<all_urls>` pattern; not `file:` or `chrome:`. The address is not sent to a server.

## Screenshots plan

1. Popup — Protected, calm status, three counters  
2. Popup — Details unfolded (HTTPS, brand, redirects)  
3. Warning — Suspicious impersonation, Go back / View why  
4. Warning — Critical / blocked connection  
5. Settings — few toggles, privacy section  
6. History — today, three event types  

Capture at 1280×800, light and dark.

## German short description (≤ 132)

Sicherheitsschicht für Chrome: Phishing, ClickFix, HTTP, Werbung/Tracker, unsichere Downloads.

## German long description (opening)

Fundament ist die Sicherheitsschicht für Chrome. Grün heißt nie „alles gut“, wenn etwas nicht stimmt. Analyse läuft lokal. Kein Antivirus, kein VPN, kein uBlock-Ersatz.

## FAQ

**Does Fundament sell my browsing data?**  
No.

**Does it stop all phishing?**  
No. It reduces common URL and lookalike tricks. You should still treat unexpected login requests with care.

**Why does it need the tabs permission?**  
To know which site the popup is talking about and to show a warning instead of the dangerous page when risk is high.

**Can I use it offline?**  
Yes. Local heuristics and tracker rules work offline.

**Is there a company dashboard?**  
Not in this extension. The engine is built so a later product can attach.

## Claims to avoid

Do not use: “100% protection”, “unhackable”, “military-grade”, “AI detected a threat”, “powered by live global intel” (until a real, licensed feed exists).

## Release notes

SHA-256 of `fundament-store.zip`: `6d33d3f0e0db1e98b6a2c9bea623a921008861f5bb3c091a8cdbf9d6df9005fb`
