# Work log

Newest first. One entry per pass.

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
