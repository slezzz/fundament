const MAX_ORIGIN = 256;

/** Scheme + host only. Drops userinfo, path, query, fragment. */
export function originOnly(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.username || parsed.password) {
      parsed.username = "";
      parsed.password = "";
    }
    const origin = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
    if (origin.length > MAX_ORIGIN) return null;
    return origin;
  } catch {
    return null;
  }
}

export function hostOnly(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
