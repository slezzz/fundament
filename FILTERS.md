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

Downloads Phishing.Database `phishing-domains-ACTIVE.txt` (MIT) and writes `filters/feeds/phishing-hosts.txt`, `SOURCES.md`, and `public/data/hosted-zones.txt`. Commit all three. Refresh before every release; phishing hosts live for days, not months.

DNR can only block whole hosts, while feeds list hosts for single bad URLs too. Before shipping, an entry is dropped when blocking it would break a service:

| Dropped | Why | Examples seen in the raw feed |
|---------|-----|-------------------------------|
| Public suffixes and platform roots | Would block every site on the platform | `sites.google.com`, `pages.dev` |
| Official brand hosts and their non-user subdomains | Never block the real service | `accounts.google.com`, `appengine.google.com` |
| URL shorteners | Would break every short link | `bit.ly`, `bit.do`, `cutt.us` |
| Registrable domains in the Majestic top 50k | A listing there is one bad URL on a big site | `pastebin.com`, `telegra.ph`, `blog.naver.com`, `mercadolibre.com.ar` |

Kept: user subdomains on hosting zones (`evil.pages.dev`, `x.weebly.com`, `y.ewp.live`). A popular domain with ≥ 5 listed subdomains is treated as such a zone automatically and written to `hosted-zones.txt`; the engine uses that file so these subdomains never inherit the platform's popularity.

## Domain reference data

```bash
npm run domain-data
```

Rebuilds `src/engine/domain/psl-data.ts` (Public Suffix List, MPL-2.0), `public/data/popular-domains.txt` (Majestic Million top 50k, CC BY 3.0), and the false-positive corpora in `tests/fixtures/`. Run it before `npm run feeds` (the feed filter reads the popularity list). The corpora are enforced by `tests/security/corpus.test.ts`.

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
