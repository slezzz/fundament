/**
 * Self-tamper detection: hash shipped files we can fetch from our own origin.
 * Does not try to detect memory patching. A mismatch means the on-disk
 * package no longer matches the fingerprint stored at install.
 */

export const INTEGRITY_FILES = [
  "manifest.json",
  "background.js",
  "content.js",
  "content-bridge.js",
  "content-search.js",
] as const;

export async function sha256HexBytes(bytes: ArrayBuffer, cryptoObj: Crypto = crypto): Promise<string> {
  const digest = await cryptoObj.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function fingerprintPackage(
  files: Record<string, string>,
  cryptoObj: Crypto = crypto,
): Promise<string> {
  const names = Object.keys(files).sort();
  const payload = names.map((name) => `${name}:${files[name] ?? ""}`).join("\n");
  const digest = await cryptoObj.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function integrityVerdict(
  expected: string | null,
  actual: string,
): { ok: boolean; reason: string } {
  if (!expected) {
    return { ok: true, reason: "No install fingerprint stored yet." };
  }
  if (expected === actual) {
    return { ok: true, reason: "Extension files match the install fingerprint." };
  }
  return {
    ok: false,
    reason: "Extension files do not match the fingerprint stored at install. Reload from a trusted build.",
  };
}
