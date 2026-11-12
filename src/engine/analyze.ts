import type { AnalysisInput, ParsedDomain, ParsedUrl, RiskSignal, UrlAnalysis } from "@shared/types";
import { ENGINE_VERSION } from "./version";
import { parseHttpUrl, UrlParseError, looksDoubleEncoded, countPercentEncodings } from "./url/parse";
import { parseDomain } from "./domain/parse";
import { looksLikeHomograph } from "./homograph/detect";
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
import { hostMatchesList, isKnownTestMalicious } from "./reputation/local";
import { textSignal } from "./i18n/signal";
import type { ThreatIntelligenceProvider } from "@shared/types";
import { NullThreatIntelligence } from "./reputation/null-provider";

export interface AnalyzeOptions {
  intelligence?: ThreatIntelligenceProvider;
}

function emptyAnalysis(url: string, parseError: string): UrlAnalysis {
  return {
    url,
    parsed: null,
    domain: null,
    parseError,
    signals: [textSignal("parse", "parse", 0, "fail", [parseError])],
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

export async function analyzeUrl(input: AnalysisInput, options: AnalyzeOptions = {}): Promise<UrlAnalysis> {
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
  const allowlisted = hostMatchesList(parsed.hostname, input.allowlist) || hostMatchesList(hostKey, input.allowlist);
  const blocklisted = hostMatchesList(parsed.hostname, input.blocklist) || hostMatchesList(hostKey, input.blocklist);

  const signals: RiskSignal[] = [];
  const localNetwork = isLocalNetworkName(parsed.hostname);

  if (parsed.protocol === "https:") {
    signals.push(textSignal("https", "https-ok", 0, "ok"));
  } else {
    signals.push(
      textSignal(
        "https",
        localNetwork ? "https-local" : "https-plain",
        input.phishingProtection && !localNetwork ? WEIGHTS.httpPlain : 0,
        "warn",
      ),
    );
  }

  if (parsed.hasUserInfo && input.phishingProtection) {
    signals.push(textSignal("userinfo", "userinfo", WEIGHTS.userInfoInUrl, "warn"));
  }

  if (parsed.isIpLiteral && input.threatProtection) {
    signals.push(
      isPrivateOrLocalHost(parsed.hostname)
        ? textSignal("ip-host", "ip-local", 0, "info")
        : textSignal("ip-host", "ip-public", WEIGHTS.ipLiteralHost, "warn"),
    );
  }

  // A rebind zone's own homepage (nip.io) is harmless; only names that encode an IP are the pattern.
  if (
    input.threatProtection &&
    domain &&
    !parsed.isIpLiteral &&
    !isPrivateOrLocalHost(domain.hostname) &&
    domain.hostname !== domain.registrableDomain &&
    domain.hostname !== `www.${domain.registrableDomain}` &&
    looksLikeDnsRebindHost(domain.hostname, domain.registrableDomain)
  ) {
    signals.push(textSignal("dns-rebind", "dns-rebind", WEIGHTS.dnsRebind, "warn"));
  }

  // Established sites (top of a public popularity list) are not judged by their *name*:
  // brands own dozens of domains (netflix.net, google.org, amazon.jobs). Everything else
  // still applies — feeds, page checks, ClickFix, wallet guard, downloads.
  // User sites on hosting platforms (x.weebly.com, x.s3.amazonaws.com) never inherit the platform's popularity.
  const userHosted = Boolean(freeHostingSuffix(parsed.hostname, parsed.pathname) || cloudAppSuffix(parsed.hostname));
  const popular = Boolean(domain && !userHosted && input.isPopular?.(domain.registrableDomain, domain.hostname));
  if (popular) signals.push(textSignal("popular", "popular", 0, "ok"));

  if (domain && input.phishingProtection && !localNetwork) {
    collectDomainSignals(domain, signals, popular);
  }

  if (input.phishingProtection && !localNetwork) {
    const builder = freeHostingSuffix(parsed.hostname, parsed.pathname);
    const cloud = builder ? null : cloudAppSuffix(parsed.hostname);
    const hosting = builder ?? cloud;
    if (hosting) {
      const id = builder ? "free-hosting" : "cloud-hosting";
      signals.push(textSignal(id, id, 0, "info", [hosting]));
      const hostedBrand = brandInHostedContent(parsed, domain);
      if (hostedBrand) {
        signals.push(textSignal("brand-hosted", "brand-hosted", WEIGHTS.brandHosted, "info", [hostedBrand, hosting]));
      }
    }
  }

  // Router UIs and dev servers (localhost:3000/login) are not phishing-shaped URLs.
  if (input.phishingProtection && !localNetwork) {
    collectUrlShapeSignals(parsed, domain, signals, popular);
  }

  if (blocklisted && input.threatProtection) {
    signals.push(textSignal("blocklist", "blocklist", WEIGHTS.userBlocklist, "fail"));
  }

  const maliciousTest = domain !== null && isKnownTestMalicious(parsed.hostname, domain.registrableDomain);
  if (maliciousTest && input.threatProtection) {
    signals.push(textSignal("known-malicious", "known-test", WEIGHTS.knownMaliciousHost, "fail"));
  }

  let reputationAvailable = false;
  if (input.threatProtection && domain) {
    try {
      const remote = await intelligence.checkDomain(domain.registrableDomain);
      reputationAvailable = remote.available;
      if (remote.available && remote.listed) {
        signals.push(textSignal("remote-reputation", "rep-listed", WEIGHTS.knownMaliciousHost, "fail", [remote.source]));
      } else if (remote.available) {
        signals.push(textSignal("remote-reputation", "rep-ok", 0, "ok", [remote.source]));
      } else {
        signals.push(textSignal("remote-reputation", "rep-unavailable", 0, "unavailable"));
      }
    } catch {
      signals.push(textSignal("remote-reputation", "rep-unavailable", 0, "unavailable"));
    }
  } else {
    signals.push(textSignal("remote-reputation", "rep-off", 0, "unavailable"));
  }

  signals.push(textSignal("certificate", "certificate", 0, "unavailable"));
  signals.push(textSignal("domain-age", "domain-age", 0, "unavailable"));

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

function collectDomainSignals(domain: ParsedDomain, signals: RiskSignal[], popular: boolean): void {
  if (looksLikeHomograph(domain.labelsUnicode, domain.containsPunycode)) {
    signals.push(textSignal("homograph", "homograph-mixed", WEIGHTS.mixedScript, "warn"));
  } else if (domain.containsPunycode) {
    signals.push(textSignal("homograph", "homograph-idn", 0, "info", [domain.hostnameUnicode]));
  }

  const impersonation = popular ? null : detectImpersonation(domain);
  if (impersonation) {
    signals.push(impersonationSignal(impersonation, domain));
  }

  const depth = domain.subdomain ? domain.subdomain.split(".").length : 0;
  const hyphenCount = (domain.registrableDomain.split(".")[0] ?? "").split("-").length - 1;
  if (ELEVATED_RISK_TLDS.has(domain.tld) && (strongImpersonation(impersonation) || hyphenCount >= 2)) {
    signals.push(textSignal("tld", "tld", WEIGHTS.elevatedTld, "warn", [domain.tld]));
  }

  if (depth >= 3 && !popular) {
    signals.push(textSignal("subdomains", "subdomains", WEIGHTS.manySubdomains, "warn"));
  }

  if (isShortener(domain.registrableDomain)) {
    signals.push(textSignal("shortener", "shortener", WEIGHTS.shortener, "info"));
  }

  if (!impersonation && !popular) {
    signals.push(textSignal("impersonation", "impersonation-ok", 0, "ok"));
  }
}

function collectUrlShapeSignals(parsed: ParsedUrl, domain: ParsedDomain | null, signals: RiskSignal[], popular: boolean): void {
  if (parsed.href.length > 180) {
    signals.push(textSignal("length", "length", WEIGHTS.longUrl, "info"));
  }

  const encoded = countPercentEncodings(parsed.pathname + parsed.search);
  if (looksDoubleEncoded(parsed.href) || encoded >= 8) {
    signals.push(textSignal("encoding", "encoding", WEIGHTS.encodingAnomaly, "warn"));
  }

  const redirect = analyzeRedirectShape(parsed);
  if (redirect.nestedUrl || redirect.chainedParams) {
    signals.push(textSignal("redirect", "redirect", WEIGHTS.suspiciousRedirect, "warn"));
  }

  const loginShaped = LOGIN_PATH_RE.test(parsed.pathname) || LOGIN_QUERY_RE.test(parsed.search);
  const params = new URLSearchParams(parsed.search);
  let sensitiveQuery = false;
  for (const key of params.keys()) {
    if (SUSPICIOUS_QUERY_KEYS.has(key.toLowerCase())) sensitiveQuery = true;
  }

  const suspiciousHost = Boolean(
    domain &&
      !popular &&
      (ELEVATED_RISK_TLDS.has(domain.tld) ||
        looksLikeHomograph(domain.labelsUnicode) ||
        strongImpersonation(detectImpersonation(domain)) ||
        freeHostingSuffix(parsed.hostname, parsed.pathname)),
  );

  if (loginShaped && parsed.protocol === "http:") {
    signals.push(textSignal("login-http", "login-http", WEIGHTS.loginOverHttp, "warn"));
  } else if (loginShaped && (suspiciousHost || redirect.nestedUrl || sensitiveQuery)) {
    // Informational on its own (plenty of real sites run /login on .shop or .info);
    // it counts toward the brand + credential combination.
    signals.push(textSignal("login", "login", WEIGHTS.loginOnSuspiciousHost, "info"));
  }

  if (sessionIdInUrl(parsed.href)) {
    signals.push(textSignal("session-url", "session-url", WEIGHTS.sessionInUrl, "warn"));
  }

  signals.push(...extraUrlSignals(parsed));
  const impersonating = !popular && strongImpersonation(domain ? detectImpersonation(domain) : null);
  signals.push(...extraWeb3AiSignals(parsed, domain, impersonating, popular));
  signals.push(...extraKitSignals(parsed, domain, impersonating, redirect.nestedUrl, popular));
}

const STRONG_REASONS = new Set(["embedded-domain", "confusable", "other-tld", "keyword-combo"]);

export function strongImpersonation(hit: ImpersonationHit | null): boolean {
  return Boolean(hit && STRONG_REASONS.has(hit.reason));
}

function impersonationSignal(hit: ImpersonationHit, domain: ParsedDomain): RiskSignal {
  const brand = hit.brand.name;
  // The main domain only: "paypal.com", not the CDN and short-link domains behind it.
  const official = hit.brand.domains[0] ?? brand;
  switch (hit.reason) {
    case "embedded-domain":
      return textSignal("impersonation", "imp-embedded", WEIGHTS.impersonationEmbedded, "warn", [brand, domain.registrableDomain, official]);
    case "confusable":
      return textSignal("impersonation", "imp-confusable", WEIGHTS.impersonationConfusable, "warn", [brand, domain.registrableDomain, official]);
    case "other-tld":
      return textSignal("impersonation", "imp-other-tld", WEIGHTS.impersonationOtherTld, "warn", [brand, domain.registrableDomain, official]);
    case "keyword-combo":
      return textSignal("impersonation", "imp-keyword", WEIGHTS.impersonationKeyword, "warn", [brand, domain.hostname, official]);
    case "typo":
      return textSignal("impersonation", "imp-typo", WEIGHTS.impersonationTypo, "info", [brand, domain.registrableDomain, official]);
    default:
      return textSignal("impersonation", "imp-weak", WEIGHTS.impersonationWeak, "info", [brand, domain.registrableDomain, official]);
  }
}
