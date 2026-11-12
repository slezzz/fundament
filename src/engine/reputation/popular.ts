/**
 * Popularity list (Majestic Million top 50k, CC BY 3.0) as a membership test.
 * Parsing is pure so the worker and the tests share it.
 */
export function parsePopularList(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().toLowerCase();
    if (!line || line.startsWith("#")) continue;
    if (line.length > 253 || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(line)) continue;
    out.add(line);
  }
  return out;
}

/**
 * `hostedZones`: popular domains that serve user content on subdomains (derived from the
 * phishing feed: ≥5 distinct listed subdomains). `x.weebly.com` must not inherit weebly.com's
 * popularity; `weebly.com` and `www.weebly.com` still do.
 */
export function popularityCheck(
  set: Set<string>,
  hostedZones: Set<string> = new Set(),
): (registrable: string, hostname?: string) => boolean {
  return (registrable, hostname) => {
    const reg = registrable.toLowerCase();
    if (!set.has(reg)) return false;
    if (!hostname || !hostedZones.has(reg)) return true;
    const host = hostname.toLowerCase();
    return host === reg || host === `www.${reg}`;
  };
}
