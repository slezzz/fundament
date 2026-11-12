/**
 * Convert a small, explicit subset of ABP network filters into hosts.
 * Cosmetic rules, regex, wildcards, and exceptions are ignored on purpose:
 * those do not map safely onto declarativeNetRequest.
 */
export const HOSTS_PER_DNR_RULE = 40;

export function parseNetworkHosts(text: string): string[] {
  const hosts = new Set<string>();
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

export function canonicalHostPayload(hosts: string[]): string {
  return [...new Set(hosts.map((h) => h.trim().toLowerCase()).filter(Boolean))].sort().join("\n");
}

export async function sha256Hex(value: string, cryptoObj: Crypto = crypto): Promise<string> {
  const digest = await cryptoObj.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CompiledDnrRule {
  id: number;
  priority: number;
  action: { type: "block" };
  condition: {
    domainType: "thirdParty";
    requestDomains: string[];
    resourceTypes: string[];
  };
}

const RESOURCE_TYPES = [
  "script",
  "xmlhttprequest",
  "image",
  "sub_frame",
  "ping",
  "media",
  "font",
  "other",
];

export function hostsToDnrRules(hosts: string[], startId: number, maxRules = 500): CompiledDnrRule[] {
  const unique = [...new Set(hosts.map((h) => h.trim().toLowerCase()).filter(Boolean))].sort();
  const rules: CompiledDnrRule[] = [];
  for (let i = 0; i < unique.length && rules.length < maxRules; i += HOSTS_PER_DNR_RULE) {
    const requestDomains = unique.slice(i, i + HOSTS_PER_DNR_RULE);
    rules.push({
      id: startId + rules.length,
      priority: 1,
      action: { type: "block" },
      condition: {
        domainType: "thirdParty",
        requestDomains,
        resourceTypes: RESOURCE_TYPES,
      },
    });
  }
  return rules;
}

export function parseHttpsUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url.toString();
}

export function parseSha256Pin(raw: string): string | null {
  const hex = raw.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) return null;
  return hex;
}

export interface HostPack {
  v: 1;
  kind: "dnr-hosts";
  hosts: string[];
  sha256: string;
  sig?: string;
}

export function parseHostPack(raw: unknown): HostPack | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 || o.kind !== "dnr-hosts") return null;
  if (typeof o.sha256 !== "string") return null;
  const sha256 = parseSha256Pin(o.sha256);
  if (!sha256) return null;
  if (!Array.isArray(o.hosts)) return null;
  const hosts: string[] = [];
  for (const item of o.hosts) {
    if (typeof item !== "string") continue;
    const host = item.trim().toLowerCase();
    if (!host || host.length > 253 || host.includes("/") || host.includes("*")) continue;
    hosts.push(host);
    if (hosts.length > 5000) break;
  }
  const sig = typeof o.sig === "string" && o.sig.length > 0 && o.sig.length < 256 ? o.sig : undefined;
  return { v: 1, kind: "dnr-hosts", hosts, sha256, sig };
}
