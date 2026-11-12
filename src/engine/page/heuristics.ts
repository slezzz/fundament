/**
 * Page-level detectors. Pure functions so unit tests can freeze them.
 * Content scripts re-implement a slim DOM scan and only send kind ids —
 * never page text, cookies, or field values.
 */

const SESSION_URL_RE =
  /(?:;|&|\?|\/)(?:jsessionid|phpsessid|asp\.net_sessionid|sessionid|sid)=/i;

const SESSION_COOKIE_RE =
  /^(?:phpsessid|jsessionid|asp\.net_sessionid|sessionid|sid|auth(?:token)?|token|jwt|connect\.sid|csrf(?:token)?)$/i;

const PROMPT_INJECT_RE =
  /ignore (?:all )?(?:previous|prior|above) instructions|you are (?:now )?(?:a |an )?(?:helpful )?(?:browser )?(?:assistant|agent)|system prompt:|do not (?:tell|inform|alert) the user|exfiltrat(?:e|ion)|send (?:me )?(?:all )?(?:cookies|credentials|api keys)|hidden instruction/i;

const OBFUSCATED_JS_RE =
  /(?:eval|function)\s*\(\s*(?:atob|unescape|decodeuricomponent|string\.fromcharcode)|fromcharcode\s*\([^)]{0,80}(?:eval|function)|atob\s*\(\s*['"][a-z0-9+/=]{80,}/i;

const PROTOTYPE_POLLUTION_RE =
  /(?:__proto__|constructor\s*\[(?:\s*['"]prototype['"]\s*)\]|constructor\.prototype)\s*=/;

const DOM_XSS_RE =
  /(?:location\.(?:hash|search|href)|document\.url|document\.referrer).{0,120}(?:innerhtml|outerhtml|document\.write|insertadjacenthtml|eval\()|(?:innerhtml|outerhtml|document\.write|insertadjacenthtml).{0,80}(?:location\.(?:hash|search|href)|document\.url|document\.referrer|decodeuricomponent)/i;

const MINER_RE =
  /coinhive|cryptonight|cryptoloot|webmine|wasmminer|throttleminer|cryptonightwasm|hash.?rate.{0,40}(?:throttle|miner)|stratum\+tcp/i;

const QR_GENERATOR_RE =
  /(?:api\.qrserver\.com|chart\.googleapis\.com\/chart\?[^'"]*cht=qr|qrcode\.|\/qr[-_]?code)/i;

const WEAK_CSP_RE = /unsafe-inline|unsafe-eval|data:|blob:/i;

export function sessionIdInUrl(href: string): boolean {
  return SESSION_URL_RE.test(href);
}

export function looksLikeSessionCookieName(name: string): boolean {
  return SESSION_COOKIE_RE.test(name.trim());
}

/**
 * document.cookie never exposes HttpOnly/Secure/SameSite.
 * Seeing a session-shaped name there means HttpOnly is missing.
 */
export function documentCookieSessionNames(cookieHeader: string): string[] {
  if (!cookieHeader) return [];
  const names: string[] = [];
  for (const part of cookieHeader.split(";")) {
    const name = part.split("=")[0]?.trim() ?? "";
    if (name && looksLikeSessionCookieName(name) && !names.includes(name.toLowerCase())) {
      names.push(name.toLowerCase());
    }
  }
  return names;
}

export function looksLikePromptInjection(text: string): boolean {
  if (text.length < 24 || text.length > 8000) return false;
  return PROMPT_INJECT_RE.test(text.replace(/\s+/g, " "));
}

export function looksHiddenForAgents(style: {
  display?: string;
  visibility?: string;
  opacity?: string;
  fontSize?: string;
  clip?: string;
  position?: string;
  left?: string;
  top?: string;
  ariaHidden?: boolean;
}): boolean {
  if (style.ariaHidden) return true;
  if (style.display === "none" || style.visibility === "hidden") return true;
  const opacity = Number.parseFloat(style.opacity ?? "1");
  if (Number.isFinite(opacity) && opacity <= 0.05) return true;
  const font = Number.parseFloat(style.fontSize ?? "16");
  if (Number.isFinite(font) && font <= 1) return true;
  if (style.clip && /rect\(\s*0/i.test(style.clip)) return true;
  const left = Number.parseFloat(style.left ?? "0");
  const top = Number.parseFloat(style.top ?? "0");
  if (style.position === "absolute" && (left < -200 || top < -200)) return true;
  return false;
}

export function looksObfuscatedJs(source: string): boolean {
  if (source.length < 40 || source.length > 50_000) return false;
  const compact = source.replace(/\s+/g, " ");
  if (OBFUSCATED_JS_RE.test(compact)) return true;
  const b64 = compact.match(/['"][A-Za-z0-9+/=]{200,}['"]/);
  return Boolean(b64 && /(?:eval|function|atob)\s*\(/i.test(compact));
}

export function looksPrototypePollution(source: string): boolean {
  if (source.length < 12 || source.length > 50_000) return false;
  return PROTOTYPE_POLLUTION_RE.test(source.replace(/\s+/g, " "));
}

export function looksDomXssSink(source: string): boolean {
  if (source.length < 20 || source.length > 50_000) return false;
  return DOM_XSS_RE.test(source.replace(/\s+/g, " "));
}

export function looksMinerPayload(source: string): boolean {
  if (source.length < 16 || source.length > 80_000) return false;
  return MINER_RE.test(source.replace(/\s+/g, " "));
}

export function looksQuishingResource(src: string): boolean {
  return QR_GENERATOR_RE.test(src);
}

function registrableHint(host: string): string {
  const parts = host.toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

export function looksCrossOriginLogin(pageHost: string, actionHref: string): boolean {
  let action: URL;
  try {
    action = new URL(actionHref);
  } catch {
    return false;
  }
  if (action.protocol !== "http:" && action.protocol !== "https:") return false;
  const page = registrableHint(pageHost);
  const dest = registrableHint(action.hostname);
  if (!page || !dest) return false;
  return page !== dest;
}

export function looksMixedContent(pageProtocol: string, resourceUrl: string): boolean {
  if (pageProtocol !== "https:") return false;
  try {
    const url = new URL(resourceUrl);
    return url.protocol === "http:";
  } catch {
    return false;
  }
}

export function looksWeakCsp(policy: string | null, loginShaped: boolean): boolean {
  if (!policy || !policy.trim()) return loginShaped;
  const lower = policy.toLowerCase();
  if (!/default-src|script-src/.test(lower)) return loginShaped;
  if (WEAK_CSP_RE.test(lower) && /script-src/.test(lower) && loginShaped) return true;
  return false;
}

export function looksMalvertisingNest(iframeCount: number, adIframeCount: number): boolean {
  return iframeCount >= 8 || adIframeCount >= 4;
}

/** Classic gadget URLs (e.g. ?__proto__[admin]=true). Detection only. */
export function looksUrlPrototypePollution(href: string): boolean {
  try {
    const url = new URL(href);
    const blob = `${url.search}${url.hash}`.toLowerCase();
    return /(?:\?|&|%5b)__proto__(?:%5d|=|\[)|(?:\?|&)constructor(?:%5b|\[)prototype/.test(blob);
  } catch {
    return false;
  }
}
