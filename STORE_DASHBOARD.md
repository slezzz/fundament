# Chrome Web Store dashboard

Fill this in on the store form. It matches the free store package (`npm run pack`), not a later paid build.

Remote code: **No**. The package does not load code from the network. The phishing-list update is a signed data file, not code.

## Single purpose

Warn on phishing, lookalike logins, ClickFix clipboard lures, and unsafe downloads, and block the bundled tracker lists. Checks run on the device.

## Permissions

One line each. These are the permissions in the store manifest.

- `storage` — settings, allow and block lists, and a short local event log.
- `tabs` — the address of the tab the popup and the warning page are about.
- `webNavigation` — main-frame navigations and redirects, so the check runs before the page is used.
- `declarativeNetRequest` — block tracker and blocklisted requests without reading their bodies.
- `declarativeNetRequestFeedback` — count which rules matched, for the popup totals.
- `declarativeNetRequestWithHostAccess` — privacy headers and stripping of tracking parameters.
- `alarms` — trim the local cache and the event log.
- `downloads` — see a download URL and filename and cancel an HTTP program or a double extension. The file is not uploaded.
- `privacy` — WebRTC, prefetch, and hyperlink auditing. Cleared when the switch is off.
- `contextMenus` — allow, block, or pause the current site from the page menu.
- `notifications` — a local notice when a download was stopped or another extension gained permissions.
- `contentSettings` — optional block of notification prompts. Off by default.
- `management` — read other extensions' names and declared permissions. Fundament does not disable them.
- Host access `http://*/*` and `https://*/*` — page checks, clipboard and wallet guards, and the warning screen. The address is not sent to a server.

## Data use

Same facts as `PRIVACY.md` and `pages/privacy/en.html`.

- The page address is processed on the device. It is not sent to check it.
- At most every 6 hours, one GET of a signed phishing-list file. No cookies and no browsing data.
- At most every 6 hours, a GET to `versionhistory.googleapis.com` for the current stable Chrome version. Nothing about the user is in the request.
- Have I Been Pwned runs only after a click. A 5-character SHA-1 prefix goes to `api.pwnedpasswords.com`.
- A false-alarm report opens a public GitHub issue only after a second click. It contains the hostname and signal ids.
- This build has no telemetry switch and no address for counters.
