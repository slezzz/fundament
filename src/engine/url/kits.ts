import type { ParsedDomain, ParsedUrl, RiskSignal } from "@shared/types";
import { isOfficialAnyBrand } from "../impersonation/detect";
import { ELEVATED_RISK_TLDS } from "./patterns";
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

function signal(
  id: string,
  weight: number,
  title: string,
  explanation: string,
): RiskSignal {
  return { id, weightApplied: weight, severity: "warn", title, explanation };
}

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
      signal(
        "clickfix-url",
        WEIGHTS.clickFixUrl + (impersonation ? WEIGHTS.cryptoBaitBoost : 0),
        "Fake verification / ClickFix lure",
        "This address looks like a CAPTCHA or “verify you are human” page on a host that is not a catalogued official product. Current kits copy a PowerShell command and tell you to paste it. Do not run anything from this page.",
      ),
    );
  }

  if (UPDATE_PATH_RE.test(blob) && shady) {
    out.push(
      signal(
        "browser-update-url",
        WEIGHTS.browserUpdateUrl,
        "Fake browser update",
        "This URL pretends to be a Chrome or Flash update. Real Chrome updates come from Google, not from a random download page.",
      ),
    );
  }

  if (PASSKEY_PATH_RE.test(blob) && impersonation) {
    out.push(
      signal(
        "passkey-lookalike",
        WEIGHTS.passkeyLookalike,
        "Passkey on a lookalike",
        "This lookalike asks for a passkey or security key. Registering a key here can lock the attacker in after you authenticate. Use the official domain from a bookmark.",
      ),
    );
  }

  const params = new URLSearchParams(parsed.search);
  let oauthish = false;
  for (const key of params.keys()) {
    if (OAUTH_KEYS.has(key.toLowerCase())) oauthish = true;
  }
  if (nestedUrl && IDP_IN_NESTED.test(nestedUrl) && (oauthish || impersonation) && shady) {
    out.push(
      signal(
        "oauth-proxy",
        WEIGHTS.oauthProxy,
        "OAuth consent proxy",
        "This unofficial host wraps a Google, Microsoft, or Apple sign-in. Consent-phishing kits steal the grant without your password. Open the identity provider yourself instead of following this link.",
      ),
    );
  }

  return out;
}
