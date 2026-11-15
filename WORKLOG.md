# Work log

Newest first. One entry per pass.

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
