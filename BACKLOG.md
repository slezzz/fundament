# Backlog

Highest user benefit first. A row is done only after a test or a cited measurement in `RELEASE_AUDIT.md`.

Paste lures now include `finger` / `ct.exe`, a `.search-ms` / `.lnk` / `.hta` name, and a fake crashed browser only when the page also tells the visitor to paste or run a fix. “reCAPTCHA” and “out of date” alone stay quiet. A Terminal-only page that copies a rustup-shaped command is still open, on purpose.

## Next

Review 2026-11-16, after `abda6a7`. The three small checks are done: `commandIsShown` stays in sync with `weakCommandIsShown`, the hosted-doc test uses that visible check, and a visible lure is read before filler shadow roots spend the 12 ms. Next is the four decision memos. Do not code them until there is a yes.

1. **Page-text corpus.** Done 2026-11-16. 22 snapshots, 32 copy buttons, 0 warnings. `tests/security/page-text.test.ts`. The shell-link paragraph that mentions `.lnk` is still `strong` if that paragraph were copied. The page does not offer it as a button.
2. **Context the page can hide.** Done 2026-11-16. Open and closed shadow roots and CSS `::before` / `::after` count as lure text, so a weak command there is blocked. The first-N caps are closed the same day: a `::before` after 3 000 empty divs, a declarative shadow seven deep, and the 7th frame still block, inside 12 ms and under a second from the click. A visible `::before` is read before open-shadow text, including the clicked element and its ancestors first, so 2 000 filler shadow roots no longer hide an on-screen lure. A `::before` with no box, 400 text nodes in one root, and depth past 32 stay open. The recorded shadow list is closed the same day: removed roots are weak references and are dropped when the host is disconnected. A lure after 10 000 removed components still blocks, and a page of custom elements still gets a normal `attachShadow`. Thousands of closed roots that stay connected can still spend the 12 ms. A picture, a canvas, or a cross-origin frame still is not readable. That case reports `clickfix-weak` only when the copied command is not already visible page text. A doc on `github.io`, `gitlab.io`, `gitbook.io`, `netlify.app`, `vercel.app`, or `pages.dev` that shows `curl | sh` stays quiet (17 pages, 29 buttons, 0 warnings). The worker still warns on a user site on a hosting zone when the command is not readable on the page. A picture lure on weebly warns, and so does one that also prints the command in the background color, at 1 px, at opacity 0, off-screen, or clipped. Popular hosts and ordinary hosts stay quiet. An image lure on a host that is neither popular nor a hosting zone is still open.
3. **File and URI lures.** Done 2026-11-16. `search-ms:`, `ms-search:`, `ms-msdt:`, a `search:` URI that carries `query=` or `crumb=`, and `ms-settings:` are strong. So is a WebDAV UNC (`\\host@SSL\`, `\\host@80\`, `\\host@443\`, `\DavWWWRoot\`) and a path separated from a command by 20 or more spaces or a `#`. A normal `\\server\share`, a path alone, and `search: see the manual` stay quiet. The `.lnk` / `.hta` rule was not narrowed: none of the 32 copy buttons matched it. The shell-link paragraph is still strong. Sources: Proofpoint, 1 March 2024 (`search-ms` to a WebDAV share); Huntress, 29 September 2025 (FileFix in the Explorer address bar).
4. **Decision memos, before any new feature.** `concepts/consentfix.md`, `concepts/device-code.md`, `concepts/extension-blocklist.md`, `concepts/content-settings-optional.md`. Each one: threat and primary source, what the browser can see, detection, data read, whether anything leaves the device, permissions, false-alarm risk and the counterexample corpus, store-policy note, effort, and a yes/no recommendation. These block the approvals, so they come before the next feature.

5. **Whole-page measurement, after the memos.** `scripts/measure-page-signals.mjs` loads the built extension in Edge and opens the 22 corpus URLs, about 100 more install and support pages, and the first 500 Majestic home pages. It counts page signals and clicks copy buttons it can recognize. Numbers and signal names per host go to a gitignored local file. The commit is only the summary in `RELEASE_AUDIT.md` (date, page count, warnings per signal, hostnames only). Blocked pages count as not measured. A warning on a legitimate page becomes a red excerpt test and is fixed at the cause. The README may talk about measured false alarms for page signals only after that. Not in CI.
6. **Wallet calls.** EIP-7702 delegation and EIP-5792 `wallet_sendCalls` in the bridge. Batches that hide `approve` / `setApprovalForAll` / Permit2. Address poisoning (same start and end). Primary sources: the EIPs and the wallet RPC docs. Counterexamples: static copies of real dapp flows.
2. **Extension supply chain.** Dangerous permission combinations on install and on update, an `updateUrl` outside the store, new `externally_connectable`. Also against Fundament: another extension covering the warning page, forging a message, or overriding rules.
3. **Hidden prompt injection** (invisible text, off-screen, zero width, `aria-hidden`). Rank it as a hint, not a solution. The length give-up on that detector is already closed.
4. **Own supply chain** (after the May 2026 npm worm reports): pin Actions by SHA, least token rights, no `pull_request_target`, `FEED_SIGNING_KEY` only in its own workflow with a protected environment and no third-party actions, proof via a test PR, `npm ci` from the lockfile, `npm audit`, zip built twice with the same checksum. Provenance is not a security proof.
5. **Budgets and store text.** A test for milliseconds per navigation, service-worker start, and content-script cost on a large page. Keyboard, names, contrast, dark mode. Store listing against behavior. Chrome Web Store policy as of 1 July 2026: data only when strictly necessary for the single purpose, and changes disclosed.

## Wartet auf Freigabe

Code waits for a yes. The concept file comes first and does not wait.

- `concepts/consentfix.md` — localhost redirect that takes an OAuth code. Not written yet.
- `concepts/device-code.md` — device-code opener / referrer hint. Not written yet.
- `concepts/extension-blocklist.md` — a list of extension ids. Needs a license before any data is added. Not written yet.
- `concepts/content-settings-optional.md` — move only `contentSettings` to `optional_permissions`. `privacy`, `scripting`, and `management` stay required. Not written yet.
- After those: `concepts/passkey-downgrade.md`, `concepts/password-reuse.md`. Password reuse changes the privacy promise. Do not implement either without a yes.

## Later

- Manual checklist not clicked by a person.
- Card skimmers: need a checkout corpus and a written plan.
