/**
 * Live phishing feed: hosts that became active since the release was built.
 *
 * Trust model
 * - The file is signed with Ed25519; the public key is compiled into the extension.
 *   Whoever controls the hosting cannot change the list without the private key.
 * - Only strictly newer versions are accepted (no rollback to an older list).
 * - Lists older than MAX_AGE_MS are rejected; a stored list older than DROP_AFTER_MS
 *   is dropped, because cleaned-up domains get re-registered by legitimate owners.
 * - Defense in depth: even a correctly signed list can never block a popular domain
 *   or an official brand host (applied by the caller with clientSafeHosts).
 *
 * Format (JSON):
 *   { "format": "fundament-live-v1", "version": 202611120617, "generated": "<ISO>",
 *     "hosts": ["evil.example", …], "sig": "<base64 Ed25519 over canonicalLivePayload>" }
 */
export const LIVE_FORMAT = "fundament-live-v1";
export const LIVE_MAX_HOSTS = 100_000;
export const LIVE_MAX_BYTES = 6 * 1024 * 1024;
export const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
export const DROP_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export interface LiveFeed {
  version: number;
  generated: string;
  hosts: string[];
  sig: string;
}

export type LiveResult = { ok: true; feed: LiveFeed } | { ok: false; error: string };

const HOST_RE = /^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function canonicalLivePayload(version: number, generated: string, hosts: readonly string[]): string {
  return `${LIVE_FORMAT}\n${version}\n${generated}\n${hosts.join("\n")}`;
}

export function parseLiveFeed(raw: unknown): LiveResult {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "not an object" };
  const o = raw as Record<string, unknown>;
  if (o.format !== LIVE_FORMAT) return { ok: false, error: "unknown format" };
  if (typeof o.version !== "number" || !Number.isSafeInteger(o.version) || o.version <= 0) {
    return { ok: false, error: "bad version" };
  }
  if (typeof o.generated !== "string" || !Number.isFinite(Date.parse(o.generated))) {
    return { ok: false, error: "bad timestamp" };
  }
  if (typeof o.sig !== "string" || o.sig.length < 40 || o.sig.length > 200) return { ok: false, error: "bad signature field" };
  if (!Array.isArray(o.hosts) || o.hosts.length > LIVE_MAX_HOSTS) return { ok: false, error: "bad host list" };
  const hosts: string[] = [];
  for (const item of o.hosts) {
    if (typeof item !== "string" || item.length > 253 || !HOST_RE.test(item)) return { ok: false, error: "malformed host" };
    hosts.push(item);
  }
  for (let i = 1; i < hosts.length; i++) {
    if ((hosts[i - 1] ?? "") >= (hosts[i] ?? "")) return { ok: false, error: "hosts not sorted and unique" };
  }
  return { ok: true, feed: { version: o.version, generated: o.generated, hosts, sig: o.sig } };
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function verifyLiveFeed(
  feed: LiveFeed,
  publicKeySpkiB64: string,
  options: { now?: number; lastVersion?: number; cryptoObj?: Crypto } = {},
): Promise<LiveResult> {
  const now = options.now ?? Date.now();
  const subtle = (options.cryptoObj ?? crypto).subtle;
  if (!publicKeySpkiB64) return { ok: false, error: "no public key configured" };
  if (options.lastVersion !== undefined && feed.version <= options.lastVersion) {
    return { ok: false, error: "not newer than the installed list" };
  }
  const generated = Date.parse(feed.generated);
  if (generated > now + 60 * 60 * 1000) return { ok: false, error: "timestamp in the future" };
  if (now - generated > MAX_AGE_MS) return { ok: false, error: "list is too old" };
  try {
    const key = await subtle.importKey("spki", base64ToBytes(publicKeySpkiB64) as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    const data = new TextEncoder().encode(canonicalLivePayload(feed.version, feed.generated, feed.hosts));
    const valid = await subtle.verify({ name: "Ed25519" }, key, base64ToBytes(feed.sig) as BufferSource, data);
    return valid ? { ok: true, feed } : { ok: false, error: "signature does not match" };
  } catch {
    return { ok: false, error: "signature could not be checked" };
  }
}

/** Defense in depth: never block an established site or an official brand host, whatever the list says. */
export function clientSafeHosts(
  hosts: readonly string[],
  isProtected: (host: string) => boolean,
): string[] {
  return hosts.filter((host) => !isProtected(host));
}
