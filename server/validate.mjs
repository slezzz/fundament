/**
 * Accept only http(s) origin: scheme + host [+ port], no userinfo/path/query.
 * @param {unknown} value
 * @returns {string | null}
 */
export function parseOrigin(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    return null;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }
  if (url.username || url.password) {
    return null;
  }
  if (url.search || url.hash) {
    return null;
  }
  if (url.pathname && url.pathname !== "/") {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!host || host.length > 253) {
    return null;
  }
  return `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`;
}

/**
 * @param {unknown} domain
 * @returns {string | null}
 */
export function domainToHttpsOrigin(domain) {
  if (typeof domain !== "string") return null;
  const host = domain.trim().toLowerCase();
  if (!host || host.includes("/") || host.includes("?") || host.includes("#") || host.includes("@")) {
    return null;
  }
  return parseOrigin(`https://${host}`);
}
