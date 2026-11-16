# Extension blocklist

**Recommendation: No.** Do not ship extension ids, and do not add a feed for them. Permission changes on other extensions are already watched. A list of “bad” ids needs a license before any id is added, and it is the kind of list a store review reads as acting on other extensions.

## Threat and primary source

The threat is a named extension the user already installed: a hijacked listing, a side-loaded build, or a kit that poses as a helper. Chrome updates extensions without a prompt. The in-product response that exists today is the permission diff in `src/engine/audit/changes.ts`: a snapshot of name, version, permissions, host permissions, install type, and enabled state, keyed by extension id, kept in `chrome.storage.local`. The first run records a baseline and does not alarm. Later, a new dangerous permission or a wide host pattern raises a local notification.

A published extension id was deliberately left out of every list here. The CrashFix note in `RELEASE_AUDIT.md` (Microsoft, 5 February 2026) records that choice.

There is no separate primary incident, dated and licensed for reuse, that names ids this project is allowed to ship. Until that exists, there is no blocklist to write.

## What the browser can see

`chrome.management.getAll` already returns the installed extensions’ ids, names, and permissions. The worker already calls it on startup (`checkExtensions`). It does not disable other extensions. It does not send the ids anywhere.

## Detection

No id list in this memo is approved to build.

A later design, only after a license that covers the ids, would compare installed ids to a list shipped in the extension or delivered as signed JSON, the same way the host feed is signed: Ed25519, strictly newer, freshness and expiry, and a client-side filter. The filter would have to refuse whole classes rather than “this id looks popular,” because an id list has no popularity file. The action would be a local warning, not `management.setEnabled`. Auto-disabling another extension is out of scope.

Which classes the filter would refuse is **nicht bestätigt**. Naming them now would be a guess.

## Data read

Today: the snapshot already stored locally. No new fields.

A list would be ids the project chose to publish. It would not include names scraped from a store page, review text, or the user’s enabled set sent outbound.

## Does anything leave the device

No. A new feed GET would be a new network request and needs its own yes. This memo does not ask for that request. Installed ids stay on the device.

## Permissions

`management` stays required. It backs the boot-time diff. Moving it to `optional_permissions` would turn that watch off until a click. That is a separate decision, already rejected for the default install in the 2026-11-15 permission note.

## False alarms and the counterexample corpus

The legitimate members of “an extension id we might warn on” are ordinary extensions that share a permission, a name, or a host pattern with a kit. An id list does not have that ambiguity for a listed id, and has nothing to say about an id that is not listed. The false-alarm case that matters is a wrong id: a legitimate extension named by mistake, or a reused id after the listing changed. The counterexample set would be the shipped ids checked against the Chrome Web Store listing on the day they were added, plus a test that a popular extension id is not in the file. That set cannot be built before a license allows the ids to be written down.

The permission diff’s counterexamples already live in `tests/unit/layer-v2.test.ts` (“extension supply-chain watch”). They stay the coverage for this threat.

## Store policy

Program policies and the MV3 remote-code rule were read 2026-11-15. Remote JSON is data, not code. A signed id list could fit that sentence. The same policies require a single purpose and limited use of user data. A list whose job is to warn about, or switch off, other extensions is a step past “this extension gained a permission.” Do not take that step without a store-listing change and a license. Neither is in hand.

## Effort

Large, and blocked before the first id. License, a signed list, a client filter, store text, and a corpus of ids that must not match. The current diff is the smaller feature and it is already shipped.

## Recommendation

**No.**
