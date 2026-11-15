# Backlog

Highest user benefit first. A row is done only after a test or a cited measurement in `RELEASE_AUDIT.md`.

Over-length give-up on clipboard commands is fixed (head, tail, and a slice around a command name). What an attacker can still do today is at the top.

## Next

1. **Paste-lure class, not one command string.** A page writes something runnable (LOLBin, `start`/`cmd` chain, Base64 into a shell) or tells the user to paste it into an OS surface. ClickFix, FileFix, CrashFix, TerminalFix, DownloadFix, macOS Terminal. Also a fake “Chrome crashed / is outdated” screen, checked against the real version in `posture.ts`. Counterexamples: brew, winget, rustup, nvm, Docker, npm, pip install pages. Microsoft posts of 5 Feb 2026 and 28 Aug 2026 describe the class; the exact clipboard figure is still not transcribed, and that does not block the class.
2. **Wallet calls.** EIP-7702 delegation and EIP-5792 `wallet_sendCalls` in the bridge. Batches that hide `approve` / `setApprovalForAll` / Permit2. Address poisoning (same start and end). Primary sources: the EIPs and the wallet RPC docs. Counterexamples: static copies of real dapp flows.
3. **Extension supply chain.** Dangerous permission combinations on install and on update, an `updateUrl` outside the store, new `externally_connectable`. Also against Fundament: another extension covering the warning page, forging a message, or overriding rules.
4. **Hidden prompt injection** (invisible text, off-screen, zero width, `aria-hidden`). Rank it as a hint, not a solution. The length give-up on that detector is already closed.
5. **Own supply chain** (after the May 2026 npm worm reports): pin Actions by SHA, least token rights, no `pull_request_target`, `FEED_SIGNING_KEY` only in its own workflow with a protected environment and no third-party actions, proof via a test PR, `npm ci` from the lockfile, `npm audit`, zip built twice with the same checksum. Provenance is not a security proof.
6. **Budgets and store text.** A test for milliseconds per navigation, service-worker start, and content-script cost on a large page. Keyboard, names, contrast, dark mode. Store listing against behavior. Chrome Web Store policy as of 1 July 2026: data only when strictly necessary for the single purpose, and changes disclosed.

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
