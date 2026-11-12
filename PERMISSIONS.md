# Permission justifications

Chrome’s manifest cannot hold comments. Each permission requested in `src/manifest.json` is required for a named feature.

| Permission | Feature | What it does **not** do |
|------------|---------|-------------------------|
| `storage` | Settings, allow/block lists, local history, pause timers, stats | No sync of URLs to Google unless the user turns on Chrome sync for extension storage |
| `tabs` | Popup analysis, interstitial, pause/allow of the current tab | Does not dump browsing history |
| `webNavigation` | Analyze main-frame navigations including redirects | Does not read response bodies |
| `declarativeNetRequest` | Block trackers, miners, user blocklist | Does not use blocking `webRequest` |
| `declarativeNetRequestFeedback` | Per-tab matched-rule counts in Inspect | Does not log full URLs of every subresource to disk |
| `declarativeNetRequestWithHostAccess` | HTTPS upgrade, GPC/DNT, tracking-parameter strip, optional clickjack/CSP header reinforce | Does not rewrite HTML |
| `alarms` | Expire pauses and prune the event log | Not a hidden phone-home timer |
| `downloads` | Heuristic cancel of HTTP executables and double extensions | Does not upload files or hashes |
| `privacy` | WebRTC non-proxied UDP off, prefetch off, hyperlink auditing off | Cleared when the toggle is off |
| `contextMenus` | Allow / block / pause this site | No page content access |
| `notifications` | Desktop notice when a dangerous download is cancelled | Does not send the file or URL off-device; message is host + reason |
| `contentSettings` | Optional block of website notification permission prompts | Off by default; does not read page content; does not send notifications itself |
| `management` | Dashboard risk labels for **other** extensions; alert when an update adds permissions (hijacked / sold extension) | Does not disable or remove other extensions |
| `scripting` | Registers the optional fingerprint shield (MAIN world) only while the toggle is on | No `executeScript` into pages; nothing is injected when the shield is off |
| Host `http://*/*` `https://*/*` | Content script structure checks, cosmetic CSS, DNR host-access rules, optional origin-only reputation, user-initiated HIBP range fetch from the options page | Does not read typed passwords or cookies |

`web_accessible_resources`: `warning.html` only, so declarativeNetRequest can redirect a known phishing page to the warning screen.

**Not requested:** `cookies`, `webRequest`, `history`, `debugger`, `nativeMessaging`, `clipboardRead`.
