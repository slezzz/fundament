import { LICENSE_PUBLIC_KEY_SPKI_B64 } from "./publicKey";
import { licenseActivationAllowed } from "./launch";

export interface LicenseClaims {
  v: 1;
  plan: "pro";
  iat: number;
  exp: number | null;
  sid?: string;
  sub?: string;
  ext?: string;
}

const PREFIX = "fundament1.";

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importPublicKey(spkiB64: string): Promise<CryptoKey> {
  const raw = base64UrlToBytes(spkiB64.replace(/-/g, "+").replace(/_/g, "/"));
  return crypto.subtle.importKey("spki", raw as BufferSource, { name: "Ed25519" }, false, ["verify"]);
}

function parseClaims(json: unknown): LicenseClaims | null {
  if (typeof json !== "object" || json === null) return null;
  const o = json as Record<string, unknown>;
  if (o.v !== 1 || o.plan !== "pro") return null;
  if (typeof o.iat !== "number") return null;
  if (o.exp !== null && typeof o.exp !== "number") return null;
  const claims: LicenseClaims = { v: 1, plan: "pro", iat: o.iat, exp: o.exp };
  if (typeof o.sid === "string" && o.sid.length >= 4 && o.sid.length <= 200) claims.sid = o.sid;
  if (typeof o.sub === "string" && o.sub.length >= 4 && o.sub.length <= 200) claims.sub = o.sub;
  if (typeof o.ext === "string" && /^[a-z]{32}$/.test(o.ext)) claims.ext = o.ext;
  return claims;
}

export async function verifyLicense(
  token: string,
  publicKeySpkiB64 = LICENSE_PUBLIC_KEY_SPKI_B64,
  now = Date.now(),
): Promise<LicenseClaims | null> {
  const trimmed = token.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const rest = trimmed.slice(PREFIX.length);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = rest.slice(0, dot);
  const sigB64 = rest.slice(dot + 1);
  if (!payloadB64 || !sigB64) return null;

  let claims: LicenseClaims | null;
  try {
    const payloadBytes = base64UrlToBytes(payloadB64);
    const json = JSON.parse(new TextDecoder().decode(payloadBytes)) as unknown;
    claims = parseClaims(json);
  } catch {
    return null;
  }
  if (!claims) return null;
  if (claims.exp !== null && claims.exp * 1000 < now) return null;

  try {
    const key = await importPublicKey(publicKeySpkiB64);
    const ok = await crypto.subtle.verify(
      "Ed25519",
      key,
      base64UrlToBytes(sigB64) as BufferSource,
      new TextEncoder().encode(payloadB64),
    );
    return ok ? claims : null;
  } catch {
    return null;
  }
}

export async function planFromLicense(token: string): Promise<"free" | "pro"> {
  if (!licenseActivationAllowed(LICENSE_PUBLIC_KEY_SPKI_B64)) return "free";
  if (!token.trim()) return "free";
  const claims = await verifyLicense(token);
  return claims ? "pro" : "free";
}
