/**
 * DNS-rebinding heuristics that do not need a DNS API.
 * Chrome will not tell us what a hostname resolved to, so we flag
 * (1) private/link-local destinations and (2) public rebind-helper zones
 * that mint records pointing at loopback or RFC1918 space.
 */

const V4 =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const REBIND_ZONES = new Set([
  "nip.io",
  "sslip.io",
  "xip.io",
  "nipio.io",
  "localtest.me",
  "lvh.me",
  "vcap.me",
  "42web.io",
  "localho.st",
]);

export function isIpv4(hostname: string): boolean {
  return V4.test(hostname.replace(/^\[|\]$/g, ""));
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host === "localhost.localdomain") {
    return true;
  }
  if (host.includes(":")) {
    if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
    // fe80::/10 link-local, fc00::/7 unique-local — only for real IPv6 literals
    return /^(fe[89ab][0-9a-f]?|f[cd][0-9a-f]{0,2}):/.test(host);
  }
  if (!V4.test(host)) return false;
  const [a, b] = host.split(".").map((n) => Number(n));
  if (a === 127 || a === 0 || a === 10 || a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  return false;
}

export function looksLikeDnsRebindHost(hostname: string, registrable: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const zone = registrable.toLowerCase().replace(/\.$/, "");
  if (REBIND_ZONES.has(zone) || REBIND_ZONES.has(host)) return true;
  if (isPrivateOrLocalHost(host)) return true;
  const labels = host.split(".");
  if (labels.some((label) => isPrivateOrLocalHost(label.replace(/-/g, ".")))) {
    return REBIND_ZONES.has(zone);
  }
  return false;
}

/** Names that only resolve inside a home or company network (router UIs, NAS, printers). */
export function isLocalNetworkName(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (isPrivateOrLocalHost(host)) return true;
  if (!host.includes(".")) return true;
  return /\.(local|lan|home|home\.arpa|internal|intranet|localdomain|box|fritz\.box|router|corp)$/.test(host);
}
