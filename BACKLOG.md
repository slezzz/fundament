# Backlog

Highest user benefit first. A row is done only after a test or a cited measurement in `RELEASE_AUDIT.md`.

## Next

1. **`THREAT_MODEL.md` still denies `externally_connectable` and says DNR never redirects.** The manifest allows the local pay origin; the store pack strips it. Static and dynamic feed rules redirect to `warning.html`. A reviewer who trusts the old paragraph will miss both. Doc fix, no new protection by itself. The feed-tail check is done (rule 49 ends, live id 80000); the untested middle of that rule is a residual note in `RELEASE_AUDIT.md`, not a reason to navigate 1,351 more hosts before the doc matches the code.
2. **Store listing versus behavior.** Single-purpose and privacy-form text against the dashboard. Policies fetched 2026-11-15. A wrong listing is a store rejection, not a missed phish.

## Wartet auf Freigabe

- Move `contentSettings` to `optional_permissions` and request it from the notification-prompt toggle. Pros: drops the install warning “Change your settings that control websites' access to features…”. Cons: needs a user gesture; unknown whether an update keeps an already granted required permission. `privacy`, `scripting`, and `management` stay required (see the audit proposal). Do not edit the manifest until this is a yes.
- ConsentFix-style localhost redirect detection. Concept before code.
- Device-code opener / referrer hint. Concept before code.
- A malicious extension-id list. Needs a license before any data is added.

## Later, already named in the audit

- Current attack variants (AiTM, device-code, passkey downgrade, later paste-lures, wallet delegation, agent prompt injection) only after Phase 1 measurement gaps above are closed.
- Password reuse and card skimmers: each changes the privacy promise or needs a checkout corpus. Plan first.
- No milliseconds-per-navigation budget.
- Accessibility of popup, warning page, and dashboard.
- Manual checklist not clicked by a person.
- Supply chain: `npm audit`, action SHA pins, reproducible zip.
