import type { RiskSignal } from "@shared/types";
import { WEIGHTS } from "./weights";
import { textSignal } from "../i18n/signal";

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
    signals.push(textSignal("combo-brand-credential", "combo-brand-credential", WEIGHTS.comboBrandCredential, "warn"));
  }
  if (hosted && pageCredential) {
    signals.push(textSignal("combo-hosted-credential", "combo-hosted-credential", WEIGHTS.comboHostedCredential, "warn"));
  }
  const impersonation = signals.find((s) => s.id === "impersonation" && s.weightApplied > 0);
  const content = signals.find((s) => s.id === "brand-content");
  if (impersonation && content) {
    signals.push(textSignal("combo-brand-twice", "combo-brand-twice", WEIGHTS.comboBrandTwice, "warn"));
  }
  return signals;
}
