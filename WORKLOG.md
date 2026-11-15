# Work log

Newest first. One entry per pass.

## 2026-11-15 — Paste-lure class

- Hypothesis: A page can copy `finger` at a host, `start finger.exe` / `ct.exe`, or a `.search-ms` / `.lnk` / `.hta` name, or can call a normal `curl | sh` a browser-crash fix, and the old patterns miss it. Install docs that say “Terminal” must stay unblocked.
- Result: Those shapes are `strong`. Crash / “out of date” / “abgestürzt” text makes a weak install command count as a lure. “Open Terminal” and “PowerShell” do not. The page’s claim is not compared with the installed Chrome version; `posture.ts` still owns that.
- Evidence: `tests/unit/clickfix.test.ts` (the two new cases). Homebrew, winget, rustup, nvm, Docker, npm, pip lines stay off. Edge crash page copies `curl | sh` with no captcha and no Win+R. 282 tests, corpus ceilings held, E2E 14.
- Open doubt: a page that only says “open Windows Terminal” and copies a malicious command shaped like rustup is not blocked. Blocking that phrase would also block the Docker and rustup copy buttons. Measured as the counterexample, left open on purpose.

### Self-check

- Real user, real attack: Yes for the class Microsoft described on 5 Feb 2026 and 28 Aug 2026: a copied LOLBin or a fake crash that asks for a shell command. Not a transcription of their figure.
- Five-minute bypass: Drop the `@host`, the `.exe`, and the crash sentence, and copy `curl | sh` from a page that only says Terminal. Tested: that stays unblocked. Adding the crash sentence is tested the other way.
- False alarm: The seven install lines under “Open Terminal” do not block. Measured, not assumed. `ubuntu-24.04.iso` is not a file lure.
- Simpler or more complicated: Three patterns and one shared phrase list, duplicated into the bridge. The sync test covers both.
- AGENTS.md: Not stretched. No new permission, no network, no reading of the user’s own clipboard. Page text used for the lure check stays in the page.
- Would I defend it: Yes, as “these shapes are blocked, and install docs are not.” Not as “every paste lure.”
- Harmless on weird input: A ten-character `.hta` name is still strong (the length floor does not apply to that pattern). A long page with the crash sentence at the end still matches. A host over 253 characters is unchanged.

## 2026-11-15 — Over-length clipboard command

## 2026-11-15 — Over-length clipboard command

- Hypothesis: `clickFixTier` returns null above 12 000 characters, so a real command plus padding is copied and still runs.
- Result: Whitespace, including U+00A0, U+2000–U+200A, and U+3000, is collapsed. U+200B, U+200C, U+200D, and U+2060 are removed. The scanner reads the first 12 000 characters, the last 12 000, and a short slice around the first and last hit of each command name. The same head-and-tail change is in the prompt, DOM-XSS, obfuscation, miner, session-id, prototype-gadget, and QR checks. A host over 253 characters and a URL the parser rejects past 4 096 still stop: those are not a marker hiding past a cutoff.
- Evidence: `tests/unit/clickfix.test.ts` “still flags a command buried in padding”. `tests/security/redos.test.ts` now expects `strong` for one million spaces and for one million `a`s in front of the command, under 100 ms. The old “oversized means null” assertion was the bug; changing it is the fix. Edge fake-captcha copies the command after 13 000 spaces, Unicode spaces, and a 13 000-character `#` comment. 280 tests, corpus ceilings held, E2E 13.
- Open doubt: a command whose keyword is not in the marker list, sitting more than 12 000 characters from both ends, is still missed. Every current pattern’s keyword is in that list. Letters glued directly onto `curl` (`aaaacurl`) do not match `\b`, which is what we want.

### Self-check

- Real user, real attack: Yes. A page can pad a PowerShell command and the old check waved it through. The bridge blocks that copy. The exact CrashFix figure is still not transcribed; this closes the length bypass for the class we already detect.
- Five-minute bypass: Command in the middle, more than 12 000 characters from both ends, with a keyword we list. Tested (`a` × 20 000, command, `a` × 20 000). A keyword we forgot would miss. The list is the keywords the patterns already use.
- False alarm: rustup’s `curl | sh` stays `weak`, including after a long prefix and a newline. Measured. It is blocked only when the page shows the captcha / Win+R script, which was already the rule. Corpus ceilings unchanged.
- Simpler or more complicated: More code in two copies (engine and bridge). The sync test compares the patterns and the marker list. The extra code is the check that was missing.
- AGENTS.md: The ReDoS test was changed because it required the bypass. No threshold or fixture was loosened to hide a miss. Corpus ceilings untouched.
- Would I defend it: Yes. A long string is not harmless. I would not claim every possible command shape in the middle of a novel is caught.
- Harmless on weird input: The old `length > 12000 return null` is gone. Prompt, script, session-id, and QR checks no longer return “no” only because the string is long. A too-long host and an unparseable URL still return no, on purpose.

## 2026-11-15 — CrashFix and TerminalFix command text

## 2026-11-15 — CrashFix and TerminalFix command text

- Hypothesis: The February 2026 CrashFix advisory contains a clipboard command that `clickFixTier` does not treat as strong, so a user who pastes it is unprotected.
- Result: No code. Both advisories show the command as a figure. The CrashFix hunting query is `cmd.exe` + `start` + `finger.exe` + `ct.exe`. The current strong pattern is `finger user@host |`. Those are not the same string. Inventing the missing characters would flag or miss the wrong thing.
- Evidence: Microsoft Security Blog, fetched 2026-11-15, URLs in `BACKLOG.md`. `src/engine/page/clickfix.ts` line for `finger`.
- Open doubt: the exact command. Also whether the page says Win+R or only “the browser crashed”. Not read from the image.

### Self-check

- Real user, real attack: Not this pass. Shipping a guessed `finger.exe` rule could false-alarm on a docs page that mentions the tool, or miss the real command.
- Five-minute bypass: Not applicable. No new check.
- False alarm: None added.
- Simpler or more complicated: No code. Correct.
- AGENTS.md: Not stretched. Unconfirmed command was not built on.
- Would I defend it: Yes, as “we did not invent the command.” Not as coverage of CrashFix.

## 2026-11-15 — Threat model matches the manifest

- Hypothesis: `THREAT_MODEL.md` still told a reviewer that websites cannot connect and that DNR never redirects. Both were already false in code, so the doc was the bug.
- Result: The elevation row now describes localhost in source, deletion of that key on a store pack with no https pay origin, and `ACTIVATE_LICENSE` only. The DNR row now says the redirect target is this extension's warning page.
- Evidence: `src/billing/connectable.ts`, `scripts/pack-store.mjs`, `warningRedirect` in `src/network/dnr.ts`. Tests unchanged: 279 unit, 13 Edge E2E. Corpus ceilings held.
- Open doubt: none in the doc. The pay-origin path with a real `VITE_PAY_ORIGIN` was not packed again in this pass. The code path is the one read above. The earlier pack measurement (no key) is still the 2026-11-15 zip in the P0 table.

### Self-check

- Real user, real attack: No new block. A reviewer who believed the old sentence would miss a real connectable origin and a real redirect. The code was already restricted. This pass stops the doc from hiding that.
- Five-minute bypass: Not a new control. The message gate still refuses `UPDATE_SETTINGS` from a web page. That test already exists.
- False alarm: None. No scoring change.
- Simpler or more complicated: The threat model is longer and accurate. No runtime code.
- AGENTS.md: Not stretched.
- Would I defend it: Yes, as a correction. Not as a new protection.

## 2026-11-15 — Last feed chunk and live rule 80000

- Hypothesis: Chrome might accept a 49-rule file and still not enforce the tail of `requestDomains`, and a dynamic rule id of 80000 might be stored but not applied.
- Result: Edge redirected both `www-robinhood-com-login-guide.typedream.app` and `zzzzzzbxxxx.weebly.com` (first and last host of rule 49, 1,353 hosts) to `warning.html?blocked=feed`. A dynamic rule at id 80000 redirected `live-rule-probe.example` only. `live-rule-other.example` stayed on the page. After the rule was removed, the probe host stayed on the page.
- Evidence: `tests/e2e/live.spec.ts` (13 passed), `tests/security/live-feed.test.ts` pins ids 80000–80002. `npm test` 279, corpus ceilings held.
- Open doubt: 1,351 hosts in the middle of rule 49 were not navigated. A truncation that kept the first and last entry and dropped the middle is not ruled out. No Chrome document describes that shape.

### Self-check

- Real user, real attack: Yes for the two hosts that were loaded. They are entries from the shipped phishing list. The browser never contacted them (`MAP * 127.0.0.1`). The rule match is what a user would hit.
- Five-minute bypass: A host outside the rule was loaded and was not redirected. That path is tested. Putting a phish in the untested middle of the chunk is not a bypass the attacker chooses; the list order is ours.
- False alarm: `live-rule-other.example` stayed up. Measured in that test, not assumed. Corpus ceilings unchanged.
- Simpler or more complicated: No production code. Two browser tests. Worth keeping.
- AGENTS.md: Not stretched. No threshold or fixture edit.
- Would I defend it: Yes, as “the last rule’s ends are enforced, and id 80000 is enforced.” Not as “all 385,353 hosts were opened.”

## 2026-11-15 — Permission proposal (no manifest change)

- Hypothesis: `contentSettings`, `privacy`, `scripting`, and `management` can move to `optional_permissions` and the install warning gets smaller without dropping default protection.
- Result: Rejected as a code change. Chrome’s permissions page (fetched 2026-11-15) allows those four as optional. `privacy` backs `hardenBrowser`, which defaults on. `management` backs `checkExtensions` on every boot. `scripting` has no warning text on the permission list. Only `contentSettings` both defaults off and carries an install warning. Left every permission required.
- Evidence: `RELEASE_AUDIT.md` section “Permission proposal, 2026-11-15”. No test change. Manifest diff is empty.
- Open doubt: whether Chrome Web Store builds still return `getMatchedRules` when `declarativeNetRequestFeedback` is ignored. Not measured. Whether an update keeps a grant that moved from required to optional. Not measured.

### Self-check

- Real user, real attack: No. This pass records a decision. It does not block a phish, a tracker, or a download.
- Five-minute bypass: Not applicable. Nothing new is enforced. An attacker does not need to bypass a proposal.
- False alarm: None added. Not a scoring change. Corpus ceilings held on this pass (35 files, 279 tests). Edge E2E 11 passed.
- Simpler or more complicated: No runtime code. The audit got longer. That is the record the next pass needs so `privacy` is not moved by accident.
- AGENTS.md: Not stretched. No threshold, fixture, permission, or network change.
- Would I defend it: Yes, as “we looked and did not shrink permissions,” not as a new protection.
