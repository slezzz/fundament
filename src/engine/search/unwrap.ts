/**
 * Unwrap search redirectors so we analyze the destination, not google.com/url.
 * Detection only — no click rewriting.
 */

export function isSearchEngineHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (host === "bing.com") return true;
  if (host === "duckduckgo.com") return true;
  if (host === "search.yahoo.com") return true;
  if (host === "googleapis.com" || host.endsWith(".googleapis.com")) return false;
  if (host === "google.com" || host.startsWith("google.")) return true;
  return false;
}

function firstHttpParam(params: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const value = params.get(key);
    if (value && /^https?:\/\//i.test(value)) {
      try {
        return new URL(value).href;
      } catch {
        continue;
      }
    }
  }
  return null;
}

/** Click destination, or null when this is a tracking URL we cannot unwrap. */
export function unwrapSearchDestination(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.hostname.length > 253 || href.length > 2000) return null;
  if (!isSearchEngineHost(url.hostname)) return url.href;
  const nested = firstHttpParam(url.searchParams, ["q", "url", "u", "uddg", "p"]);
  if (!nested) return null;
  try {
    const dest = new URL(nested);
    if (isSearchEngineHost(dest.hostname)) return null;
    return dest.href;
  } catch {
    return null;
  }
}

export function searchHitLabel(signals: { id: string; title: string; severity: string }[], score: number): string | null {
  const actionable = signals.filter((s) => s.severity === "warn" || s.severity === "fail");
  const impersonation = actionable.find((s) => s.id === "impersonation");
  if (impersonation) return impersonation.title;
  if (actionable.some((s) => s.id === "known-malicious")) return "Listed as malicious";
  if (actionable.some((s) => s.id === "homograph")) return "Lookalike domain";
  if (actionable.some((s) => s.id === "dns-rebind")) return "Local or rebind host";
  if (actionable.some((s) => s.id === "clickfix-url")) return "ClickFix lure";
  if (score >= 60) return "High-risk link";
  return null;
}
