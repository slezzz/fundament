import type { ParsedDomain, ParsedUrl, RiskSignal } from "@shared/types";
import { isOfficialAnyBrand } from "../impersonation/detect";
import { ELEVATED_RISK_TLDS } from "./patterns";
import { textSignal } from "../i18n/signal";
import { WEIGHTS } from "../risk/weights";

/**
 * 2025–2026 kit shapes: fake CAPTCHA / ClickFix, fake browser updates,
 * passkey collection on lookalikes, OAuth consent proxies.
 */
const CLICKFIX_PATH_RE =
  /captcha|recaptcha|turnstile|verify-you.?are.?human|i.?am.?not.?a.?robot|just-a-moment|checking.?your.?browser|cf-challenge|cdn-cgi\/challenge|human.?verification|ray-id/i;
const UPDATE_PATH_RE = /chrome.?update|update.?chrome|browser.?update|flash.?player|critical.?update|software.?update/i;
const PASSKEY_PATH_RE = /webauthn|passkey|fido2|security.?key/i;
const IDP_IN_NESTED =
  /accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com|appleid\.apple\.com|okta\.com/i;
const OAUTH_KEYS = new Set(["client_id", "response_type", "scope", "consent", "redirect_uri"]);


export function extraKitSignals(
  parsed: ParsedUrl,
  domain: ParsedDomain | null,
  impersonation: boolean,
  nestedUrl: string | null,
  popular = false,
): RiskSignal[] {
  if (popular || (domain && isOfficialAnyBrand(domain))) return [];

  const blob = `${parsed.pathname}${parsed.search}${parsed.hostname}`;
  const cheap = Boolean(domain && ELEVATED_RISK_TLDS.has(domain.tld));
  const http = parsed.protocol === "http:";
  const shady = impersonation || cheap || http;
  const out: RiskSignal[] = [];

  if (CLICKFIX_PATH_RE.test(blob) && shady) {
    out.push(
      textSignal("clickfix-url", "clickfix-url", WEIGHTS.clickFixUrl + (impersonation ? WEIGHTS.cryptoBaitBoost : 0), "warn"),
    );
  }

  if (UPDATE_PATH_RE.test(blob) && shady) {
    out.push(
      textSignal("browser-update-url", "browser-update-url", WEIGHTS.browserUpdateUrl, "warn"),
    );
  }

  if (PASSKEY_PATH_RE.test(blob) && impersonation) {
    out.push(
      textSignal("passkey-lookalike", "passkey-lookalike", WEIGHTS.passkeyLookalike, "warn"),
    );
  }

  const params = new URLSearchParams(parsed.search);
  let oauthish = false;
  for (const key of params.keys()) {
    if (OAUTH_KEYS.has(key.toLowerCase())) oauthish = true;
  }
  if (nestedUrl && IDP_IN_NESTED.test(nestedUrl) && (oauthish || impersonation) && shady) {
    out.push(
      textSignal("oauth-proxy", "oauth-proxy", WEIGHTS.oauthProxy, "warn"),
    );
  }

  return out;
}
