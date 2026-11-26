# Privacy

Fundament is **local-first**. This build has no telemetry switch.

## Processed locally (on device)

| Data | Why | Retention |
|------|-----|-----------|
| Current tab URL (scheme, host, path, query) | Heuristic phishing / impersonation analysis | Per tab in `chrome.storage.session` (RAM, cleared when the browser closes); 30 s analysis cache |
| Page title, `og:site_name`, logo alt text | Only on pages that show a password, card, seed, or API-key field: compared with the local brand catalog ("page says PayPal, domain is not PayPal") | Not stored; never sent |
| Visible page text, plus text in open and closed shadow roots, in CSS `::before` / `::after` on elements that have a box on screen, and in same-origin frames with a box | Local check for tech-support-scam wording and ClickFix instructions ("press Win+R"). The walk stops after 12 ms. Text drawn on a canvas, shown only as a picture, or sitting in a cross-origin frame is not readable. A removed component's shadow tree is not kept | Not stored; never sent |
| Text a page tries to put on the clipboard | Replace a lure command with a warning text. A weak install-shaped command that is already visible on the page is left as it is and is not reported. A weak command that is not visible is not replaced either; only the signal name `clickfix-weak` is sent, never the command. The extension warns only when that host is a user site on a hosting platform | Not stored; never sent. What *you* copy with Ctrl+C or the menu is never changed. When you copy something that looks like a wallet address, it is kept in page memory for about 1.5 seconds to detect a swap. |
| Wallet requests made by the page (`ethereum.request` method and parameters) | Ask you to confirm unlimited approvals, Permit signatures, and `eth_sign` before they reach your wallet | Not stored; never sent; the request is passed on unchanged if you confirm |
| Other extensions: name, version, declared permissions | Detect an update that suddenly grants new powers (hijacked or sold extension) | Local snapshot until uninstall; last 30 changes |
| Search-result href destinations (Google/Bing/DDG) | Local mark of lookalike / high-risk hits; no link rewrite | In-memory cache (~10 min); not sent |
| eTLD+1 / registrable domain | Brand matching, allow/block | Derived, not a second copy of history |
| Risk signals and score | Show “why” in the UI | With the analysis object |
| Tracker match counts (DNR matched rules) | “N trackers blocked” | Per tab session |
| Settings, allowlist, blocklist | User control | Until uninstalled or cleared |
| Security events (time, type, **host only**) | History view | 24 hours, max 40 entries |
| Download-blocked notice (host + short reason) | Explain a cancelled save | OS notification; not a second log |

Analysis stays on the device unless you confirm a public false-alarm report (below).

The phishing host list (Phishing.Database, MIT) ships inside the extension and is matched by Chrome's network rules. Visited addresses are not sent anywhere to check them. The same is true for the popularity list (Majestic Million top 50,000) and the Public Suffix List: both are packaged files, looked up on the device.

## Automatic requests (no user data)

- **Phishing list updates** (only if the build has a live feed configured and the dashboard toggle is on, which is the default): at most every 6 hours, `GET` of one signed static file from the configured HTTPS address (GitHub Pages). No cookies, no browsing data, no identifiers. The hosting provider sees the request's IP address, as with any download.

- **Chrome version check:** at most every 6 hours, `GET https://versionhistory.googleapis.com/v1/chrome/platforms/<platform>/channels/stable/versions/all/releases?filter=endtime=none` without cookies. It returns the stable releases Google is serving right now and to what share of users, so Fundament can tell "up to date" from "missing fixes" during staged rollouts. Nothing about you or your browsing is in the request.

## Optional remote (opt-in)

This build has no telemetry switch and no address for counters. Nothing is sent as a usage counter.

## Never collected

- Passwords
- Form field values
- Cookies
- Authorization headers / tokens
- Full browsing history dumps
- Page HTML or screenshots
- Keystrokes
- Address-book or identity APIs

## Permissions (Chrome)

| Permission | Why it is needed |
|------------|------------------|
| `storage` | Settings, lists, local event log |
| `tabs` | Read the URL of the tab being analyzed (popup + navigation interstitial) |
| `webNavigation` | See main-frame navigations (including redirects) to run the engine |
| `declarativeNetRequest` | Block tracker / user-blocklisted requests without reading bodies |
| `declarativeNetRequestFeedback` | Count which rules matched so the UI can show “trackers blocked” |
| `alarms` | Expire analysis cache and event log without a persistent page |
| `downloads` | See download URLs/filenames to stop HTTP programs and double-extension malware tricks. Does not upload files. |
| `privacy` | Harden WebRTC, prefetch, and hyperlink auditing. Cleared if you turn the toggle off. |
| `contentSettings` | Optional block of notification permission prompts. Off by default. Cleared if you turn the toggle off. |
| `contextMenus` | Allow, block, or pause the current site from the page menu. |
| `declarativeNetRequestWithHostAccess` | Set GPC/DNT headers and strip tracking query IDs on `http`/`https` pages. |
| `management` | List other extensions and their declared permissions; alert when an update adds new powers. Does not disable them. |
| `notifications` | Local notice when a download was stopped or an extension gained new permissions. |
| Host access `http://*/*`, `https://*/*` | Page checks, clipboard and wallet guards, HTTPS upgrades, and redirecting known phishing pages to the warning screen. Does **not** read passwords or form values. Does **not** send the address to a server. |

`warning.html` is a web-accessible resource so network rules can redirect a blocked page to it. A website can detect that Fundament is installed by probing that URL; it cannot read anything from it. This build has no `externally_connectable` entry, so another site cannot send a message into the extension.

User-initiated Have I Been Pwned (options page only): SHA-1 is computed in the page, then a 5-character prefix is sent to `api.pwnedpasswords.com`. The password is cleared from the form before the request. Padding header is set.

User-initiated false-alarm report (warning page only): the first click only shows a preview. The preview says the report is **publicly visible**. A second click opens a **public GitHub issue**. The issue contains the hostname, the signal ids, and the engine, weights, and extension versions. It does not contain the path, query, fragment, page text, or anything you typed. GitHub sees your IP address and, if you submit, the account you are logged in with. Nothing is sent until you confirm. Home-network names, private IP addresses, DNS-rebind names such as `nip.io`, and hosts that are not under a public suffix (Public Suffix List) have **no report link**, so those names are never offered for a public issue.

Settings has a separate link for phishing Fundament did not catch. It opens an empty public GitHub issue form and sends no address until you type a domain yourself.

**Not requested:** `cookies`, `webRequest`, `history`, `debugger`, `nativeMessaging`. `optional_host_permissions` is unused: localhost is already covered by `http://*/*`.

## User controls

- Disable threat protection, tracker blocking, or phishing signals independently.
- There is no telemetry switch in this build.
- Allowlist a host (skips interstitial; does not silently disable DNR unless the host is also allowed in DNR).
- Clear history from Settings.

## Children / accounts

No accounts. No age collection. No cross-device sync of URL data.
