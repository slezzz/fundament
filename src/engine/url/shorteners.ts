export const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "adf.ly",
  "bit.do",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "tiny.cc",
  "rb.gy",
  "trib.al",
  "lnkd.in",
  "s.id",
]);

export function isShortener(registrableDomain: string): boolean {
  return URL_SHORTENERS.has(registrableDomain);
}
