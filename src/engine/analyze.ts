import type { AnalysisInput, ParsedDomain, ParsedUrl, RiskSignal, UrlAnalysis } from "@shared/types";
import { ENGINE_VERSION } from "./version";
import { parseHttpUrl, UrlParseError, looksDoubleEncoded, countPercentEncodings } from "./url/parse";
import { parseDomain } from "./domain/parse";
import { looksLikeHomograph, hasMixedScripts } from "./homograph/detect";
import { applyCombos } from "./risk/combos";
import { brandInHostedContent, cloudAppSuffix, freeHostingSuffix } from "./url/hosting";
import { isShortener } from "./url/shorteners";
import { extraUrlSignals } from "./url/extra";
import { extraWeb3AiSignals } from "./url/web3ai";
import { extraKitSignals } from "./url/kits";
import { detectImpersonation, type ImpersonationHit } from "./impersonation/detect";
import { ELEVATED_RISK_TLDS, LOGIN_PATH_RE, LOGIN_QUERY_RE, SUSPICIOUS_QUERY_KEYS } from "./url/patterns";
import { analyzeRedirectShape } from "./redirect/analyze";
import { looksLikeDnsRebindHost, isPrivateOrLocalHost, isLocalNetworkName } from "./network/dnsRebind";
import { sessionIdInUrl } from "./page/heuristics";
import { WEIGHTS, WEIGHTS_VERSION } from "./risk/weights";
import { applyLevel, bandForScore, clampScore } from "./risk/score";
import { hostMatchesList, isKnownTestMalicious, okSignal, unavailableSignal } from "./reputation/local";
import type { ThreatIntelligenceProvider } from "@shared/types";
import { NullThreatIntelligence } from "./reputation/null-provider";

export interface AnalyzeOptions {
  intelligence?: ThreatIntelligenceProvider;
}

function signal(
  id: string,
  weight: number,
  severity: RiskSignal["severity"],
  title: string,
  explanation: string,
): RiskSignal {
  return { id, weightApplied: weight, severity, title, explanation };
}

function emptyAnalysis(url: string, parseError: string): UrlAnalysis {
  return {
    url,
    parsed: null,
    domain: null,
    parseError,
    signals: [
      signal("parse", 0, "fail", "Address could not be analyzed", parseError),
    ],
    score: 0,
    band: "safe",
    engineVersion: ENGINE_VERSION,
    weightsVersion: WEIGHTS_VERSION,
    reputationAvailable: false,
    trackerHits: 0,
    allowlisted: false,
    blocklisted: false,
    analyzedAt: Date.now(),
  };
}

export async function analyzeUrl(
  input: AnalysisInput,
  options: AnalyzeOptions = {},
): Promise<UrlAnalysis> {
  const intelligence = options.intelligence ?? new NullThreatIntelligence();

  let parsed: ParsedUrl;
  try {
    parsed = parseHttpUrl(input.url);
  } catch (error) {
    const message = error instanceof UrlParseError ? error.message : "Malformed URL";
    return emptyAnalysis(input.url, message);
  }

  const domain = parseDomain(parsed);
  const hostKey = domain?.registrableDomain ?? parsed.hostname;
  const allowlisted = hostMatchesList(parsed.hostname, input.allowlist) ||
    hostMatchesList(hostKey, input.allowlist);
  const blocklisted = hostMatchesList(parsed.hostname, input.blocklist) ||
    hostMatchesList(hostKey, input.blocklist);

  const signals: RiskSignal[] = [];
  const localNetwork = isLocalNetworkName(parsed.hostname);

  if (parsed.protocol === "https:") {
    signals.push(okSignal("https", "HTTPS", "This connection uses HTTPS."));
  } else {
    signals.push(
      signal(
        "https",
        input.phishingProtection && !localNetwork ? WEIGHTS.httpPlain : 0,
        "warn",
        "Not encrypted",
        localNetwork
          ? "This local device (router, NAS, printer) is reached without encryption. That is normal at home; avoid it on public Wi-Fi."
          : "This connection is not encrypted. Anyone on the same network can read or change the page, including passwords.",
      ),
    );
  }

  if (parsed.hasUserInfo && input.phishingProtection) {
    signals.push(
      signal(
        "userinfo",
        WEIGHTS.userInfoInUrl,
        "warn",
        "Credentials in the address",
        "The URL contains a username or password field (user:pass@host). That pattern is often used to disguise the real destination.",
      ),
    );
  }

  if (parsed.isIpLiteral && input.threatProtection) {
    const privateIp = isPrivateOrLocalHost(parsed.hostname);
    signals.push(
      privateIp
        ? {
            id: "ip-host",
            weightApplied: 0,
            severity: "info",
            title: "Local network device",
            explanation:
              "This address is inside your own network (router, NAS, printer, dev server). Fundament does not score it like a public website.",
          }
        : signal(
            "ip-host",
            WEIGHTS.ipLiteralHost,
            "warn",
            "IP address as website name",
            "The site is reached by a raw IP address instead of a normal domain name. That is uncommon for legitimate login pages.",
          ),
    );
  }

  if (input.threatProtection && domain && !parsed.isIpLiteral && !isPrivateOrLocalHost(domain.hostname) && looksLikeDnsRebindHost(domain.hostname, domain.registrableDomain)) {
    signals.push(
      signal(
        "dns-rebind",
        WEIGHTS.dnsRebind,
        "warn",
        "DNS-rebind helper domain",
        "This host is a rebind-helper zone (nip.io, sslip.io, localtest.me, …) or otherwise points at private space. Attackers use that to reach routers and local apps from a public page.",
      ),
    );
  }

  if (domain && input.phishingProtection && !localNetwork) {
    collectDomainSignals(domain, signals);
  }

  if (input.phishingProtection && !localNetwork) {
    const builder = freeHostingSuffix(parsed.hostname, parsed.pathname);
    const cloud = builder ? null : cloudAppSuffix(parsed.hostname);
    const hosting = builder ?? cloud;
    if (hosting) {
      signals.push({
        id: builder ? "free-hosting" : "cloud-hosting",
        weightApplied: 0,
        severity: "info",
        title: builder ? "Free hosting" : "Cloud app hosting",
        explanation: builder
          ? `This page is published on ${hosting}, where anyone can host content. Fine for projects and blogs; never a place for bank, shop, or wallet sign-ins.`
          : `This page runs on ${hosting}, a cloud platform that hosts company apps and phishing kits alike.`,
      });
      const hostedBrand = brandInHostedContent(parsed, domain);
      if (hostedBrand) {
        signals.push({
          id: "brand-hosted",
          weightApplied: WEIGHTS.brandHosted,
          severity: "info",
          title: `${hostedBrand} named on hosted page`,
          explanation: `The address of this user-hosted page names ${hostedBrand}. Real ${hostedBrand} pages are not served from ${hosting}.`,
        });
      }
    }
  }

  // Router UIs and dev servers (localhost:3000/login) are not phishing-shaped URLs.
  if (input.phishingProtection && !localNetwork) {
    collectUrlShapeSignals(parsed, domain, signals);
  }

  if (blocklisted && input.threatProtection) {
    signals.push(
      signal(
        "blocklist",
        WEIGHTS.userBlocklist,
        "fail",
        "On your blocklist",
        "This host is on the blocklist you configured in Fundament.",
      ),
    );
  }

  const maliciousTest =
    domain !== null && isKnownTestMalicious(parsed.hostname, domain.registrableDomain);
  if (maliciousTest && input.threatProtection) {
    signals.push(
      signal(
        "known-malicious",
        WEIGHTS.knownMaliciousHost,
        "fail",
        "Known malicious infrastructure",
        "This host is on Fundament’s shipped test list of known-bad demonstration hosts (not a live threat feed).",
      ),
    );
  }

  let reputationAvailable = false;
  if (input.threatProtection && domain) {
    try {
      const remote = await intelligence.checkDomain(domain.registrableDomain);
      reputationAvailable = remote.available;
      if (remote.available && remote.listed) {
        signals.push(
          signal(
            "remote-reputation",
            WEIGHTS.knownMaliciousHost,
            "fail",
            "Listed by threat intelligence",
            `The reputation provider “${remote.source}” lists this domain.`,
          ),
        );
      } else if (remote.available) {
        signals.push(
          okSignal(
            "remote-reputation",
            "Domain reputation",
            `The reputation provider “${remote.source}” does not currently list this domain.`,
          ),
        );
      } else {
        signals.push(
          unavailableSignal(
            "remote-reputation",
            "Domain reputation",
            "Online reputation is unavailable. Local protection is still active.",
          ),
        );
      }
    } catch {
      signals.push(
        unavailableSignal(
          "remote-reputation",
          "Domain reputation",
          "Online reputation is unavailable. Local protection is still active.",
        ),
      );
    }
  } else {
    signals.push(
      unavailableSignal(
        "remote-reputation",
        "Domain reputation",
        "Online reputation is not configured. Local protection is active.",
      ),
    );
  }

  signals.push(
    unavailableSignal(
      "certificate",
      "Certificate",
      "Chrome does not expose certificate details to this extension. Your browser still enforces TLS for HTTPS sites.",
    ),
  );

  signals.push(
    unavailableSignal(
      "domain-age",
      "Domain age",
      "Domain age is not available without a remote registry lookup, which this build does not perform.",
    ),
  );

  const combined = applyCombos(signals);
  const raw = combined.reduce((sum, s) => sum + s.weightApplied, 0);
  const score = allowlisted ? 0 : applyLevel(clampScore(raw), input.securityLevel);

  return {
    url: parsed.href,
    parsed,
    domain,
    parseError: null,
    signals: combined,
    score,
    band: allowlisted ? "safe" : bandForScore(score),
    engineVersion: ENGINE_VERSION,
    weightsVersion: WEIGHTS_VERSION,
    reputationAvailable,
    trackerHits: 0,
    allowlisted,
    blocklisted,
    analyzedAt: Date.now(),
  };
}

function collectDomainSignals(domain: ParsedDomain, signals: RiskSignal[]): void {
  if (looksLikeHomograph(domain.labelsUnicode, domain.containsPunycode)) {
    const mixed = hasMixedScripts(domain.labelsUnicode);
    signals.push(
      signal(
        "homograph",
        mixed ? WEIGHTS.mixedScript : WEIGHTS.punycodeHomograph,
        "warn",
        mixed ? "Mixed-script domain" : "Lookalike letters in the domain",
        mixed
          ? "This domain mixes writing systems in one name (for example Latin and Cyrillic). That is how attackers imitate familiar brand names."
          : "Every letter of this domain is a foreign character that looks like a Latin letter. It reads like a familiar name but is a different address.",
      ),
    );
  } else if (domain.containsPunycode) {
    signals.push({
      id: "homograph",
      weightApplied: 0,
      severity: "info",
      title: "Internationalized domain",
      explanation: `This domain uses non-ASCII letters (${domain.hostnameUnicode}). Nothing in it imitates Latin letters.`,
    });
  }

  const impersonation = detectImpersonation(domain);
  if (impersonation) {
    signals.push(impersonationSignal(impersonation, domain));
  }

  const depth = domain.subdomain ? domain.subdomain.split(".").length : 0;
  const hyphenCount = (domain.registrableDomain.split(".")[0] ?? "").split("-").length - 1;
  if (ELEVATED_RISK_TLDS.has(domain.tld) && (strongImpersonation(impersonation) || hyphenCount >= 2)) {
    signals.push(
      signal(
        "tld",
        WEIGHTS.elevatedTld,
        "warn",
        "Uncommon domain ending",
        impersonation
          ? `The domain ending “.${domain.tld}” is often used in throwaway phishing domains, together with a brand lookalike.`
          : `The domain ending “.${domain.tld}” is often used for throwaway phishing sites.`,
      ),
    );
  }

  if (depth >= 3) {
    signals.push(
      signal(
        "subdomains",
        WEIGHTS.manySubdomains,
        "warn",
        "Many subdomains",
        "Unusually nested subdomains can hide the real registered domain on the right.",
      ),
    );
  }

  if (isShortener(domain.registrableDomain)) {
    signals.push(
      signal(
        "shortener",
        WEIGHTS.shortener,
        "info",
        "URL shortener",
        "Short links hide the final destination until they redirect. Fundament will analyze the next page separately.",
      ),
    );
  }

  if (!impersonation) {
    signals.push(
      okSignal(
        "impersonation",
        "Brand similarity",
        "This registered domain does not closely imitate a catalogued consumer brand.",
      ),
    );
  }
}

function collectUrlShapeSignals(
  parsed: ParsedUrl,
  domain: ParsedDomain | null,
  signals: RiskSignal[],
): void {
  const href = parsed.href;
  if (href.length > 180) {
    signals.push(
      signal(
        "length",
        WEIGHTS.longUrl,
        "info",
        "Very long address",
        "Unusually long URLs are sometimes used to bury the real host or to smuggle extra parameters.",
      ),
    );
  }

  const encoded = countPercentEncodings(parsed.pathname + parsed.search);
  if (looksDoubleEncoded(parsed.href) || encoded >= 8) {
    signals.push(
      signal(
        "encoding",
        WEIGHTS.encodingAnomaly,
        "warn",
        "Odd URL encoding",
        "This address uses heavy or nested percent-encoding, which can hide the real destination.",
      ),
    );
  }

  const redirect = analyzeRedirectShape(parsed);
  if (redirect.nestedUrl || redirect.chainedParams) {
    signals.push(
      signal(
        "redirect",
        WEIGHTS.suspiciousRedirect,
        "warn",
        "Suspicious redirect",
        "The address embeds another URL or chains multiple redirect parameters. That is a common open-redirect phishing pattern.",
      ),
    );
  }

  const loginShaped =
    LOGIN_PATH_RE.test(parsed.pathname) || LOGIN_QUERY_RE.test(parsed.search);
  const params = new URLSearchParams(parsed.search);
  let sensitiveQuery = false;
  for (const key of params.keys()) {
    if (SUSPICIOUS_QUERY_KEYS.has(key.toLowerCase())) sensitiveQuery = true;
  }

  const suspiciousHost = Boolean(
    domain &&
      (ELEVATED_RISK_TLDS.has(domain.tld) ||
        looksLikeHomograph(domain.labelsUnicode) ||
        strongImpersonation(detectImpersonation(domain)) ||
        freeHostingSuffix(parsed.hostname, parsed.pathname)),
  );

  if (loginShaped && parsed.protocol === "http:") {
    signals.push(
      signal(
        "login-http",
        WEIGHTS.loginOverHttp,
        "warn",
        "Sign-in over HTTP",
        "This looks like a sign-in page on an unencrypted connection. Do not enter a password here.",
      ),
    );
  } else if (loginShaped && (suspiciousHost || redirect.nestedUrl || sensitiveQuery)) {
    signals.push(
      signal(
        "login",
        WEIGHTS.loginOnSuspiciousHost,
        "warn",
        "Login page on a suspicious host",
        "This looks like a sign-in page, but the host or the URL structure is not typical of a legitimate login flow.",
      ),
    );
  }

  if (sessionIdInUrl(parsed.href)) {
    signals.push(
      signal(
        "session-url",
        WEIGHTS.sessionInUrl,
        "warn",
        "Session id in the address",
        "The URL carries a session identifier (JSESSIONID, PHPSESSID, …). That is session fixation / hijacking material: the id leaks into logs, Referer, and history.",
      ),
    );
  }

  signals.push(...extraUrlSignals(parsed));
  const impersonating = strongImpersonation(domain ? detectImpersonation(domain) : null);
  signals.push(...extraWeb3AiSignals(parsed, domain, impersonating));
  signals.push(...extraKitSignals(parsed, domain, impersonating, redirect.nestedUrl));
}

const STRONG_REASONS = new Set(["embedded-domain", "confusable", "other-tld", "keyword-combo"]);

export function strongImpersonation(hit: ImpersonationHit | null): boolean {
  return Boolean(hit && STRONG_REASONS.has(hit.reason));
}

function impersonationSignal(hit: ImpersonationHit, domain: ParsedDomain): RiskSignal {
  const brand = hit.brand.name;
  const official = hit.brand.domains.slice(0, 3).join(", ");
  switch (hit.reason) {
    case "embedded-domain":
      return signal(
        "impersonation",
        WEIGHTS.impersonationEmbedded,
        "warn",
        `Fake ${brand} address`,
        `The real ${brand} domain is only a prefix here. The site you are on is “${domain.registrableDomain}”, not ${official}.`,
      );
    case "confusable":
      return signal(
        "impersonation",
        WEIGHTS.impersonationConfusable,
        "warn",
        `Looks like ${brand}`,
        `“${domain.registrableDomain}” swaps letters for lookalikes (1 for l, rn for m, Cyrillic for Latin). The real ${brand} uses ${official}.`,
      );
    case "other-tld":
      return signal(
        "impersonation",
        WEIGHTS.impersonationOtherTld,
        "warn",
        `Not the official ${brand} site`,
        `“${domain.registrableDomain}” uses the ${brand} name on an ending ${brand} does not use. The real site is ${official}.`,
      );
    case "keyword-combo":
      return signal(
        "impersonation",
        WEIGHTS.impersonationKeyword,
        "warn",
        `Looks like ${brand}`,
        `“${domain.hostname}” pairs ${brand} with words like login, verify, or support. ${brand} does not run its sign-in there; the real site is ${official}.`,
      );
    case "typo":
      return {
        id: "impersonation",
        weightApplied: WEIGHTS.impersonationTypo,
        severity: "info",
        title: `Close to ${brand}`,
        explanation: `“${domain.registrableDomain}” is one letter away from ${brand}. Many real names are, so this only matters together with a sign-in form.`,
      };
    default:
      return {
        id: "impersonation",
        weightApplied: WEIGHTS.impersonationWeak,
        severity: "info",
        title: `Mentions ${brand}`,
        explanation: `This address contains the name ${brand} but is not ${official}. Fan sites and partners do that too; Fundament escalates only if the page asks for credentials.`,
      };
  }
}
