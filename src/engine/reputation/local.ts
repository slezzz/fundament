import type { RiskSignal } from "@shared/types";

/** Shipped for tests and Safe Browsing-style public test hosts only. Not a malware feed. */
export const TEST_MALICIOUS_HOSTS = new Set([
  "testsafebrowsing.appspot.com",
  "malware.testing.google.test",
  "phishing.testing.google.test",
]);

export function isKnownTestMalicious(hostname: string, registrable: string): boolean {
  return TEST_MALICIOUS_HOSTS.has(hostname) || TEST_MALICIOUS_HOSTS.has(registrable);
}

export function hostMatchesList(host: string, list: string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return list.some((entry) => {
    const e = entry.toLowerCase().replace(/\.$/, "").trim();
    if (!e) return false;
    return h === e || h.endsWith(`.${e}`);
  });
}

export function okSignal(id: string, title: string, explanation: string): RiskSignal {
  return { id, weightApplied: 0, severity: "ok", title, explanation };
}

export function unavailableSignal(id: string, title: string, explanation: string): RiskSignal {
  return { id, weightApplied: 0, severity: "unavailable", title, explanation };
}
