/**
 * Classic content script (not an ES module). Chrome injects this as a
 * normal script, so it must not import other files.
 *
 * Runs at document_start in every frame and re-checks when the page changes
 * (single-page apps, login dialogs that appear after a click, ClickFix overlays).
 *
 * Structure only: password / card / seed fields, form targets, overlay geometry,
 * fake browser windows, hidden autofill fields, mixed content, CSP, inline-script
 * gadgets, cookie *names*. Page text is scanned locally for scam wording and never
 * leaves the tab; the worker only receives signal names plus, on pages that ask for
 * credentials, the page title / site name / logo alt text (to compare the claimed
 * brand with the real domain). Never reads typed values, cookie values, or the clipboard.
 */

const TOP = window.top === window;

function looksNamed(el: Element, re: RegExp): boolean {
  const input = el as HTMLInputElement;
  const blob = [
    input.name,
    input.id,
    el.getAttribute("autocomplete"),
    el.getAttribute("placeholder"),
    el.getAttribute("aria-label"),
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 240);
  return re.test(blob);
}

function registrableHint(host: string): string {
  const parts = host.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const twoPart = /^(co|com|org|net|ac|gov|or|ne|edu)$/.test(parts[parts.length - 2] ?? "") && (parts[parts.length - 1] ?? "").length === 2;
  return parts.slice(twoPart ? -3 : -2).join(".");
}

function isHidden(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return true;
  if (Number.parseFloat(style.opacity || "1") < 0.05) return true;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return true;
  if (rect.right < -100 || rect.bottom < -100 || rect.left > window.innerWidth + 2000) return true;
  if (style.clipPath && /inset\(\s*(50%|100%)/.test(style.clipPath)) return true;
  return false;
}

function collectForms(kinds: string[]): void {
  const pageHost = location.hostname;
  const pageReg = registrableHint(pageHost);
  for (const form of Array.from(document.forms).slice(0, 40)) {
    let action: URL;
    try {
      action = new URL(form.getAttribute("action") || location.href, location.href);
    } catch {
      continue;
    }
    const hasPassword = Boolean(form.querySelector("input[type='password']"));
    if (action.protocol === "http:" && hasPassword) {
      kinds.push(location.protocol === "https:" ? "insecure-form" : "password-http");
    }
    if (hasPassword && action.protocol !== "http:" && action.protocol !== "https:") continue;
    if (hasPassword) {
      const destReg = registrableHint(action.hostname);
      if (destReg && pageReg && destReg !== pageReg && !destReg.endsWith(`.${pageReg}`) && !pageReg.endsWith(`.${destReg}`)) {
        kinds.push("cross-origin-login");
      }
    }
  }
}

const CARD_RE = /cc-number|cc-csc|card.?num|cardnumber|credit.?card|kreditkarte|kartennummer|\bcvv\b|\bcvc\b|security.?code|pr[uü]fziffer/i;
const SENSITIVE_AUTOFILL_RE = /cc-|card|cvv|cvc|iban|street|address|postal|zip|tel|phone|bday|birth|email/i;

function collectFields(kinds: string[]): void {
  const fields = Array.from(document.querySelectorAll("input, textarea")).slice(0, 150);
  const seedRe = /seed.?phrase|secret.?phrase|recovery.?phrase|mnemonic|private.?key|wallet.?seed|12.?word|24.?word|wiederherstellungs/i;
  const apiRe = /(openai|anthropic|chatgpt|claude).*(key|token)|api[_-]?key|secret[_-]?key/i;
  let visiblePassword = false;
  for (const el of fields) {
    const input = el as HTMLInputElement;
    if (input.type === "hidden") continue;
    if (looksNamed(el, seedRe)) kinds.push("seed-form");
    if (looksNamed(el, apiRe)) kinds.push("api-key-field");
    if (input.type === "password" && !isHidden(el)) visiblePassword = true;
    if (looksNamed(el, CARD_RE) && !isHidden(el)) kinds.push("card-form");
  }
  if (visiblePassword) kinds.push("login-form");

  // Hidden autofill: invisible card/address fields inside a form that also has visible fields.
  for (const form of Array.from(document.forms).slice(0, 20)) {
    const inputs = Array.from(form.querySelectorAll("input")).filter((i) => i.type !== "hidden" && i.type !== "submit");
    if (inputs.length < 2) continue;
    const visible = inputs.filter((i) => !isHidden(i));
    if (visible.length === 0) continue;
    const sneaky = inputs.filter((i) => isHidden(i) && SENSITIVE_AUTOFILL_RE.test(i.getAttribute("autocomplete") || i.name || i.id || ""));
    if (sneaky.length > 0 && visible.length <= 4) {
      kinds.push("hidden-autofill");
      break;
    }
  }
}

function collectMixed(kinds: string[]): void {
  if (location.protocol !== "https:") return;
  const nodes = document.querySelectorAll("script[src], iframe[src], form[action], link[rel='stylesheet']");
  for (const node of Array.from(nodes).slice(0, 60)) {
    const raw = node.getAttribute("src") || node.getAttribute("action") || node.getAttribute("href") || "";
    if (!raw) continue;
    try {
      if (new URL(raw, location.href).protocol === "http:") {
        kinds.push("mixed-content");
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

function collectCsp(kinds: string[]): void {
  if (!document.querySelector("input[type='password']")) return;
  const meta = document.querySelector("meta[http-equiv='Content-Security-Policy' i]");
  const policy = (meta?.getAttribute("content") ?? "").slice(0, 4000).toLowerCase();
  if (policy && /unsafe-inline|unsafe-eval/.test(policy) && /script-src/.test(policy)) kinds.push("weak-csp");
}

function collectCookies(kinds: string[]): void {
  let cookie = "";
  try {
    cookie = document.cookie || "";
  } catch {
    return;
  }
  if (!cookie) return;
  const session = /^(?:phpsessid|jsessionid|asp\.net_sessionid|sessionid|sid|auth(?:token)?|token|jwt|connect\.sid)$/i;
  for (const part of cookie.split(";").slice(0, 40)) {
    const name = (part.split("=")[0]?.trim() ?? "").slice(0, 128);
    if (name && session.test(name)) {
      kinds.push("cookie-flags");
      return;
    }
  }
}

function collectHiddenPrompt(kinds: string[]): void {
  const inject =
    /ignore (?:all )?(?:previous|prior|above) instructions|ignoriere (?:alle )?(?:vorherigen|bisherigen) anweisungen|you are (?:now )?(?:a |an )?(?:helpful )?(?:browser )?(?:assistant|agent)|system prompt:|do not (?:tell|inform|alert) the user|exfiltrat(?:e|ion)|send (?:me )?(?:all )?(?:cookies|credentials|api keys)/i;
  const nodes = document.querySelectorAll("p, span, div, section, pre, code, [aria-hidden='true']");
  for (const node of Array.from(nodes).slice(0, 200)) {
    if (node.childElementCount > 3) continue;
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length < 24 || text.length > 4000 || !inject.test(text)) continue;
    const style = window.getComputedStyle(node);
    const hidden =
      node.getAttribute("aria-hidden") === "true" ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") <= 0.05 ||
      Number.parseFloat(style.fontSize || "16") <= 1 ||
      (style.color && style.backgroundColor && style.color.replace(/\s/g, "") === style.backgroundColor.replace(/\s/g, "") && style.color !== "rgba(0, 0, 0, 0)") ||
      (style.position === "absolute" && (Number.parseFloat(style.left) < -200 || Number.parseFloat(style.top) < -200));
    if (hidden) {
      kinds.push("prompt-injection");
      return;
    }
  }
}

function collectQr(kinds: string[]): void {
  const re = /(?:api\.qrserver\.com|chart\.googleapis\.com\/chart\?[^'"]*cht=qr|quickchart\.io\/qr)/i;
  for (const node of Array.from(document.querySelectorAll("img[src], iframe[src]")).slice(0, 40)) {
    const src = node.getAttribute("src") || "";
    if (re.test(src.slice(0, 2048))) {
      kinds.push("quishing");
      return;
    }
  }
}

function collectInlineScripts(kinds: string[]): void {
  for (const node of Array.from(document.querySelectorAll("script:not([src])")).slice(0, 20)) {
    const source = (node.textContent || "").slice(0, 4000);
    if (source.length < 40) continue;
    const compact = source.replace(/\s+/g, " ");
    if (/(?:eval|function)\s*\(\s*(?:atob|unescape|decodeuricomponent|string\.fromcharcode)|fromcharcode\s*\([^)]{0,80}(?:eval|function)|atob\s*\(\s*['"][a-z0-9+/=]{80,}/i.test(compact)) {
      kinds.push("obfuscated-js");
    }
    if (/(?:__proto__|constructor\s*\[(?:\s*['"]prototype['"]\s*)\]|constructor\.prototype)\s*=/.test(compact)) {
      kinds.push("prototype-pollution");
    }
    if (/(?:location\.(?:hash|search|href)|document\.url|document\.referrer).{0,120}(?:innerhtml|outerhtml|document\.write|insertadjacenthtml|eval\()|(?:innerhtml|outerhtml|document\.write|insertadjacenthtml).{0,80}(?:location\.(?:hash|search|href)|document\.url|document\.referrer|decodeuricomponent)/i.test(compact)) {
      kinds.push("dom-xss");
    }
    if (/coinhive|cryptonight|cryptoloot|webmine|wasmminer|throttleminer|stratum\+tcp/i.test(compact)) {
      kinds.push("miner-wasm");
    }
  }
}

function collectIframes(kinds: string[]): void {
  const frames = Array.from(document.querySelectorAll("iframe")).slice(0, 40);
  const adRe = /doubleclick|googlesyndication|adnxs|taboola|outbrain|criteo|amazon-adsystem|adservice/i;
  const ad = frames.filter((f) => adRe.test(f.getAttribute("src") || "")).length;
  if (frames.length >= 8 || ad >= 4) kinds.push("malvertising-chain");
}

function collectOverlay(kinds: string[]): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const area = vw * vh;
  if (area <= 0) return;
  for (const node of Array.from(document.querySelectorAll("iframe, div, section, aside, dialog")).slice(0, 120)) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = node.getBoundingClientRect();
    const cover = (rect.width * rect.height) / area;
    // Classic clickjacking: an (almost) invisible frame laid over the page to steal clicks.
    if (node.tagName === "IFRAME" && cover >= 0.2 && Number.parseFloat(style.opacity || "1") < 0.2) {
      kinds.push("overlay-clickjack");
      return;
    }
    const z = Number.parseInt(style.zIndex, 10);
    if (!Number.isFinite(z) || z < 1000) continue;
    // Big visible dialogs are mostly cookie walls; informational only.
    if (cover >= 0.65 && rect.top <= 80) {
      kinds.push("permission-bait");
      return;
    }
  }
}

/** Real sign-in hosts that kits paint into a fake pop-up window inside the page. */
const BITB_HOST_RE =
  /^(?:🔒\s*)?(?:https?:\/\/)?((?:accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com|appleid\.apple\.com|account\.apple\.com|(?:www\.)?facebook\.com|steamcommunity\.com|store\.steampowered\.com|discord\.com|github\.com|login\.yahoo\.com|(?:www\.)?paypal\.com|(?:www\.)?amazon\.[a-z.]+|x\.com|twitter\.com|auth\.[a-z0-9-]+\.[a-z]+|login\.[a-z0-9-]+\.[a-z]+))(?:[/:?#\s]|$)/i;

function collectBrowserInBrowser(kinds: string[]): void {
  if (!TOP) return;
  const candidates = Array.from(document.querySelectorAll("div, span, p, input[readonly], input[disabled]")).slice(0, 600);
  for (const el of candidates) {
    // The HTML value attribute, not the live field. Typed text never lives in the attribute.
    const text = (el.tagName === "INPUT" ? el.getAttribute("value") ?? "" : el.childElementCount === 0 ? el.textContent ?? "" : "").trim();
    if (!text || text.length > 120) continue;
    const match = BITB_HOST_RE.exec(text);
    const fakeHost = match?.[1]?.toLowerCase();
    if (!fakeHost) continue;
    if (location.hostname === fakeHost || location.hostname.endsWith(`.${fakeHost.replace(/^www\./, "")}`)) continue;
    // The fake address bar sits in a positioned "window" that also holds a frame or a password box.
    let node: Element | null = el;
    for (let depth = 0; node && depth < 8; depth++, node = node.parentElement) {
      const style = window.getComputedStyle(node);
      if (style.position !== "fixed" && style.position !== "absolute") continue;
      if (node.querySelector("iframe, input[type='password'], input[type='email']")) {
        kinds.push("browser-in-browser");
        return;
      }
    }
  }
}

const SCAM_TEXT_RE =
  /(virus|trojan|malware|spyware|infected|infiziert|hacked|gehackt|security alert|sicherheitswarnung|windows defender|microsoft (?:support|security)|apple (?:support|security)|your (?:computer|pc|device|mac) (?:is|has been) (?:blocked|locked|infected)|ihr (?:computer|pc|gerät) (?:ist|wurde) (?:gesperrt|blockiert|infiziert)|do not (?:restart|shut down|close)|nicht neu starten)/i;
const SCAM_CALL_RE = /(call|ruf(?:en sie)?|toll[- ]free|helpline|support (?:number|line)|hotline|kostenlos anrufen)/i;
const PHONE_RE = /\+?\d[\d\s().-]{8,16}\d/;
let keyboardLocked = false;

function looksLikeSupportScam(): boolean {
  if (!TOP) return false;
  const text = (document.body?.innerText ?? "").slice(0, 6000);
  return SCAM_TEXT_RE.test(text) && SCAM_CALL_RE.test(text) && PHONE_RE.test(text);
}

function brandHints(): string[] {
  if (!TOP) return [];
  const hints: string[] = [];
  const title = document.title || "";
  hints.push(...title.split(/\s+[|–—\-:·•]\s+/).map((s) => s.trim()).filter(Boolean).slice(0, 4));
  for (const selector of ["meta[property='og:site_name']", "meta[name='application-name']", "meta[name='apple-mobile-web-app-title']"]) {
    const value = document.querySelector(selector)?.getAttribute("content");
    if (value) hints.push(value);
  }
  for (const img of Array.from(document.querySelectorAll("img[alt], svg[aria-label]")).slice(0, 30)) {
    const alt = (img.getAttribute("alt") || img.getAttribute("aria-label") || "").trim();
    if (alt && /logo|^[\w .&+-]{2,30}$/i.test(alt)) hints.push(alt);
    if (hints.length >= 12) break;
  }
  return hints.map((h) => h.slice(0, 160)).slice(0, 12);
}

function collect(): string[] {
  const kinds: string[] = [];
  if (location.protocol === "http:" && document.querySelector("input[type='password']")) kinds.push("password-http");
  collectForms(kinds);
  collectFields(kinds);
  if (TOP) {
    collectOverlay(kinds);
    collectMixed(kinds);
    collectCsp(kinds);
    collectCookies(kinds);
    collectHiddenPrompt(kinds);
    collectQr(kinds);
    collectInlineScripts(kinds);
    collectIframes(kinds);
    collectBrowserInBrowser(kinds);
    if ((document.fullscreenElement || keyboardLocked) && looksLikeSupportScam()) kinds.push("tech-support-scam");
  }
  return [...new Set(kinds)];
}

const COSMETIC = [
  "[id*='google_ads']",
  "[id*='GoogleAd']",
  "iframe[src*='doubleclick.net']",
  "iframe[src*='googlesyndication.com']",
  "iframe[id^='google_ads_iframe']",
  "div[id^='div-gpt-ad']",
  "ins.adsbygoogle",
  "[class*='adsbox']",
  "[id*='ad-container']",
  "[class*='ad-container']",
  "[id*='ad_container']",
  "[data-ad-slot]",
  "[data-google-query-id]",
  "iframe[src*='googletagmanager.com']",
  "iframe[src*='adnxs.com']",
  "iframe[src*='taboola.com']",
  "iframe[src*='outbrain.com']",
  "iframe[src*='criteo.com']",
  "iframe[src*='amazon-adsystem.com']",
  "div[id^='taboola']",
  "div[id*='outbrain']",
  "aside[class*='advert']",
  "[class*='sponsored-content']",
  "[id*='sponsor-unit']",
  ".trc_rbox_container",
  ".OUTBRAIN",
  "#ads",
  ".adsbygoogle",
];

function hostAllowed(allowlist: string[], hostname: string): boolean {
  const host = hostname.toLowerCase();
  return allowlist.some((item) => host === item || host.endsWith(`.${item}`));
}

function injectCosmetic(): void {
  if (document.getElementById("fundament-cosmetic")) return;
  const style = document.createElement("style");
  style.id = "fundament-cosmetic";
  style.textContent = `${COSMETIC.join(",")}{display:none !important;}`;
  (document.head || document.documentElement).appendChild(style);
}

function hardenBlankTargets(): void {
  for (const node of Array.from(document.querySelectorAll("a[target='_blank']")).slice(0, 300)) {
    const a = node as HTMLAnchorElement;
    const rel = a.getAttribute("rel") || "";
    if (/\bnoopener\b/i.test(rel)) continue;
    a.setAttribute("rel", `${rel} noopener`.trim());
  }
}

const sent = new Set<string>();
let hintsSent = false;

function send(kinds: string[]): void {
  const fresh = kinds.filter((k) => !sent.has(k));
  if (fresh.length === 0) return;
  for (const k of fresh) sent.add(k);
  const credential = [...sent].some((k) => k === "login-form" || k === "card-form" || k === "seed-form" || k === "api-key-field");
  const hints = credential && !hintsSent ? brandHints() : [];
  if (hints.length > 0) hintsSent = true;
  try {
    void chrome.runtime.sendMessage({ type: "PAGE_CHECK", kinds: fresh, hints }).catch(() => undefined);
  } catch {
    /* extension reloaded */
  }
}

function exitScamFullscreen(): void {
  try {
    if (document.fullscreenElement) void document.exitFullscreen();
  } catch {
    /* ignore */
  }
}

void chrome.storage.local.get("settings").then((stored) => {
  const settings = stored.settings as
    | {
        allowlist?: string[];
        cosmeticFiltering?: boolean;
        overlayProtection?: boolean;
        pageChecks?: boolean;
      }
    | undefined;
  const allow = Array.isArray(settings?.allowlist) ? settings.allowlist : [];
  if (hostAllowed(allow, location.hostname)) return;

  const pageChecks = settings?.pageChecks !== false;
  const overlay = settings?.overlayProtection !== false;

  const filter = (kinds: string[]): string[] => {
    let out = kinds;
    if (!pageChecks) out = out.filter((k) => k === "overlay-clickjack" || k === "permission-bait");
    if (!overlay) out = out.filter((k) => k !== "overlay-clickjack" && k !== "permission-bait");
    return out;
  };

  const run = (): void => {
    if (!pageChecks && !overlay) return;
    const kinds = filter(collect());
    if (kinds.includes("tech-support-scam")) exitScamFullscreen();
    send(kinds);
  };

  const whenReady = (fn: () => void): void => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  whenReady(() => {
    if (settings?.cosmeticFiltering === true && TOP) injectCosmetic();
    hardenBlankTargets();
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") idle(run, { timeout: 1200 });
    else window.setTimeout(run, 0);

    // Re-check when the page changes: SPA routes, login modals, ClickFix overlays.
    let timer = 0;
    let runs = 0;
    const observer = new MutationObserver(() => {
      if (timer || runs > 40) return;
      timer = window.setTimeout(() => {
        timer = 0;
        runs += 1;
        hardenBlankTargets();
        run();
      }, 800);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["type", "style", "class"] });
    window.setTimeout(() => observer.disconnect(), 5 * 60 * 1000);
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (typeof data !== "object" || data === null || Array.isArray(data) || !Object.hasOwn(data, "__fundament")) return;
    const kind = (data as { __fundament?: unknown }).__fundament;
    if (typeof kind !== "string" || kind.length > 40 || !pageChecks) return;
    if (kind === "wallet-http" && location.protocol !== "http:") return;
    if (kind === "keyboard-lock") {
      keyboardLocked = true;
      window.setTimeout(run, 300);
    }
    if (
      [
        "wallet-http",
        "clickfix-clipboard",
        "prompt-injection",
        "miner-wasm",
        "fingerprint-canvas",
        "fingerprint-audio",
        "keyboard-lock",
        "clipboard-hijack",
        "wallet-drainer",
      ].includes(kind)
    ) {
      send([kind]);
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (!pageChecks || !document.fullscreenElement) return;
    if (document.querySelector("input[type='password']")) send(["fullscreen-trap"]);
    window.setTimeout(run, 500);
  });
});
