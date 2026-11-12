/**
 * Versioned IOC host lists. Local validation only — the worker never
 * sends browsing data to a feed. Rollback keeps the previous snapshot.
 */

import { canonicalHostPayload, parseHttpsUrl, parseSha256Pin, sha256Hex } from "@engine/filters/abp";

export const IOC_FORMAT = "fundament-ioc-v1";
export const IOC_MAX_HOSTS = 2000;
export const IOC_MAX_BYTES = 256 * 1024;

export interface IocSnapshot {
  version: number;
  format: typeof IOC_FORMAT;
  source: string;
  hosts: string[];
  sha256: string;
  appliedAt: number;
}

export interface IocState {
  current: IocSnapshot | null;
  previous: IocSnapshot | null;
  error: string | null;
}

export const EMPTY_IOC_STATE: IocState = {
  current: null,
  previous: null,
  error: null,
};

function cleanHosts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const host = item.trim().toLowerCase().replace(/\.$/, "");
    if (!host || host.length > 253) continue;
    if (host.includes("/") || host.includes(":") || host.includes("*")) continue;
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(host) && !/^[a-z0-9]+$/.test(host)) continue;
    if (!out.includes(host)) out.push(host);
    if (out.length >= IOC_MAX_HOSTS) break;
  }
  return out.sort();
}

/** URLhaus-style hosts file or one-host-per-line comments. */
export function parseHostsFile(text: string): string[] {
  const hosts: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    const token = line.replace(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+/, "").split(/\s+/)[0] ?? "";
    const host = token.toLowerCase().replace(/\.$/, "");
    if (!host || host.length > 253 || host.includes("/")) continue;
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(host) && !/^[a-z0-9]+$/.test(host)) continue;
    if (!hosts.includes(host)) hosts.push(host);
    if (hosts.length >= IOC_MAX_HOSTS) break;
  }
  return hosts.sort();
}

export async function snapshotFromHosts(
  hosts: string[],
  source: string,
  version: number,
  now = Date.now(),
): Promise<IocSnapshot> {
  const cleaned = cleanHosts(hosts);
  return {
    version,
    format: IOC_FORMAT,
    source: source.slice(0, 200),
    hosts: cleaned,
    sha256: await sha256Hex(canonicalHostPayload(cleaned)),
    appliedAt: now,
  };
}

export function parseIocDocument(value: unknown): { version: number; source: string; hosts: string[] } | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  const format = o.format;
  if (format !== undefined && format !== IOC_FORMAT) return null;
  const version = typeof o.version === "number" && Number.isInteger(o.version) && o.version >= 0 ? o.version : 0;
  const source = typeof o.source === "string" ? o.source : "local";
  const hosts = cleanHosts(o.hosts);
  if (hosts.length === 0) return null;
  return { version, source, hosts };
}

export function applySnapshot(
  state: IocState,
  incoming: IocSnapshot,
): { ok: true; state: IocState } | { ok: false; error: string } {
  if (incoming.hosts.length === 0) {
    return { ok: false, error: "IOC list is empty." };
  }
  if (state.current && incoming.version < state.current.version) {
    return { ok: false, error: "Incoming IOC version is older than the active list. Use rollback instead." };
  }
  if (state.current && incoming.sha256 === state.current.sha256) {
    return { ok: true, state: { ...state, error: null } };
  }
  return {
    ok: true,
    state: {
      current: incoming,
      previous: state.current,
      error: null,
    },
  };
}

export function rollbackSnapshot(state: IocState): { ok: true; state: IocState } | { ok: false; error: string } {
  if (!state.previous) {
    return { ok: false, error: "No previous IOC list to restore." };
  }
  return {
    ok: true,
    state: {
      current: state.previous,
      previous: state.current,
      error: null,
    },
  };
}

export async function ingestFeedBytes(
  bytes: ArrayBuffer,
  contentType: string,
  source: string,
  pin: string | null,
  versionHint = 0,
): Promise<{ ok: true; snapshot: IocSnapshot } | { ok: false; error: string }> {
  if (bytes.byteLength > IOC_MAX_BYTES) {
    return { ok: false, error: "IOC feed is larger than 256 KB." };
  }
  const text = new TextDecoder().decode(bytes);
  let hosts: string[] = [];
  let version = versionHint;
  let label = source;
  if (/json/i.test(contentType) || text.trim().startsWith("{")) {
    try {
      const parsed = parseIocDocument(JSON.parse(text) as unknown);
      if (!parsed) return { ok: false, error: "IOC JSON is not a fundament-ioc-v1 document." };
      hosts = parsed.hosts;
      version = parsed.version || versionHint;
      label = parsed.source || source;
    } catch {
      return { ok: false, error: "IOC JSON could not be parsed." };
    }
  } else {
    hosts = parseHostsFile(text);
  }
  if (hosts.length === 0) return { ok: false, error: "IOC feed contained no usable hosts." };
  const snapshot = await snapshotFromHosts(hosts, label, version);
  const expected = pin ? parseSha256Pin(pin) : null;
  if (expected && snapshot.sha256 !== expected) {
    return { ok: false, error: "IOC hash does not match the pin you saved." };
  }
  return { ok: true, snapshot };
}

export function feedFetchUrl(raw: string): string | null {
  return parseHttpsUrl(raw);
}
