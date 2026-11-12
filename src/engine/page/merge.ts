import type { RiskSignal, SecurityLevel, UrlAnalysis } from "@shared/types";
import { applyLevel, bandForScore, clampScore } from "../risk/score";
import { WEIGHTS } from "../risk/weights";
import type { PageSignalKind } from "./kinds";
import { applyCombos } from "../risk/combos";

function signal(id: string, weight: number, title: string, explanation: string): RiskSignal {
  return { id, weightApplied: weight, severity: "warn", title, explanation };
}

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
      signal(
        "password-http",
        WEIGHTS.passwordOnHttp,
        "Password field on HTTP",
        "This unencrypted page has a password box. Anything you type can be read on the network.",
      ),
    );
  }
  if (unique.includes("insecure-form")) {
    out.push(
      signal(
        "insecure-form",
        WEIGHTS.insecureForm,
        "Form submits to HTTP",
        "A form on this page sends data to an unencrypted address. Do not enter passwords or personal data.",
      ),
    );
  }
  if (unique.includes("overlay-clickjack")) {
    out.push(
      signal(
        "overlay-clickjack",
        WEIGHTS.overlayClickjack,
        "Viewport overlay",
        "A high z-index frame or layer covers most of the page. That pattern is used for clickjacking and fake system dialogs.",
      ),
    );
  }
  if (unique.includes("permission-bait")) {
    out.push(
      signal(
        "permission-bait",
        WEIGHTS.permissionBait,
        "Blocking dialog overlay",
        "A full-page dialog is sitting on top of the site. Treat permission or download prompts on it as hostile until you hide the overlay.",
      ),
    );
  }
  if (unique.includes("wallet-http")) {
    out.push(
      signal(
        "wallet-http",
        WEIGHTS.walletOnHttp,
        "Wallet on HTTP",
        "This unencrypted page exposes a wallet object. Anything on the network can tamper with what you see. Fundament does not intercept or rewrite the transaction.",
      ),
    );
  }
  if (unique.includes("seed-form")) {
    out.push(
      signal(
        "seed-form",
        WEIGHTS.seedForm,
        "Seed-phrase form",
        "This page has a recovery-phrase or private-key field. Official wallets almost never ask for a seed in a website form. Do not paste it.",
      ),
    );
  }
  if (unique.includes("api-key-field")) {
    out.push(
      signal(
        "api-key-field",
        WEIGHTS.apiKeyField,
        "API key field",
        "This page asks for an API key in a form field. Fake ChatGPT and Claude clones harvest keys this way. Confirm the domain before pasting anything.",
      ),
    );
  }
  if (unique.includes("clickfix-clipboard")) {
    out.push(
      signal(
        "clickfix-clipboard",
        WEIGHTS.clickFixClipboard,
        "Page copied a shell command",
        "This page tried to put a PowerShell, mshta, or similar command on the clipboard. That is ClickFix: fake CAPTCHA pages that tell you to paste into Run or Terminal. Do not paste it. Fundament does not read what you copy yourself.",
      ),
    );
  }
  if (unique.includes("fullscreen-trap")) {
    out.push(
      signal(
        "fullscreen-trap",
        WEIGHTS.fullscreenTrap,
        "Fullscreen over a login",
        "The page went fullscreen while showing a password field. That is used to fake a browser or OS dialog. Leave fullscreen (Esc) and check the real address bar.",
      ),
    );
  }
  if (unique.includes("cross-origin-login")) {
    out.push(
      signal(
        "cross-origin-login",
        WEIGHTS.crossOriginLogin,
        "Login form posts elsewhere",
        "A password form on this page submits to a different registered domain. That is a classic credential-harvest pattern. Confirm the destination before typing.",
      ),
    );
  }
  if (unique.includes("mixed-content")) {
    out.push(
      signal(
        "mixed-content",
        WEIGHTS.mixedContent,
        "Mixed content",
        "This HTTPS page still loads a script, frame, or form over HTTP. Chrome may block some of it; anything that still runs can be swapped on the network.",
      ),
    );
  }
  if (unique.includes("weak-csp")) {
    out.push(
      signal(
        "weak-csp",
        WEIGHTS.weakCsp,
        "Weak or missing CSP",
        "This looks like a sign-in page without a useful Content-Security-Policy. XSS on this origin would run with little friction. Fundament reports this; it does not rewrite the site’s headers unless you turn on CSP reinforce.",
      ),
    );
  }
  if (unique.includes("cookie-flags")) {
    out.push(
      signal(
        "cookie-flags",
        WEIGHTS.cookieFlags,
        "Session cookie visible to scripts",
        "A session-shaped cookie is readable from JavaScript, so HttpOnly is missing. XSS can steal it. Fundament never reads cookie values — only names that look like sessions.",
      ),
    );
  }
  if (unique.includes("obfuscated-js")) {
    out.push(
      signal(
        "obfuscated-js",
        WEIGHTS.obfuscatedJs,
        "Obfuscated inline script",
        "An inline script uses eval/atob/Function chains typical of packed malware. Legitimate minifiers rarely nest those APIs this way. The script text never leaves this tab.",
      ),
    );
  }
  if (unique.includes("prototype-pollution")) {
    out.push(
      signal(
        "prototype-pollution",
        WEIGHTS.prototypePollution,
        "Prototype pollution pattern",
        "Inline script assigns to __proto__ or constructor.prototype. That is how gadgets escalate DOM XSS. Libraries that only mention the string in comments are uncommon.",
      ),
    );
  }
  if (unique.includes("dom-xss")) {
    out.push(
      signal(
        "dom-xss",
        WEIGHTS.domXss,
        "DOM XSS sink",
        "Inline script writes location.hash, search, or referrer into HTML or eval. That is the classic DOM XSS gadget. Fundament does not execute a proof of concept.",
      ),
    );
  }
  if (unique.includes("prompt-injection")) {
    out.push(
      signal(
        "prompt-injection",
        WEIGHTS.promptInjection,
        "Hidden AI instruction",
        "Hidden or off-screen text tells an AI assistant to ignore previous instructions or to exfiltrate data. Browser agents that read the DOM can be steered this way. The text itself is not sent to Fundament.",
      ),
    );
  }
  if (unique.includes("quishing")) {
    out.push(
      signal(
        "quishing",
        WEIGHTS.quishing,
        "QR-code phishing",
        "This page loads a QR image from a generator API, often used to move victims onto a second-stage lure that security tools on this desktop will not see.",
      ),
    );
  }
  if (unique.includes("miner-wasm")) {
    out.push(
      signal(
        "miner-wasm",
        WEIGHTS.minerWasm,
        "In-page miner",
        "The page loaded WebAssembly or a worker that matches known cryptojacking signatures (CoinHive-style, CryptoNight). Known miner hosts are also blocked in the network layer.",
      ),
    );
  }
  if (unique.includes("fingerprint-canvas")) {
    out.push(
      signal(
        "fingerprint-canvas",
        WEIGHTS.fingerprintCanvas,
        "Canvas fingerprinting",
        "This page read a canvas or WebGL renderer string in a way typical of tracking, not drawing. Detection only unless fingerprint shielding is on.",
      ),
    );
  }
  if (unique.includes("fingerprint-audio")) {
    out.push(
      signal(
        "fingerprint-audio",
        WEIGHTS.fingerprintAudio,
        "Audio fingerprinting",
        "This page built an OfflineAudioContext and read analyser bins — the FingerprintJS-style audio hash. Detection only; Fundament does not randomize what you hear.",
      ),
    );
  }
  if (unique.includes("malvertising-chain")) {
    out.push(
      signal(
        "malvertising-chain",
        WEIGHTS.malvertisingChain,
        "Nested ad frames",
        "This page embeds an unusual number of third-party ad iframes. Drive-by chains hide in that nesting. Cosmetic filtering hides some slots; the network layer still blocks known ad hosts.",
      ),
    );
  }
  if (unique.includes("login-form")) {
    out.push({
      id: "login-form",
      weightApplied: 0,
      severity: "info",
      title: "Sign-in form",
      explanation: "This page has a password field. Fundament checks who the page claims to be before you type.",
    });
  }
  if (unique.includes("card-form")) {
    out.push({
      id: "card-form",
      weightApplied: 0,
      severity: "info",
      title: "Payment form",
      explanation: "This page asks for card details. Fundament checks the domain and hidden fields around it.",
    });
  }
  if (unique.includes("browser-in-browser")) {
    out.push(
      signal(
        "browser-in-browser",
        WEIGHTS.browserInBrowser,
        "Fake login window",
        "This page draws its own window with a fake address bar (for example accounts.google.com) inside the page. Real sign-in pop-ups are separate browser windows you can move off the page. Close it and do not type a password.",
      ),
    );
  }
  if (unique.includes("tech-support-scam")) {
    out.push(
      signal(
        "tech-support-scam",
        WEIGHTS.techSupportScam,
        "Tech-support scam",
        "This page locks the screen and claims your computer is infected, then asks you to call a number. Your computer is fine. Do not call, do not install remote-access tools. Fundament left fullscreen for you; close this tab.",
      ),
    );
  }
  if (unique.includes("keyboard-lock")) {
    out.push(
      signal(
        "keyboard-lock",
        WEIGHTS.keyboardLock,
        "Page captured the keyboard",
        "This page asked the browser to capture Esc and system keys. Scam pages use that to stop you from leaving fullscreen. Hold Esc for two seconds to leave.",
      ),
    );
  }
  if (unique.includes("hidden-autofill")) {
    out.push(
      signal(
        "hidden-autofill",
        WEIGHTS.hiddenAutofill,
        "Hidden autofill fields",
        "This form contains invisible fields for card number, address, or phone. If you let the browser autofill the visible fields, it fills the hidden ones too and the site silently receives them. Type by hand here.",
      ),
    );
  }
  if (unique.includes("clipboard-hijack")) {
    out.push({
      id: "clipboard-hijack",
      weightApplied: WEIGHTS.clipboardHijack,
      severity: "fail",
      title: "Clipboard swap blocked",
      explanation:
        "You copied a wallet address and this page tried to replace it with a different one. Fundament kept the address you selected. Double-check any address before sending funds.",
    });
  }
  if (unique.includes("wallet-drainer")) {
    out.push(
      signal(
        "wallet-drainer",
        WEIGHTS.walletDrainer,
        "Wallet approval request",
        "This page asked your wallet for an unlimited token approval, a Permit signature, or a blind eth_sign. Drainers use exactly these to empty wallets in one click. Fundament asked you before passing it on; reject it unless you are certain.",
      ),
    );
  }
  return out.map(asHygiene);
}

export function brandContentSignal(brand: string, domain: string): RiskSignal {
  return {
    id: "brand-content",
    weightApplied: WEIGHTS.brandContent,
    severity: "warn",
    title: `Page claims to be ${brand}`,
    explanation: `The title or logo of this page says ${brand}, but you are on ${domain}, which does not belong to ${brand}. Do not sign in or pay here.`,
  };
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
