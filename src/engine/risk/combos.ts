import type { RiskSignal } from "@shared/types";
import { WEIGHTS } from "./weights";

/**
 * Single signals are deliberately weak so ordinary sites stay green.
 * Phishing is a *combination*: a brand that is not the real brand, plus a place
 * to type secrets. These combos are what push a real kit over the warning line.
 */
const BRANDISH = new Set(["impersonation", "brand-content", "brand-hosted"]);
const CREDENTIAL = new Set([
  "login",
  "login-http",
  "password-http",
  "insecure-form",
  "cross-origin-login",
  "login-form",
  "seed-form",
  "api-key-field",
  "card-form",
  "browser-in-browser",
]);
const PAGE_CREDENTIAL = new Set(["login-form", "seed-form", "card-form", "api-key-field", "cross-origin-login"]);
const COMBO_IDS = new Set(["combo-brand-credential", "combo-hosted-credential", "combo-brand-twice"]);

function has(signals: RiskSignal[], ids: Set<string>): boolean {
  return signals.some((s) => ids.has(s.id) && s.severity !== "ok" && s.severity !== "unavailable");
}

export function applyCombos(input: RiskSignal[]): RiskSignal[] {
  const signals = input.filter((s) => !COMBO_IDS.has(s.id));
  const hosted = signals.some((s) => s.id === "free-hosting");
  const anyHosting = hosted || signals.some((s) => s.id === "cloud-hosting");
  const riskyEnding = signals.some((s) => s.id === "tld" && s.weightApplied > 0);
  // Weak brand hints ("Mentions PayPal", apple.stackexchange.com) only count on throwaway hosting.
  const brand = signals.some(
    (s) =>
      BRANDISH.has(s.id) &&
      (s.severity === "warn" || s.severity === "fail" || (s.severity === "info" && s.weightApplied > 0 && (anyHosting || riskyEnding || s.id === "brand-hosted"))),
  );
  const credential = has(signals, CREDENTIAL);
  const pageCredential = has(signals, PAGE_CREDENTIAL);

  if (brand && credential) {
    signals.push({
      id: "combo-brand-credential",
      weightApplied: WEIGHTS.comboBrandCredential,
      severity: "warn",
      title: "Brand lookalike asks for credentials",
      explanation:
        "This page uses a brand it does not belong to and asks for a password, card, key, or recovery phrase. That combination is the core of credential phishing.",
    });
  }
  if (hosted && pageCredential) {
    signals.push({
      id: "combo-hosted-credential",
      weightApplied: WEIGHTS.comboHostedCredential,
      severity: "warn",
      title: "Sign-in form on free hosting",
      explanation:
        "This page is published on a free hosting or form service and asks for credentials. Real banks, shops, and wallets never collect logins there.",
    });
  }
  const impersonation = signals.find((s) => s.id === "impersonation" && s.weightApplied > 0);
  const content = signals.find((s) => s.id === "brand-content");
  if (impersonation && content) {
    signals.push({
      id: "combo-brand-twice",
      weightApplied: WEIGHTS.comboBrandTwice,
      severity: "warn",
      title: "Domain and page both imitate a brand",
      explanation: "Both the address and the page content claim to be a brand that this domain does not belong to.",
    });
  }
  return signals;
}
