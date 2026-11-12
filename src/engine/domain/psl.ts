import { PSL_RULES } from "./psl-data";

/**
 * Public Suffix List lookup (full list incl. private section, from publicsuffix.org).
 * Implements the standard algorithm: longest matching rule wins, wildcards (*.ck)
 * and exceptions (!www.ck) included, unknown endings fall back to the last label.
 */
const EXACT = new Set<string>();
const WILDCARD = new Set<string>();
const EXCEPTION = new Set<string>();

for (const rule of PSL_RULES.split("\n")) {
  if (!rule) continue;
  if (rule.startsWith("!")) EXCEPTION.add(rule.slice(1));
  else if (rule.startsWith("*.")) WILDCARD.add(rule.slice(2));
  else EXACT.add(rule);
}

export function splitHostname(hostname: string): string[] {
  const host = hostname.startsWith("[") ? hostname : hostname.replace(/\.$/, "");
  return host.split(".").filter(Boolean);
}

/** Number of labels that form the public suffix of these (lowercase, punycode) labels. */
function suffixLength(labels: string[]): number {
  for (let i = 0; i < labels.length; i++) {
    const candidate = labels.slice(i).join(".");
    if (EXCEPTION.has(candidate)) return labels.length - i - 1;
    const parent = labels.slice(i + 1).join(".");
    if (EXACT.has(candidate) || (parent && WILDCARD.has(parent))) return labels.length - i;
  }
  return Math.min(1, labels.length);
}

export function publicSuffixOf(labels: string[]): string {
  if (labels.length === 0) return "";
  const lower = labels.map((l) => l.toLowerCase());
  return lower.slice(lower.length - suffixLength(lower)).join(".");
}

export function registrableDomainOf(labels: string[]): string {
  if (labels.length === 0) return "";
  const lower = labels.map((l) => l.toLowerCase());
  const needed = suffixLength(lower) + 1;
  if (lower.length < needed) return lower.join(".");
  return lower.slice(lower.length - needed).join(".");
}

export function isPublicSuffix(host: string): boolean {
  const labels = splitHostname(host.toLowerCase());
  return labels.length > 0 && suffixLength(labels) === labels.length;
}
