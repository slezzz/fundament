export const PAGE_SIGNAL_KINDS = [
  "password-http",
  "insecure-form",
  "overlay-clickjack",
  "permission-bait",
  "wallet-http",
  "seed-form",
  "api-key-field",
  "clickfix-clipboard",
  "fullscreen-trap",
  "cross-origin-login",
  "mixed-content",
  "weak-csp",
  "cookie-flags",
  "obfuscated-js",
  "prototype-pollution",
  "dom-xss",
  "prompt-injection",
  "quishing",
  "miner-wasm",
  "fingerprint-canvas",
  "fingerprint-audio",
  "malvertising-chain",
  "login-form",
  "card-form",
  "browser-in-browser",
  "tech-support-scam",
  "keyboard-lock",
  "hidden-autofill",
  "clipboard-hijack",
  "wallet-drainer",
] as const;

/** Kinds strong enough to replace the page with the warning screen on their own or with the URL score. */
export const ESCALATING_KINDS = new Set<string>([
  "clickfix-clipboard",
  "browser-in-browser",
  "tech-support-scam",
  "clipboard-hijack",
]);

/** What a cross-origin subframe may report about itself (login widgets, captcha frames). */
export const SUBFRAME_KINDS = new Set<string>([
  "login-form",
  "card-form",
  "seed-form",
  "api-key-field",
  "cross-origin-login",
  "password-http",
  "insecure-form",
  "hidden-autofill",
  "clickfix-clipboard",
  "clipboard-hijack",
  "wallet-drainer",
]);
export type PageSignalKind = (typeof PAGE_SIGNAL_KINDS)[number];

export function isPageSignalKind(value: string): value is PageSignalKind {
  return (PAGE_SIGNAL_KINDS as readonly string[]).includes(value);
}
