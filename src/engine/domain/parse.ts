import { toUnicode } from "punycode";
import type { ParsedDomain, ParsedUrl } from "@shared/types";
import { hasPublicSuffixRule, publicSuffixOf, registrableDomainOf, splitHostname } from "./psl";

export function parseDomain(parsed: ParsedUrl): ParsedDomain | null {
  if (parsed.isIpLiteral) {
    return null;
  }

  const labels = splitHostname(parsed.hostname);
  if (labels.length === 0) {
    return null;
  }

  const labelsUnicode = labels.map((label) => {
    if (label.startsWith("xn--")) {
      try {
        return toUnicode(label);
      } catch {
        return label;
      }
    }
    return label;
  });

  const publicSuffix = publicSuffixOf(labels);
  const registrableDomain = registrableDomainOf(labels);
  const suffixLen = publicSuffix.split(".").filter(Boolean).length;
  const registrableLen = suffixLen + 1;
  const subdomain =
    labels.length > registrableLen ? labels.slice(0, labels.length - registrableLen).join(".") : "";
  const tld = labels[labels.length - 1] ?? "";

  return {
    hostname: parsed.hostname,
    hostnameUnicode: parsed.hostnameUnicode,
    labels,
    labelsUnicode,
    registrableDomain,
    publicSuffix,
    inPublicSuffixList: hasPublicSuffixRule(parsed.hostname),
    subdomain,
    tld,
    containsPunycode: labels.some((l) => l.startsWith("xn--")),
  };
}
