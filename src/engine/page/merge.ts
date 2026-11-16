import type { RiskSignal, SecurityLevel, UrlAnalysis } from "@shared/types";
import { applyLevel, bandForScore, clampScore } from "../risk/score";
import { textSignal } from "../i18n/signal";
import { WEIGHTS } from "../risk/weights";
import type { PageSignalKind } from "./kinds";
import { applyCombos } from "../risk/combos";


/** Site-hygiene findings: shown in Inspect, never turn the status away from Protected. */
const HYGIENE = new Set([
  "mixed-content",
  "weak-csp",
  "cookie-flags",
  "prototype-pollution",
  "dom-xss",
  "quishing",
  "fingerprint-canvas",
  "fingerprint-audio",
  "malvertising-chain",
  "permission-bait",
]);

function asHygiene(item: RiskSignal): RiskSignal {
  return HYGIENE.has(item.id) ? { ...item, weightApplied: 0, severity: "info" } : item;
}

export function signalsForPageChecks(kinds: PageSignalKind[]): RiskSignal[] {
  const unique = [...new Set(kinds)];
  const out: RiskSignal[] = [];
  if (unique.includes("password-http")) {
    out.push(
      textSignal("password-http", "password-http", WEIGHTS.passwordOnHttp, "warn"),
    );
  }
  if (unique.includes("insecure-form")) {
    out.push(
      textSignal("insecure-form", "insecure-form", WEIGHTS.insecureForm, "warn"),
    );
  }
  if (unique.includes("overlay-clickjack")) {
    out.push(
      textSignal("overlay-clickjack", "overlay-clickjack", WEIGHTS.overlayClickjack, "warn"),
    );
  }
  if (unique.includes("permission-bait")) {
    out.push(
      textSignal("permission-bait", "permission-bait", WEIGHTS.permissionBait, "warn"),
    );
  }
  if (unique.includes("wallet-http")) {
    out.push(
      textSignal("wallet-http", "wallet-http", WEIGHTS.walletOnHttp, "warn"),
    );
  }
  if (unique.includes("seed-form")) {
    out.push(
      textSignal("seed-form", "seed-form", WEIGHTS.seedForm, "warn"),
    );
  }
  if (unique.includes("api-key-field")) {
    out.push(
      textSignal("api-key-field", "api-key-field", WEIGHTS.apiKeyField, "warn"),
    );
  }
  if (unique.includes("clickfix-clipboard")) {
    out.push(
      textSignal("clickfix-clipboard", "clickfix-clipboard", WEIGHTS.clickFixClipboard, "warn"),
    );
  }
  if (unique.includes("clickfix-unseen")) {
    out.push(
      textSignal("clickfix-unseen", "clickfix-unseen", WEIGHTS.clickFixUnseen, "warn"),
    );
  }
  if (unique.includes("fullscreen-trap")) {
    out.push(
      textSignal("fullscreen-trap", "fullscreen-trap", WEIGHTS.fullscreenTrap, "warn"),
    );
  }
  if (unique.includes("cross-origin-login")) {
    out.push(
      textSignal("cross-origin-login", "cross-origin-login", WEIGHTS.crossOriginLogin, "warn"),
    );
  }
  if (unique.includes("mixed-content")) {
    out.push(
      textSignal("mixed-content", "mixed-content", WEIGHTS.mixedContent, "warn"),
    );
  }
  if (unique.includes("weak-csp")) {
    out.push(
      textSignal("weak-csp", "weak-csp", WEIGHTS.weakCsp, "warn"),
    );
  }
  if (unique.includes("cookie-flags")) {
    out.push(
      textSignal("cookie-flags", "cookie-flags", WEIGHTS.cookieFlags, "warn"),
    );
  }
  if (unique.includes("obfuscated-js")) {
    out.push(
      textSignal("obfuscated-js", "obfuscated-js", WEIGHTS.obfuscatedJs, "warn"),
    );
  }
  if (unique.includes("prototype-pollution")) {
    out.push(
      textSignal("prototype-pollution", "prototype-pollution", WEIGHTS.prototypePollution, "warn"),
    );
  }
  if (unique.includes("dom-xss")) {
    out.push(
      textSignal("dom-xss", "dom-xss", WEIGHTS.domXss, "warn"),
    );
  }
  if (unique.includes("prompt-injection")) {
    out.push(
      textSignal("prompt-injection", "prompt-injection", WEIGHTS.promptInjection, "warn"),
    );
  }
  if (unique.includes("quishing")) {
    out.push(
      textSignal("quishing", "quishing", WEIGHTS.quishing, "warn"),
    );
  }
  if (unique.includes("miner-wasm")) {
    out.push(
      textSignal("miner-wasm", "miner-wasm", WEIGHTS.minerWasm, "warn"),
    );
  }
  if (unique.includes("fingerprint-canvas")) {
    out.push(
      textSignal("fingerprint-canvas", "fingerprint-canvas", WEIGHTS.fingerprintCanvas, "warn"),
    );
  }
  if (unique.includes("fingerprint-audio")) {
    out.push(
      textSignal("fingerprint-audio", "fingerprint-audio", WEIGHTS.fingerprintAudio, "warn"),
    );
  }
  if (unique.includes("malvertising-chain")) {
    out.push(
      textSignal("malvertising-chain", "malvertising-chain", WEIGHTS.malvertisingChain, "warn"),
    );
  }
  if (unique.includes("login-form")) {
    out.push(textSignal("login-form", "login-form", 0, "info"));
  }
  if (unique.includes("card-form")) {
    out.push(textSignal("card-form", "card-form", 0, "info"));
  }
  if (unique.includes("browser-in-browser")) {
    out.push(
      textSignal("browser-in-browser", "browser-in-browser", WEIGHTS.browserInBrowser, "warn"),
    );
  }
  if (unique.includes("tech-support-scam")) {
    out.push(
      textSignal("tech-support-scam", "tech-support-scam", WEIGHTS.techSupportScam, "warn"),
    );
  }
  if (unique.includes("keyboard-lock")) {
    out.push(
      textSignal("keyboard-lock", "keyboard-lock", WEIGHTS.keyboardLock, "warn"),
    );
  }
  if (unique.includes("hidden-autofill")) {
    out.push(
      textSignal("hidden-autofill", "hidden-autofill", WEIGHTS.hiddenAutofill, "warn"),
    );
  }
  if (unique.includes("clipboard-hijack")) {
    out.push(textSignal("clipboard-hijack", "clipboard-hijack", WEIGHTS.clipboardHijack, "fail"));
  }
  if (unique.includes("wallet-drainer")) {
    out.push(
      textSignal("wallet-drainer", "wallet-drainer", WEIGHTS.walletDrainer, "warn"),
    );
  }
  return out.map(asHygiene);
}

export function brandContentSignal(brand: string, domain: string): RiskSignal {
  return textSignal("brand-content", "brand-content", WEIGHTS.brandContent, "warn", [brand, domain]);
}

export function mergeSignals(
  analysis: UrlAnalysis,
  extra: RiskSignal[],
  securityLevel: SecurityLevel,
): UrlAnalysis {
  if (extra.length === 0) return analysis;
  const byId = new Map(analysis.signals.map((s) => [s.id, s]));
  for (const item of extra) {
    byId.set(item.id, item);
  }
  const signals = applyCombos([...byId.values()]);
  const raw = signals.reduce((sum, s) => sum + s.weightApplied, 0);
  const score = analysis.allowlisted ? 0 : applyLevel(clampScore(raw), securityLevel);
  return {
    ...analysis,
    signals,
    score,
    band: analysis.allowlisted ? "safe" : bandForScore(score),
    analyzedAt: Date.now(),
  };
}
