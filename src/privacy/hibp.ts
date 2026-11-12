/** HIBP k-anonymity: only a SHA-1 prefix is sent. Never the password. */

export async function sha1Hex(value: string, cryptoObj: Crypto = crypto): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await cryptoObj.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function splitSha1(hash: string): { prefix: string; suffix: string } {
  const hex = hash.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  return { prefix: hex.slice(0, 5), suffix: hex.slice(5) };
}

/** Parse a HIBP range response. Returns how often the suffix appears, or 0. */
export function countSuffixInRange(body: string, suffix: string): number {
  const want = suffix.toUpperCase();
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const [hash, count] = line.split(":");
    if (hash?.trim().toUpperCase() === want) {
      const n = Number.parseInt(count ?? "0", 10);
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

export async function pwnedCountForHash(
  hash: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ count: number; available: boolean }> {
  const { prefix, suffix } = splitSha1(hash);
  if (prefix.length !== 5 || suffix.length < 10) {
    return { count: 0, available: false };
  }
  try {
    const response = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!response.ok) return { count: 0, available: false };
    const body = await response.text();
    return { count: countSuffixInRange(body, suffix), available: true };
  } catch {
    return { count: 0, available: false };
  }
}
