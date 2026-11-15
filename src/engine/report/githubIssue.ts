import { toASCII } from "punycode";
import { REPORT_GITHUB_REPO } from "@shared/constants";
import { SIGNAL_COPY } from "../i18n/signals";
import { isLocalNetworkName, isPrivateOrLocalHost, looksLikeDnsRebindHost } from "../network/dnsRebind";

export const FALSE_POSITIVE_TEMPLATE = "false-positive.yml";
export const MISSED_PHISH_TEMPLATE = "missed-phish.yml";

const MAX_SIGNALS = 40;
const MAX_URL_LENGTH = 7500;
const SIGNAL_KEY = /^[a-z0-9-]{1,64}$/;
const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/;
const HOST = /^[\p{L}\p{N}](?:[\p{L}\p{N}.-]{0,251}[\p{L}\p{N}])?$/u;
const FIELD_KEY = /^[a-z0-9_]{1,32}$/;
const TEMPLATE = /^[a-z0-9.-]+\.yml$/;

export interface FalsePositiveReportInput {
  /** Unicode hostname already parsed by the engine. Never a full URL. */
  hostname: string;
  /** ASCII / punycode hostname from the same parse. */
  hostnameAscii: string;
  /** From the parser: a Public Suffix List rule matched. The last-label fallback is false. */
  inPublicSuffixList: boolean;
  /** eTLD+1 from the same parse. Empty for IP literals. */
  registrableDomain: string;
  /** Catalog keys (`signal.key`, else `signal.id`). Warn and fail only. */
  signalKeys: readonly string[];
  engineVersion: string;
  weightsVersion: string;
  extensionVersion: string;
}

export interface FalsePositiveReport {
  host: string;
  /** Punycode form when it differs from `host`. */
  hostAscii: string | null;
  signals: string[];
  engineVersion: string;
  weightsVersion: string;
  extensionVersion: string;
  url: string;
}

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
}

/**
 * Public hosts only. Home-network names, private addresses, DNS-rebind names
 * (nip.io and the other zones in dnsRebind.ts), and names the Public Suffix List
 * does not recognize never get a report link: the issue would be public.
 */
export function reportHostAllowed(hostname: string, inPublicSuffixList: boolean, registrableDomain = ""): boolean {
  const host = bareHost(hostname);
  if (!host || host.length > 253 || !inPublicSuffixList) return false;
  if (isLocalNetworkName(host) || isPrivateOrLocalHost(host)) return false;
  if (looksLikeDnsRebindHost(host, registrableDomain)) return false;
  return true;
}

function cleanHost(raw: string): string | null {
  const host = raw.replace(/\.$/, "").toLowerCase();
  if (!HOST.test(host)) return null;
  const labels = host.split(".");
  if (labels.some((label) => label.length === 0 || label.length > 63 || label.startsWith("-") || label.endsWith("-"))) {
    return null;
  }
  return host;
}

function sameHost(unicode: string, ascii: string): boolean {
  try {
    return toASCII(unicode.toLowerCase()) === ascii.toLowerCase();
  } catch {
    return false;
  }
}

/** `https://github.com/<REPORT_GITHUB_REPO>/issues/new` and nothing else. */
export function reportIssueRoot(): string {
  return `https://github.com/${REPORT_GITHUB_REPO}/issues/new`;
}

function issueUrl(template: string, fields: Record<string, string>): string | null {
  if (!TEMPLATE.test(template)) return null;
  if (!/^[a-z0-9-]+\/[a-z0-9._-]+$/i.test(REPORT_GITHUB_REPO)) return null;
  let url: URL;
  try {
    url = new URL(reportIssueRoot());
  } catch {
    return null;
  }
  if (`${url.origin}${url.pathname}` !== reportIssueRoot()) return null;
  url.searchParams.set("template", template);
  for (const [key, value] of Object.entries(fields)) {
    if (!FIELD_KEY.test(key)) return null;
    url.searchParams.set(key, value);
  }
  if (url.username || url.password || url.hash) return null;
  if (`${url.origin}${url.pathname}` !== reportIssueRoot()) return null;
  if (url.searchParams.get("template") !== template) return null;
  const href = url.toString();
  if (href.length > MAX_URL_LENGTH) return null;
  const again = new URL(href);
  if (`${again.origin}${again.pathname}` !== reportIssueRoot()) return null;
  return href;
}

export function falsePositiveReport(input: FalsePositiveReportInput): FalsePositiveReport | null {
  const host = cleanHost(input.hostname);
  const ascii = cleanHost(input.hostnameAscii);
  if (!host || !ascii) return null;
  if (!sameHost(host, ascii)) return null;
  if (
    !reportHostAllowed(host, input.inPublicSuffixList, input.registrableDomain) ||
    !reportHostAllowed(ascii, input.inPublicSuffixList, input.registrableDomain)
  ) {
    return null;
  }
  if (!VERSION.test(input.engineVersion) || !VERSION.test(input.weightsVersion) || !VERSION.test(input.extensionVersion)) {
    return null;
  }
  const signals = [...new Set(input.signalKeys.filter((key) => SIGNAL_KEY.test(key) && Object.hasOwn(SIGNAL_COPY, key)))]
    .sort()
    .slice(0, MAX_SIGNALS);
  if (signals.length === 0) return null;

  const hostAscii = ascii.toLowerCase() === host.toLowerCase() ? null : ascii;
  const title = `False alarm: ${host}`;
  const url = issueUrl(FALSE_POSITIVE_TEMPLATE, {
    ...(title.length <= 240 ? { title } : { title: "False alarm" }),
    host,
    ...(hostAscii ? { host_ascii: hostAscii } : {}),
    signals: signals.join(","),
    engine: input.engineVersion,
    weights: input.weightsVersion,
    extension: input.extensionVersion,
  });
  if (!url) return null;
  return {
    host,
    hostAscii,
    signals,
    engineVersion: input.engineVersion,
    weightsVersion: input.weightsVersion,
    extensionVersion: input.extensionVersion,
    url,
  };
}

/** Empty public form. The extension adds no hostname. */
export function missedPhishingIssueUrl(): string {
  const url = issueUrl(MISSED_PHISH_TEMPLATE, {});
  if (!url) throw new Error("missed-phishing issue URL is not the configured repository");
  return url;
}
