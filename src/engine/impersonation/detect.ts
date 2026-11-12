import type { ParsedDomain } from "@shared/types";
import { BRANDS, type BrandRecord } from "./brands";
import { levenshtein, normalizeToken } from "./normalize";
import { foldConfusables } from "../homograph/detect";
import { ELEVATED_RISK_TLDS } from "../url/patterns";

/**
 * Why a domain looks like a brand, strongest first.
 * - embedded-domain: the official domain is spelled out as a subdomain (paypal.com.evil.top)
 * - confusable:      the name only differs by lookalike characters (paypa1, pаypal, rnicrosoft)
 * - other-tld:       the exact brand name on an ending the brand does not use (paypal.xyz)
 * - keyword-combo:   brand + phishing keyword (paypal-login, sparkasse-sicherheit, metamaskrestore)
 * - subdomain:       brand as a subdomain label of an unrelated domain (paypal.evil.com)
 * - hyphen-combo:    brand as one hyphen part without a phishing keyword (evil-paypal) — weak
 * - typo:            one edit away from a long brand token (amazom) — weak, real words collide
 */
export type ImpersonationReason =
  | "embedded-domain"
  | "confusable"
  | "other-tld"
  | "keyword-combo"
  | "subdomain"
  | "hyphen-combo"
  | "typo";

export interface ImpersonationHit {
  brand: BrandRecord;
  reason: ImpersonationReason;
}

const REASON_RANK: Record<ImpersonationReason, number> = {
  "embedded-domain": 7,
  confusable: 6,
  "other-tld": 5,
  "keyword-combo": 4,
  subdomain: 3,
  "hyphen-combo": 2,
  typo: 1,
};

/** Words that turn "brand + something" into a credential or payment lure (EN + DE). */
export const PHISH_KEYWORDS = [
  "login", "logon", "signin", "signon", "sign", "auth", "oauth", "sso", "verify", "verification", "verifizierung",
  "verifikation", "validate", "validation", "secure", "security", "sicherheit", "sicher", "account", "accounts",
  "konto", "kundenkonto", "update", "aktualisierung", "aktualisieren", "support", "helpdesk", "help", "hilfe",
  "service", "services", "kundenservice", "customer", "billing", "invoice", "rechnung", "payment", "payments",
  "zahlung", "refund", "erstattung", "rueckerstattung", "claim", "airdrop", "reward", "rewards", "bonus", "gift",
  "giveaway", "prize", "gewinn", "wallet", "connect", "restore", "recovery", "recover", "unlock", "unblock",
  "locked", "gesperrt", "entsperren", "suspend", "suspended", "limited", "alert", "warning", "notice", "confirm",
  "confirmation", "bestaetigung", "bestaetigen", "official", "center", "centre", "portal", "check", "kyc", "tan",
  "pushtan", "phototan", "photo", "app", "online", "banking", "onlinebanking", "mobile", "id", "ident", "identity",
  "mfa", "2fa", "otp", "token", "sync", "dapp", "mint", "migrate", "migration", "stake", "staking", "bridge",
  "claimdrop", "free", "promo", "delivery", "tracking", "track", "parcel", "paket", "sendung", "zustellung",
  "customs", "zoll", "tax", "steuer", "renew", "renewal", "subscription", "abo", "password", "passwort",
  "reset", "access", "team", "desk", "web", "mail", "webmail", "cloud", "drive", "docs", "share", "file", "files",
] as const;

const KEYWORD_SET = new Set<string>(PHISH_KEYWORDS);
/** Keywords that are too generic to make a non-hyphen concatenation suspicious (amazonapp is fine-ish). */
const STRONG_KEYWORDS = new Set<string>(PHISH_KEYWORDS.filter((k) => !["app", "web", "mail", "cloud", "drive", "docs", "share", "file", "files", "team", "desk", "online", "mobile", "id", "photo", "sign", "free", "track", "tracking", "delivery", "service", "services", "help", "center", "centre", "portal", "check"].includes(k)));

const REGIONAL_ENDINGS = new Set(["de", "at", "ch", "li", "lu"]);
const MULTI_CHAR_CONFUSABLES: [RegExp, string][] = [
  [/rn/g, "m"],
  [/vv/g, "w"],
  [/cl/g, "d"],
  [/ii/g, "u"],
];

export function isOfficialBrandHost(domain: ParsedDomain, brand: BrandRecord): boolean {
  if (
    brand.domains.some(
      (official) =>
        domain.registrableDomain === official ||
        domain.hostname === official ||
        domain.hostname.endsWith(`.${official}`),
    )
  ) {
    return true;
  }
  if (brand.ccTlds) {
    const name = domain.registrableDomain.slice(0, domain.registrableDomain.length - domain.publicSuffix.length - 1);
    if (brand.tokens.includes(name) && isCountryEnding(domain.publicSuffix)) return true;
  }
  return false;
}

export function isOfficialAnyBrand(domain: ParsedDomain): boolean {
  return BRANDS.some((brand) => isOfficialBrandHost(domain, brand));
}

function isCountryEnding(suffix: string): boolean {
  const pieces = suffix.split(".");
  const last = pieces[pieces.length - 1] ?? "";
  if (last.length !== 2 || ELEVATED_RISK_TLDS.has(last)) return false;
  if (pieces.length === 1) return true;
  // com.au, co.uk, com.br — but not github.io / pages.dev style hosting zones
  return pieces.length === 2 && ["co", "com", "org", "net", "ac", "gov", "or", "ne", "edu"].includes(pieces[0] ?? "");
}

function isHostingSuffix(suffix: string): boolean {
  return suffix.includes(".") && !isCountryEnding(suffix);
}

/** Registrable name without the public suffix, in Unicode (аррӏе, not xn--80ak6aa92e). */
function registrableName(domain: ParsedDomain): string {
  const suffixLen = domain.publicSuffix ? domain.publicSuffix.split(".").length : 1;
  const index = domain.labelsUnicode.length - suffixLen - 1;
  return (domain.labelsUnicode[index] ?? domain.registrableDomain.split(".")[0] ?? "").toLowerCase();
}

function unicodeSubLabels(domain: ParsedDomain): string[] {
  const suffixLen = domain.publicSuffix ? domain.publicSuffix.split(".").length : 1;
  return domain.labelsUnicode.slice(0, Math.max(0, domain.labelsUnicode.length - suffixLen - 1));
}

function asciiSkeleton(value: string): string {
  let out = normalizeToken(value);
  for (const [re, rep] of MULTI_CHAR_CONFUSABLES) out = out.replace(re, rep);
  return out;
}

/** Splits a label into hyphen/underscore parts, then folds lookalikes. */
function parts(label: string): string[] {
  return foldConfusables(label)
    .toLowerCase()
    .split(/[-_]+/)
    .filter(Boolean);
}

function containsKeyword(rest: string, strongOnly: boolean): boolean {
  if (!rest) return false;
  const set = strongOnly ? STRONG_KEYWORDS : KEYWORD_SET;
  if (set.has(rest)) return true;
  for (const keyword of set) {
    if (keyword.length >= 4 && rest.includes(keyword)) return true;
  }
  return false;
}

function hyphenPartsWithKeyword(all: string[], skip: string): boolean {
  return all.some((p) => p !== skip && (KEYWORD_SET.has(p) || containsKeyword(p, true)));
}

function better(a: ImpersonationHit | null, b: ImpersonationHit | null): ImpersonationHit | null {
  if (!a) return b;
  if (!b) return a;
  return REASON_RANK[b.reason] > REASON_RANK[a.reason] ? b : a;
}

function matchName(name: string, brand: BrandRecord, domain: ParsedDomain): ImpersonationHit | null {
  const rawParts = parts(name);
  const joined = rawParts.join("");
  const ending = domain.publicSuffix.split(".").pop() ?? "";
  let hit: ImpersonationHit | null = null;

  const nonAscii = [...name].some((ch) => (ch.codePointAt(0) ?? 0) > 0x7f);

  for (const token of brand.tokens) {
    const short = token.length < 5;

    // Whole name in lookalike letters: аррӏе.com, gооgle.com
    if (nonAscii && joined === token) {
      hit = better(hit, { brand, reason: "confusable" });
      continue;
    }

    // Exact brand name on a foreign ending: paypal.xyz, sparkasse.online.
    // Common-word brands (kraken.io, ledger.de) and project pages on hosting
    // platforms (netflix.github.io) only count as a weak hint.
    if (joined === token && name.replace(/[-_]/g, "") === token) {
      const weak = brand.noContentMatch || isHostingSuffix(domain.publicSuffix);
      hit = better(hit, { brand, reason: weak ? "subdomain" : "other-tld" });
      continue;
    }

    // Hyphen part equals the token: paypal-login, ups-tracking, evil-paypal
    if (rawParts.length > 1 && rawParts.includes(token)) {
      const keyword = hyphenPartsWithKeyword(rawParts, token);
      if (brand.regional && REGIONAL_ENDINGS.has(ending) && !keyword) continue;
      hit = better(hit, { brand, reason: keyword ? "keyword-combo" : "hyphen-combo" });
      continue;
    }

    if (!short) {
      // Concatenation: paypalsecure, securepaypal, metamaskrestore
      for (const part of rawParts) {
        if (part === token || !part.includes(token)) continue;
        const rest = part.replace(token, "");
        if (containsKeyword(rest, true)) {
          if (brand.regional && REGIONAL_ENDINGS.has(ending) && !STRONG_KEYWORDS.has(rest)) continue;
          hit = better(hit, { brand, reason: "keyword-combo" });
        }
      }

      // Lookalike characters: paypa1, rnicrosoft, pаypal (after folding)
      for (const part of [joined, ...rawParts]) {
        if (part === token) continue;
        const skeleton = asciiSkeleton(part);
        if (skeleton === token || skeleton === asciiSkeleton(token)) {
          hit = better(hit, { brand, reason: "confusable" });
        } else if (
          !brand.regional &&
          !brand.tokens.includes(part) &&
          token.length >= 6 &&
          Math.abs(skeleton.length - token.length) <= 1 &&
          levenshtein(skeleton, token) === 1
        ) {
          hit = better(hit, { brand, reason: "typo" });
        }
      }
    }
  }
  return hit;
}

/** Same hostname → same answer; one analysis asks several times, navigations repeat hosts. */
const impersonationCache = new Map<string, ImpersonationHit | null>();

export function detectImpersonation(domain: ParsedDomain): ImpersonationHit | null {
  const cacheKey = domain.hostname;
  if (impersonationCache.has(cacheKey)) return impersonationCache.get(cacheKey) ?? null;
  const hit = detectImpersonationUncached(domain);
  if (impersonationCache.size >= 2000) impersonationCache.clear();
  impersonationCache.set(cacheKey, hit);
  return hit;
}

function detectImpersonationUncached(domain: ParsedDomain): ImpersonationHit | null {
  const name = registrableName(domain);
  const subLabels = unicodeSubLabels(domain);
  const host = domain.hostname;
  let best: ImpersonationHit | null = null;

  for (const brand of BRANDS) {
    if (isOfficialBrandHost(domain, brand)) continue;

    // paypal.com.secure-check.xyz / login.microsoftonline.com-verify.top
    for (const official of brand.domains) {
      // Short official names (t.co, x.com, db.com) collide with ordinary hostnames.
      if (!official.includes(".") || (official.split(".")[0] ?? "").length < 4) continue;
      const idx = host.indexOf(`${official}.`);
      const idxDash = host.indexOf(`${official}-`);
      if ((idx === 0 || host[idx - 1] === ".") && idx >= 0 && idx < host.length - domain.registrableDomain.length) {
        best = better(best, { brand, reason: "embedded-domain" });
      } else if (idxDash >= 0 && (idxDash === 0 || host[idxDash - 1] === ".")) {
        best = better(best, { brand, reason: "embedded-domain" });
      }
    }

    best = better(best, matchName(name, brand, domain));

    for (const label of subLabels) {
      if (label === "www") continue;
      const labelParts = parts(label);
      for (const token of brand.tokens) {
        if (token.length < 4 && !labelParts.includes(token)) continue;
        if (labelParts.includes(token) || labelParts.join("") === token) {
          const keyword = hyphenPartsWithKeyword(labelParts, token);
          best = better(best, { brand, reason: keyword ? "keyword-combo" : "subdomain" });
        } else if (token.length >= 5) {
          for (const part of labelParts) {
            if (asciiSkeleton(part) === token) best = better(best, { brand, reason: "confusable" });
            else if (part.includes(token) && containsKeyword(part.replace(token, ""), true)) {
              best = better(best, { brand, reason: "keyword-combo" });
            }
          }
        }
      }
    }
  }

  return best;
}

/** Brands named in page title / site name / logo alt text that this host does not belong to. */
const SIGN_IN = "(?:sign ?in|log ?in|login|log on|anmelden|einloggen|anmeldung|welcome to|willkommen bei)";
const SUFFIX =
  "(?:account|konto|kundenkonto|login|log ?in|sign ?in|online[- ]?banking|banking|anmelden|anmeldung|id|wallet|secure|security|sicherheit|support|kundenservice|help|verification|verifizierung|payment|zahlung|checkout|logo)";

/**
 * Brands a page *presents itself as* (title segment, og:site_name, logo alt), on a
 * host that is not that brand. Each hint must be the brand name itself, "Sign in to
 * <brand>", or "<brand> account/login/…". A title like "How to cancel Netflix" does not count.
 */
export function brandsNamedOnPage(hints: string[], domain: ParsedDomain): BrandRecord[] {
  const cleaned = hints.map((h) => h.replace(/\s+/g, " ").trim()).filter((h) => h.length > 1 && h.length <= 160);
  if (cleaned.length === 0) return [];
  const out: BrandRecord[] = [];
  for (const brand of BRANDS) {
    if (isOfficialBrandHost(domain, brand)) continue;
    const names = [...(brand.noContentMatch ? [] : [brand.name]), ...(brand.contentNames ?? [])];
    let matched = false;
    for (const n of names) {
      if (n.length < 3) continue;
      const name = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const patterns = [
        new RegExp(`^${name}$`, "iu"),
        new RegExp(`^${SIGN_IN}(?: to| bei| zu| in| with| mit)?(?: your| ihr(?:em|en)?| dein(?:em)?)? ${name}\\b`, "iu"),
        new RegExp(`^${name}(?:[ :\\-–|]+)${SUFFIX}\\b`, "iu"),
        new RegExp(`^(?:your |ihr |dein )?${name}(?:[ :\\-–|]+)?${SIGN_IN}`, "iu"),
      ];
      if (cleaned.some((hint) => patterns.some((re) => re.test(hint)))) {
        matched = true;
        break;
      }
    }
    if (matched) out.push(brand);
  }
  return out;
}
