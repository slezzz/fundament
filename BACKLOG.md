# Backlog

Highest user benefit first. A row is done only after a test or a cited measurement in `RELEASE_AUDIT.md`.

Paste lures now include `finger` / `ct.exe`, a `.search-ms` / `.lnk` / `.hta` name, and a fake crashed browser only when the page also tells the visitor to paste or run a fix. “reCAPTCHA” and “out of date” alone stay quiet. A Terminal-only page that copies a rustup-shaped command is still open, on purpose.

## Next

Review 2026-11-17. The Unix shell forms that skipped the weak tier are in that tier. Homebrew, nvm, rustup, and oh-my-zsh stay quiet in the page-text corpus. The next measurement work is still the 93 pages that did not load, then at least 2 000 pages. After that, shorten the bridge before any release-blocker work. It grew again with the line check and these shell forms.

1. **Page-text corpus.** Done 2026-11-16. 22 snapshots, 32 copy buttons, 0 warnings. `tests/security/page-text.test.ts`. The shell-link paragraph that mentions `.lnk` is still `strong` if that paragraph were copied. The page does not offer it as a button.
2. **Context the page can hide.** Done 2026-11-16. Open and closed shadow roots and CSS `::before` / `::after` count as lure text, so a weak command there is blocked. The first-N caps are closed the same day: a `::before` after 3 000 empty divs, a declarative shadow seven deep, and the 7th frame still block, inside 12 ms and under a second from the click. A visible `::before` is read before open-shadow text, including the clicked element and its ancestors first, so 2 000 filler shadow roots no longer hide an on-screen lure. A `::before` with no box, 400 text nodes in one root, and depth past 32 stay open. The recorded shadow list is closed the same day: removed roots are weak references and are dropped when the host is disconnected. A lure after 10 000 removed components still blocks, and a page of custom elements still gets a normal `attachShadow`. Thousands of closed roots that stay connected can still spend the 12 ms. A picture, a canvas, or a cross-origin frame still is not readable. That case reports `clickfix-weak` only when the copied command is not already visible page text. A doc on `github.io`, `gitlab.io`, `gitbook.io`, `netlify.app`, `vercel.app`, or `pages.dev` that shows `curl | sh` stays quiet (17 pages, 29 buttons, 0 warnings). The worker still warns on a user site on a hosting zone when the command is not readable on the page. A picture lure on weebly warns, and so does one that also prints the command in the background color, at 1 px, at opacity 0, off-screen, or clipped. Popular hosts and ordinary hosts stay quiet. An image lure on a host that is neither popular nor a hosting zone is still open.
3. **File and URI lures.** Done 2026-11-16. `search-ms:`, `ms-search:`, `ms-msdt:`, a `search:` URI that carries `query=` or `crumb=`, and `ms-settings:` are strong. So is a WebDAV UNC (`\\host@SSL\`, `\\host@80\`, `\\host@443\`, `\DavWWWRoot\`) and a path separated from a command by 20 or more spaces or a `#`. A normal `\\server\share`, a path alone, and `search: see the manual` stay quiet. The `.lnk` / `.hta` rule was not narrowed: none of the 32 copy buttons matched it. The shell-link paragraph is still strong. Sources: Proofpoint, 1 March 2024 (`search-ms` to a WebDAV share); Huntress, 29 September 2025 (FileFix in the Explorer address bar).
4. **Decision memos.** Done 2026-11-17, confirmed the same day. `concepts/consentfix.md` **No**. `concepts/device-code.md` **No**. `concepts/extension-blocklist.md` **No**. `concepts/content-settings-optional.md` **Yes, not built**: Edge 157 kept the grant, branded Chrome 158 did not complete the update, manifest unchanged. `privacy`, `scripting`, and `management` stay required.

5. **Whole-page measurement.** Run 2026-11-17. `scripts/measure-page-signals.mjs` loaded the built extension in Edge and opened the 22 corpus URLs, 107 install and support pages, and the first 500 Majestic home pages. 536 measured, 93 not measured, 1 warning. Raw rows stay in gitignored `measure-output/`. The summary is in `RELEASE_AUDIT.md`. Not in CI. The one warning was a visible install line inside a 48-line copy. That form is fixed: each weak line is judged on its own, and a line the page does not show still warns. Those 629 pages were not opened again. The README still must not call page-signal false alarms measured until a new run. Next: classify the 93 failures, keep failures at or under 5 %, then at least 2 000 pages including docs on hosting zones.
6. **Wallet batch.** The calldata check now walks `wallet_sendCalls` the same way as `eth_sendTransaction`: unlimited `approve` and `setApprovalForAll`. A plain call is unchanged. EIP-7702 and lookalike addresses are not this row. They are under Nach 1.2.
2. **Extension supply chain.** Dangerous permission combinations on install and on update, an `updateUrl` outside the store, new `externally_connectable`. Also against Fundament: another extension covering the warning page, forging a message, or overriding rules.
3. **Hidden prompt injection** (invisible text, off-screen, zero width, `aria-hidden`). Rank it as a hint, not a solution. The length give-up on that detector is already closed.
4. **Own supply chain** (after the May 2026 npm worm reports): pin Actions by SHA, least token rights, no `pull_request_target`, `FEED_SIGNING_KEY` only in its own workflow with a protected environment and no third-party actions, proof via a test PR, `npm ci` from the lockfile, `npm audit`, zip built twice with the same checksum. Provenance is not a security proof.
5. **Budgets and store text.** A test for milliseconds per navigation, service-worker start, and content-script cost on a large page. Keyboard, names, contrast, dark mode. Store listing against behavior. Chrome Web Store policy as of 1 July 2026: data only when strictly necessary for the single purpose, and changes disclosed.

## Nach 1.2

Detection stays frozen through 1.2. These are not built. The exception would be a primary source that shows an existing check is bypassed. Neither item is that exception.

- **EIP-7702.** An `authorizationList` is a new transaction field. It does not hide the `approve` or `setApprovalForAll` selectors the bridge already confirms. Memo: `concepts/wallet-delegation.md`. Recommendation: no.
- **Lookalike address.** Address poisoning imitates an earlier recipient, or the account as it appears in history. MetaMask compares the destination with addresses the account has used before. Comparing `from` with `to` on the same request misses that send and warns on a different, rare case. Memo: `concepts/wallet-delegation.md`. Recommendation: no.

## Wartet auf Freigabe

Code waits for a yes. The concept file comes first and does not wait.

- `concepts/consentfix.md` — **No.** Confirmed 2026-11-17. A localhost `code=` URL is also a real loopback login. The paste is off limits.
- `concepts/device-code.md` — **No.** Confirmed 2026-11-17. The device-login URL is Microsoft’s real page. An opener hint would be a single weak signal.
- `concepts/extension-blocklist.md` — **No.** Confirmed 2026-11-17. No ids and no feed until a license exists. The permission diff stays the coverage.
- `concepts/content-settings-optional.md` — **Yes, not built.** Edge 157 kept the grant. Branded Chrome 158 did not complete the same update, so the manifest stays. `privacy`, `scripting`, and `management` stay required.
- `concepts/wallet-delegation.md` — **No.** EIP-7702 and a same-transaction lookalike check. See Nach 1.2. The `wallet_sendCalls` calldata walk is a bypass of the existing approval check and is not waiting.
- After those: `concepts/passkey-downgrade.md`, `concepts/password-reuse.md`. Password reuse changes the privacy promise. Do not implement either without a yes.
- A public “Probier es aus” page with harmless simulated attacks. A new hosted page needs a yes.
- Downloading Chrome for Testing, to finish the `contentSettings` update check on Chrome. Not downloaded.
- Any new permission, network request, data source, or change to the privacy promise.
- Copy that compares Fundament with Google, Chrome, or another product.

## Later

- Manual checklist not clicked by a person.
- Card skimmers: need a checkout corpus and a written plan.
