/**
 * Refresh the shipped phishing host list from public, permissively licensed feeds.
 *
 *   npm run feeds        (network; run before a release, commit the result)
 *
 * Sources
 *   - Phishing.Database ACTIVE domains — MIT — github.com/mitchellkrogza/Phishing.Database
 *
 * Safety filter: an entry is dropped when blocking it would take down a whole platform
 * or an official brand property (sites.google.com, accounts.google.com, github.io, …).
 * User subdomains on hosting zones (evil.pages.dev, x.s3.amazonaws.com) are kept: that is
 * exactly where kits live, and DNR `requestDomains` only matches that subtree.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  {
    id: "phishing-database",
    license: "MIT",
    url: "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt",
  },
];

/** Zones where every subdomain is user content: listing a subdomain there is fine. */
const USER_CONTENT_ZONES = [
  "githubusercontent.com", "googleusercontent.com", "amazonaws.com", "windows.net", "azureedge.net",
  "myshopify.com", "sharepoint.com", "dropboxusercontent.com", "force.com", "atlassian.net", "notion.site",
  "gitbook.io", "translate.goog", "appspot.com", "blogspot.com", "github.io", "cloudfront.net", "web.app",
  "firebaseapp.com", "goo.gl", "page.link", "cloudapp.azure.com", "azurecontainerapps.io", "azurestaticapps.net",
];

function stringsIn(file, re) {
  const text = readFileSync(resolve(root, file), "utf8");
  return [...text.matchAll(re)].map((m) => m[1]);
}

const brandDomains = new Set(
  stringsIn("src/engine/impersonation/brands.ts", /domains: \[([^\]]*)\]/g).flatMap((list) =>
    [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase()),
  ),
);
const hostingSuffixes = new Set(stringsIn("src/engine/url/hosting.ts", /"([a-z0-9-]+(?:\.[a-z0-9-]+)+)"/g));
const neverBlock = new Set([
  ...hostingSuffixes,
  "duckdns.org", "my.id", "ddns.net", "no-ip.com", "hopto.org", "zapto.org", "sytes.net", "freedns.afraid.org",
  "com.br", "com.au", "co.uk", "co.in", "com.mx", "co.za", "co.jp", "com.tr", "com.ar", "com.cn",
]);

function underZone(host, zone) {
  return host.endsWith(`.${zone}`) && host.length > zone.length + 1;
}

export function keepHost(host) {
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(host) || !host.includes(".") || host.length > 253) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  if (neverBlock.has(host)) return false;
  if (brandDomains.has(host)) return false;
  const labels = host.split(".");
  for (let i = 1; i < labels.length - 1; i++) {
    const parent = labels.slice(i).join(".");
    if (brandDomains.has(parent)) {
      // accounts.google.com must never be blocked; evil.github.io may be.
      return USER_CONTENT_ZONES.some((zone) => underZone(host, zone));
    }
  }
  return true;
}

async function main() {
  const all = new Set();
  const report = [];
  for (const source of SOURCES) {
    const response = await fetch(source.url, { headers: { "User-Agent": "fundament-feed-builder" } });
    if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
    const text = await response.text();
    let kept = 0;
    let dropped = 0;
    for (const raw of text.split(/\r?\n/)) {
      const host = raw.trim().toLowerCase().replace(/\.$/, "");
      if (!host || host.startsWith("#")) continue;
      if (keepHost(host)) {
        all.add(host);
        kept += 1;
      } else {
        dropped += 1;
      }
    }
    report.push(`${source.id} (${source.license}): kept ${kept}, dropped ${dropped}`);
  }
  if (all.size < 1000) throw new Error(`Suspiciously small feed (${all.size}); refusing to overwrite.`);

  const hosts = [...all].sort();
  mkdirSync(resolve(root, "filters/feeds"), { recursive: true });
  writeFileSync(resolve(root, "filters/feeds/phishing-hosts.txt"), `${hosts.join("\n")}\n`);
  writeFileSync(
    resolve(root, "filters/feeds/SOURCES.md"),
    [
      "# Shipped threat feed",
      "",
      `Generated: ${new Date().toISOString()}`,
      `Hosts: ${hosts.length}`,
      "",
      ...SOURCES.map((s) => `- ${s.id} — ${s.license} — ${s.url}`),
      "",
      ...report.map((r) => `- ${r}`),
      "",
      "Regenerate with `npm run feeds` and commit. Entries that would block a platform or an official",
      "brand host are filtered (see scripts/fetch-threat-feeds.mjs).",
      "",
    ].join("\n"),
  );
  process.stdout.write(`${report.join("\n")}\nwrote ${hosts.length} hosts\n`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("fetch-threat-feeds.mjs")) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
