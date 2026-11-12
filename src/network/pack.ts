import { LICENSE_PUBLIC_KEY_SPKI_B64 } from "@billing/publicKey";
import {
  canonicalHostPayload,
  parseHostPack,
  parseHttpsUrl,
  parseSha256Pin,
  sha256Hex,
  type HostPack,
} from "@engine/filters/abp";

const MAX_BYTES = 512 * 1024;

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyOptionalSig(sha256: string, sig: string | undefined): Promise<boolean> {
  if (!sig) return true;
  try {
    const raw = base64UrlToBytes(LICENSE_PUBLIC_KEY_SPKI_B64.replace(/-/g, "+").replace(/_/g, "/"));
    const key = await crypto.subtle.importKey("spki", raw as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    return crypto.subtle.verify("Ed25519", key, base64UrlToBytes(sig) as BufferSource, new TextEncoder().encode(sha256));
  } catch {
    return false;
  }
}

export async function verifyHostPack(
  pack: HostPack,
  pin: string,
): Promise<{ ok: true; hosts: string[] } | { ok: false; error: string }> {
  const expected = parseSha256Pin(pin);
  if (!expected) return { ok: false, error: "Pin must be a 64-character SHA-256 hex digest." };
  if (pack.sha256 !== expected) return { ok: false, error: "Pack hash does not match the pin you saved." };
  const computed = await sha256Hex(canonicalHostPayload(pack.hosts));
  if (computed !== expected) return { ok: false, error: "Pack hosts do not hash to the claimed SHA-256." };
  if (!(await verifyOptionalSig(pack.sha256, pack.sig))) {
    return { ok: false, error: "Pack signature is not valid." };
  }
  return { ok: true, hosts: [...new Set(pack.hosts)].sort() };
}

export async function fetchHostPack(
  urlRaw: string,
  pinRaw: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; hosts: string[]; sha256: string } | { ok: false; error: string }> {
  const url = parseHttpsUrl(urlRaw);
  const pin = parseSha256Pin(pinRaw);
  if (!url) return { ok: false, error: "Pack URL must be https without credentials." };
  if (!pin) return { ok: false, error: "A SHA-256 pin is required. Fundament will not fetch an unpinned list." };

  try {
    const response = await fetchImpl(url, { redirect: "follow", headers: { Accept: "application/json" } });
    if (!response.ok) return { ok: false, error: `Pack server returned ${response.status}.` };
    const finalUrl = response.url || url;
    if (!finalUrl.startsWith("https://")) return { ok: false, error: "Pack redirect left HTTPS." };
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) return { ok: false, error: "Pack is larger than 512 KB." };
    const json = JSON.parse(new TextDecoder().decode(buffer)) as unknown;
    const pack = parseHostPack(json);
    if (!pack) return { ok: false, error: "Pack JSON is not a v1 dnr-hosts document." };
    const verified = await verifyHostPack(pack, pin);
    if (!verified.ok) return verified;
    return { ok: true, hosts: verified.hosts, sha256: pack.sha256 };
  } catch {
    return { ok: false, error: "Could not download or parse the pack." };
  }
}
