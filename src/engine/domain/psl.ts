/** Multi-part public suffixes we must not treat as registrable domains. */
export const MULTI_PART_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "co.jp",
  "ne.jp",
  "or.jp",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "com.br",
  "com.mx",
  "co.in",
  "com.cn",
  "com.tw",
  "co.za",
  "com.tr",
  "com.ar",
  "co.kr",
  "com.sg",
  "com.hk",
  "azurewebsites.net",
  "cloudfront.net",
  "github.io",
  "gitlab.io",
  "pages.dev",
  "workers.dev",
  "web.app",
  "firebaseapp.com",
  "herokuapp.com",
  "netlify.app",
  "vercel.app",
  "blogspot.com",
  "wordpress.com",
  "appspot.com",
]);

export function splitHostname(hostname: string): string[] {
  const host = hostname.startsWith("[") ? hostname : hostname.replace(/\.$/, "");
  return host.split(".").filter(Boolean);
}

export function publicSuffixOf(labels: string[]): string {
  if (labels.length === 0) {
    return "";
  }
  const last2 = labels.slice(-2).join(".");
  const last3 = labels.slice(-3).join(".");
  if (MULTI_PART_SUFFIXES.has(last3)) {
    return last3;
  }
  if (MULTI_PART_SUFFIXES.has(last2)) {
    return last2;
  }
  return labels[labels.length - 1] ?? "";
}

export function registrableDomainOf(labels: string[]): string {
  const suffix = publicSuffixOf(labels);
  const suffixParts = suffix.split(".").filter(Boolean);
  const needed = suffixParts.length + 1;
  if (labels.length < needed) {
    return labels.join(".");
  }
  return labels.slice(labels.length - needed).join(".");
}
