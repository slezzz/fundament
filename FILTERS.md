# Filter packs

Fundament does **not** compile EasyList inside the service worker. Chrome’s dynamic rule budget and the store’s remote-code rules make that a bad idea.

## Shipped lists

- Ads (Free): `filters/ads-networks.txt` → `public/rules/ads-extra.json` (`ads-extra` ruleset, on with tracker blocking)
- Extra trackers (Pro): `filters/trackers-extended.txt` → `public/rules/trackers-extended.json`
- Threats: `filters/miners.txt` + `filters/web3-ai-threats.txt` → `public/rules/threats-core.json`
- Download extras: `filters/malware-download-hosts.txt` → `public/data/malware-download-hosts.json`

- Phishing feed (Free): `filters/feeds/phishing-hosts.txt` → `public/rules/threats-feed.json` (`threats-feed` ruleset, on with threat protection + IOC feeds). Pages and frames on these hosts are redirected to `warning.html?blocked=feed`.

Build: `npm run filters` (also runs before `npm run build`).

## Refreshing the phishing feed

```bash
npm run feeds
```

Downloads Phishing.Database `phishing-domains-ACTIVE.txt` (MIT), drops entries that would block a whole platform or an official brand host (for example `sites.google.com`, `accounts.google.com`, `github.io` itself) while keeping user subdomains on hosting zones (`evil.pages.dev`), and writes `filters/feeds/phishing-hosts.txt` plus `SOURCES.md`. Commit both. Refresh before every release; phishing hosts live for days, not months.

The allowlist overrides the feed (priority 100 vs 5), so a false positive can always be fixed by the user. "Continue anyway" adds a session-only, tab-only allow rule.

URLhaus stopped serving its free host downloads (HTTP 410). OpenPhish's free feed is not licensed for redistribution, so it is not bundled.

Cosmetic ABP (`##`), exceptions (`@@`), regex, and wildcards are ignored.

## Optional remote pack (opt-in)

JSON only:

```json
{
  "v": 1,
  "kind": "dnr-hosts",
  "hosts": ["tracker.example"],
  "sha256": "<sha256 of sorted hosts joined by newline>",
  "sig": "<optional Ed25519 over the hex digest, license key>"
}
```

Requirements:

- HTTPS URL
- SHA-256 pin saved in settings **before** fetch (no unpinned downloads)
- Optional signature with the same Ed25519 key as licenses: `npm run pack:sign -- filters/trackers-extended.txt`

Publish the JSON yourself. Fundament will not fetch easylist.to.
