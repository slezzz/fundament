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

## Privacy policy URL

`https://slezzz.github.io/fundament/privacy/en.html`

The German page is `https://slezzz.github.io/fundament/privacy/de.html`. Both are copied next to the signed feed by the live-feed workflow. Save the form after that workflow has published them. The feed file stays `live-feed.json` at the site root.

## Data the form asks about

Tick only what this package does. Nothing in this list is sold.

- Personally identifiable information — not collected. No account, no name, no email.
- Health information — not collected.
- Financial and payment information — not collected. A wallet request is read on the device so an unlimited approval, a Permit, or `eth_sign` can ask first. The request is not uploaded.
- Authentication information — not collected. The extension sees that a password field exists. It does not read the value. Have I Been Pwned runs only after a click and sends a 5-character SHA-1 prefix to `api.pwnedpasswords.com`.
- Personal communications — not collected.
- Location — not collected.
- Web history — the current tab address is processed on the device. A host-only log stays for 24 hours, 40 entries, and is not uploaded.
- User activity — not collected beyond that local log.
- Website content — visible text is scanned on the device for scam instructions and is not uploaded. A confirmed false-alarm report sends the hostname and the signal ids to a public GitHub issue, not the page text.

## Three certifications

Check all three. They match the package:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

The approved transfers are the signed phishing-list GET, the Chrome version GET, the Have I Been Pwned prefix after a click, and a public GitHub issue after a second click.

## What a reviewer can check

Load this zip. No account is required.

- On https://www.wikipedia.org/ the popup shows a calm status. It has no plan badge, no upgrade, and no license field.
- Settings has no telemetry switch and no box for a private IOC address. The IOC switch applies the bundled list.
- Options has a Have I Been Pwned check that does nothing until you click it.
- A page that calls `eth_sign`, `eth_signTypedData_v4` with a Permit, or an unlimited `approve` shows a confirm dialog. Cancel means the wallet does not receive that request. `eth_chainId` does not ask.
- A host on the shipped phishing list opens the warning page before the site is used. Continue is a second click.
