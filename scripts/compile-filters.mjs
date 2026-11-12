import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const THIRD_PARTY_TYPES = ["script", "xmlhttprequest", "image", "sub_frame", "ping", "media", "font", "other"];
const SUBRESOURCE_TYPES = ["sub_frame", "script", "xmlhttprequest", "image", "ping", "media", "font", "stylesheet", "websocket", "other"];

function parseNetworkHosts(text) {
  const hosts = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("!") || line.startsWith("[")) continue;
    if (line.startsWith("@@") || line.includes("##") || line.includes("#@#")) continue;
    const match = /^\|\|([a-z0-9][a-z0-9.-]{0,251})\^/i.exec(line);
    if (!match?.[1]) continue;
    const host = match[1].toLowerCase();
    if (host.includes("*") || host.startsWith(".") || host.endsWith(".")) continue;
    hosts.add(host);
  }
  return [...hosts].sort();
}

/** Plain one-host-per-line list produced by scripts/fetch-threat-feeds.mjs. */
function readPlainHosts(relative) {
  const file = resolve(root, relative);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith("#") && /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(line));
}

function hostsToDnrRules(hosts, startId, { thirdParty = true, resourceTypes = THIRD_PARTY_TYPES, priority = 1 } = {}) {
  const rules = [];
  for (let i = 0; i < hosts.length; i += 40) {
    const condition = {
      requestDomains: hosts.slice(i, i + 40),
      resourceTypes,
    };
    if (thirdParty) condition.domainType = "thirdParty";
    rules.push({
      id: startId + rules.length,
      priority,
      action: { type: "block" },
      condition,
    });
  }
  return rules;
}

/**
 * Known-bad page hosts: the top-level visit is redirected to the Fundament warning page
 * (the user can still continue), everything the page tries to load is blocked outright.
 */
function threatPageRules(hosts, startId, reason, chunk) {
  const rules = [];
  for (let i = 0; i < hosts.length; i += chunk) {
    const requestDomains = hosts.slice(i, i + chunk);
    rules.push({
      id: startId + rules.length,
      priority: 5,
      action: { type: "redirect", redirect: { extensionPath: `/warning.html?blocked=${reason}` } },
      condition: { requestDomains, resourceTypes: ["main_frame"] },
    });
    rules.push({
      id: startId + rules.length,
      priority: 5,
      action: { type: "block" },
      condition: { requestDomains, resourceTypes: SUBRESOURCE_TYPES },
    });
  }
  return rules;
}

function readHosts(relative) {
  return parseNetworkHosts(readFileSync(resolve(root, relative), "utf8"));
}

function writeJson(relative, value, pretty = true) {
  writeFileSync(resolve(root, relative), `${pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value)}\n`);
}

const trackerHosts = readHosts("filters/trackers-extended.txt");
const adsHosts = readHosts("filters/ads-networks.txt");
const malwareHosts = readHosts("filters/malware-download-hosts.txt");
const minerHosts = readHosts("filters/miners.txt");
const threatDocHosts = readHosts("filters/web3-ai-threats.txt");
const feedHosts = readPlainHosts("filters/feeds/phishing-hosts.txt");

const trackerRules = hostsToDnrRules(trackerHosts, 1);
const adsRules = hostsToDnrRules(adsHosts, 1);
const minerRules = hostsToDnrRules(minerHosts, 1000, { thirdParty: true, resourceTypes: [...THIRD_PARTY_TYPES, "websocket"], priority: 2 });
const docRules = threatPageRules(threatDocHosts, 1200, "threat", 500);
const threats = [...minerRules, ...docRules];
// Feed hosts are phishing *pages*: one redirect rule per chunk (pages + frames) keeps the
// ruleset at one copy of each host instead of two.
const feedRules = [];
for (let i = 0; i < feedHosts.length; i += 8000) {
  feedRules.push({
    id: 1 + feedRules.length,
    priority: 5,
    action: { type: "redirect", redirect: { extensionPath: "/warning.html?blocked=feed" } },
    condition: { requestDomains: feedHosts.slice(i, i + 8000), resourceTypes: ["main_frame", "sub_frame"] },
  });
}

const payload = trackerHosts.join("\n");
const sha256 = createHash("sha256").update(payload).digest("hex");

mkdirSync(resolve(root, "public/rules"), { recursive: true });
mkdirSync(resolve(root, "public/data"), { recursive: true });
writeJson("public/rules/trackers-extended.json", trackerRules);
writeJson("public/rules/ads-extra.json", adsRules);
writeJson("public/rules/threats-core.json", threats);
writeJson("public/rules/threats-feed.json", feedRules, false);
writeJson("public/data/threats-feed.meta.json", {
  hostCount: feedHosts.length,
  generatedFrom: "filters/feeds/phishing-hosts.txt",
});
writeJson("public/data/malware-download-hosts.json", malwareHosts);
writeJson("public/data/trackers-extended.meta.json", {
  hostCount: trackerHosts.length,
  sha256,
  generatedFrom: "filters/trackers-extended.txt",
});
writeJson("public/data/ads-extra.meta.json", {
  hostCount: adsHosts.length,
  generatedFrom: ["filters/ads-networks.txt"],
});

process.stdout.write(
  `compiled ads-extra ${adsHosts.length} hosts / extended ${trackerHosts.length} / threats ${minerHosts.length + threatDocHosts.length} / phishing feed ${feedHosts.length}\n`,
);
