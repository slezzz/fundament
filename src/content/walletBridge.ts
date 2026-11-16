/**
 * MAIN world, document_start, all frames. No Chrome APIs, no imports (classic script).
 *
 * Runs before page scripts so it holds the original browser functions. What it does:
 * - ClickFix: a page-initiated clipboard write that is a shell/PowerShell command is
 *   replaced when the lure text is on the page, including open and closed shadow
 *   roots and CSS ::before/::after. A weak command with no such text is reported
 *   by tier only. The user's own copies are never touched or read.
 * - Clipboard hijack: if you copied a wallet address and the page swaps in another one
 *   within a second, your original address is kept.
 * - Wallet drainers: unlimited approvals, setApprovalForAll, Permit/Permit2 signatures,
 *   Seaport listings and blind eth_sign need a native confirm() before they reach the wallet.
 *   The request itself is never modified.
 * - Signals only (kinds, no content): wallet on HTTP, miner WASM, keyboard lock,
 *   canvas/audio fingerprint probes, hidden AI prompt in copied text.
 *
 * Pings go to the isolated content script via window.postMessage. A page can forge a
 * ping (which can only *raise* a warning) but cannot switch any protection off.
 */
(function () {
  const w = window as Window & {
    ethereum?: unknown;
    solana?: unknown;
    phantom?: { solana?: unknown };
    __fundamentBridge?: boolean;
  };
  if (w.__fundamentBridge) return;
  try {
    Object.defineProperty(w, "__fundamentBridge", { value: true, enumerable: false });
  } catch {
    /* ignore */
  }

  const nativeConfirm = window.confirm.bind(window);
  const post = window.postMessage.bind(window);
  const german = /^de\b/i.test(navigator.language || "");

  function ping(kind: string): void {
    try {
      post({ __fundament: kind }, "*");
    } catch {
      /* ignore */
    }
  }

  /**
   * The page shares this world and can assign over a normal function.
   * A getter/setter on the same property re-wraps whatever the page installs,
   * so the original check stays on the way through.
   */
  function seal(
    owner: object,
    key: string,
    wrap: (fn: (...args: never[]) => unknown) => (...args: never[]) => unknown,
  ): void {
    let host: object | null = owner;
    let desc: PropertyDescriptor | undefined;
    while (host) {
      desc = Object.getOwnPropertyDescriptor(host, key);
      if (desc) break;
      host = Object.getPrototypeOf(host);
    }
    if (!host || !desc || typeof desc.value !== "function") return;
    const original = desc.value as (...args: never[]) => unknown;
    let current = wrap(original);
    try {
      Object.defineProperty(host, key, {
        configurable: false,
        enumerable: desc.enumerable === true,
        get: () => current,
        set: (next: unknown) => {
          if (typeof next === "function") current = wrap(next as (...args: never[]) => unknown);
        },
      });
    } catch {
      try {
        (host as Record<string, unknown>)[key] = current;
      } catch {
        /* frozen */
      }
    }
  }

  /* ----------------------------------------------------------- ClickFix */

  const shadowRoots: ShadowRoot[] = [];
  try {
    seal(Element.prototype, "attachShadow", (original) => {
      return function (this: Element, init?: ShadowRootInit) {
        const root = (original as (this: Element, init?: ShadowRootInit) => ShadowRoot).call(this, init);
        try {
          shadowRoots.push(root);
        } catch {
          /* ignore */
        }
        return root;
      };
    });
  } catch {
    /* ignore */
  }

  function textNodes(root: ParentNode): string {
    const parts: string[] = [];
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let count = 0;
      let node = walker.nextNode();
      while (node && count < 400) {
        const tag = node.parentElement?.tagName;
        if (tag !== "SCRIPT" && tag !== "STYLE" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
          const value = node.textContent?.trim();
          if (value) parts.push(value);
        }
        count += 1;
        node = walker.nextNode();
      }
    } catch {
      /* ignore */
    }
    return parts.join(" ");
  }

  /**
   * "strong": only malware does this (hidden window, encoded payload, LOLBins, fake-captcha tail).
   * "weak":   also how real installers look (irm …|iex, curl …|sh, powershell -c). Blocked only
   *           when the page shows a key combination or a browser-fix instruction.
   */
  function commandTier(text: string): "strong" | "weak" | null {
    const flat = String(text)
      .replace(/\u200B/g, "")
      .replace(/\u200C/g, "")
      .replace(/\u200D/g, "")
      .replace(/\u2060/g, "")
      .replace(/[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g, " ")
      .trim();
    const markers = ["powershell", "mshta", "bitsadmin", "certutil", "regsvr32", "rundll32", "msiexec", "wscript", "cscript", "conhost", "finger", "curl", "wget", "iex", "invoke-expression", "invoke-webrequest", "invoke-restmethod", "osascript", "frombase64string", "add-mppreference", "set-mppreference", "base64", "cmd", "captcha", "robot"];
    const windows: string[] = flat.length <= 12000 ? [flat] : [flat.slice(0, 12000), flat.slice(-12000)];
    if (flat.length > 12000) {
      const lower = flat.toLowerCase();
      for (const marker of markers) {
        for (const at of [lower.indexOf(marker), lower.lastIndexOf(marker)]) {
          if (at < 12000 || at >= flat.length - 12000) continue;
          windows.push(flat.slice(Math.max(0, at - 80), Math.min(flat.length, at + 400)));
        }
      }
    }
    for (const n of windows) {
      if (/(?:^|\s|["'])(?:[a-z]:\\|\\\\|file:\/\/)?[\w .\\/-]{1,180}\.(?:search-ms|library-ms|lnk|scf|hta|diagcab|settingcontent-ms)\b/i.test(n)) return "strong";
      if (n.length < 12) continue;
      if (/#.{0,8}(?:i am not a robot|i'?m not a robot|ich bin kein roboter|captcha|verification id|verify you are human)/i.test(n)) return "strong";
      if (/powershell(?:\.exe)?\b.{0,80}-(?:w(?:indowstyle)?)\s+(?:h|hidden|1)\b/i.test(n)) return "strong";
      if (/powershell(?:\.exe)?\b.{0,80}\s-(?:e|ec|enc|encodedcommand)\s+[a-z0-9+/=]{8,}/i.test(n)) return "strong";
      if (/frombase64string/i.test(n) && /iex|invoke-expression|powershell/i.test(n)) return "strong";
      if (/mshta(?:\.exe)?\s+["']?(?:https?:|javascript:|vbscript:)/i.test(n)) return "strong";
      if (/bitsadmin\s+\/transfer/i.test(n)) return "strong";
      if (/certutil(?:\.exe)?\s+.{0,40}-urlcache/i.test(n)) return "strong";
      if (/regsvr32(?:\.exe)?\s+\/s\s+.{0,10}(?:https?:|\\\\)/i.test(n)) return "strong";
      if (/rundll32(?:\.exe)?\s+.{0,120}(?:https?:|\\\\\w)/i.test(n)) return "strong";
      if (/msiexec(?:\.exe)?\s+.{0,20}\/(?:i|q)\S*\s+https?:/i.test(n)) return "strong";
      if (/\b(?:w|c)script(?:\.exe)?\s+.{0,60}(?:https?:|\\\\)/i.test(n)) return "strong";
      if (/conhost(?:\.exe)?\s+--headless/i.test(n)) return "strong";
      if (/\bfinger(?:\.exe)?\s+\S+@\S+/i.test(n)) return "strong";
      if (/\b(?:cmd|start)(?:\.exe)?\b.{0,80}\b(?:finger|ct)\.exe\b/i.test(n)) return "strong";
      if (/add-mppreference|set-mppreference/i.test(n) && /exclusion|disable/i.test(n)) return "strong";
      if (/\bbase64\s+(?:-d|-D|--decode)\b[^|]{0,120}\|\s*(?:ba|z)?sh\b/i.test(n)) return "strong";
      if (/\bosascript\s+-e\b.{0,200}(?:curl|do shell script)/i.test(n)) return "strong";
      if (/cmd(?:\.exe)?\s+\/[ck]\s+.{0,60}(powershell|mshta|bitsadmin|wscript|cscript|curl|certutil|rundll32)/i.test(n)) return "strong";
    }
    for (const n of windows) {
      if (n.length < 12) continue;
      if (/powershell(?:\.exe)?\s+-/i.test(n) && /-(?:nop|noprofile|exec(?:utionpolicy)?|c|command)\b/i.test(n)) return "weak";
      if (/\b(?:iex|invoke-expression)\b\s*\(?\s*\(?\s*(?:irm|iwr|invoke-restmethod|invoke-webrequest|new-object)/i.test(n)) return "weak";
      if (/(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod).{0,160}\|\s*(iex|invoke-expression)/i.test(n)) return "weak";
      if (/\bcurl\b[^|;]{0,240}\|\s*(?:sudo\s+)?(?:ba|z|k)?sh\b/i.test(n)) return "weak";
    }
    return null;
  }

  /**
   * A key combination or the Run dialog, or a claim that this browser crashed or is
   * out of date together with a paste/run instruction. A word alone (captcha, reCAPTCHA,
   * "out of date") is not a lure. Same expressions as pasteLureContext in clickfix.ts.
   */
  function hiddenInstructionText(): string {
    const chunks: string[] = [];
    const push = (value: string | null | undefined) => {
      if (!value) return;
      chunks.push(value.length > 4000 ? `${value.slice(0, 2000)}\n${value.slice(-2000)}` : value);
    };
    const walkShadows = (root: ParentNode | null | undefined, depth: number) => {
      if (!root || depth > 5) return;
      let nodes: Element[] = [];
      try {
        nodes = Array.from(root.querySelectorAll("*")).slice(0, 200);
      } catch {
        return;
      }
      for (const el of nodes) {
        const open = el.shadowRoot;
        if (!open) continue;
        push(textNodes(open));
        walkShadows(open, depth + 1);
      }
    };
    try {
      walkShadows(document.body, 0);
    } catch {
      /* ignore */
    }
    for (const root of shadowRoots) {
      try {
        push(textNodes(root));
      } catch {
        /* detached */
      }
    }
    try {
      const hosts = [document.documentElement, document.body, ...Array.from(document.querySelectorAll("*")).slice(0, 80)].filter(
        (el): el is Element => Boolean(el),
      );
      for (const el of hosts) {
        for (const pseudo of ["::before", "::after"]) {
          const content = getComputedStyle(el, pseudo).content;
          if (content && content !== "none" && content !== "normal") push(content);
        }
      }
    } catch {
      /* ignore */
    }
    try {
      for (const frame of Array.from(document.querySelectorAll("iframe")).slice(0, 6)) {
        try {
          const body = frame.contentDocument?.body;
          if (body) push(textNodes(body));
        } catch {
          /* a foreign frame is not readable */
        }
      }
    } catch {
      /* ignore */
    }
    return chunks.join("\n");
  }

  function clickFixContext(): boolean {
    try {
      const text = `${document.body?.innerText ?? ""}\n${hiddenInstructionText()}`;
      const parts = text.length <= 20000 ? [text] : [text.slice(0, 20000), text.slice(-20000)];
      const KEY_ACTION_RE =
        /(?:windows\s*(?:key|taste)?\s*\+\s*r\b|win\s*\+\s*r\b|⊞\s*\+?\s*r\b|run dialog|ausführen-dialog|press\s+(?:ctrl|strg|control)\s*\+\s*v|(?:ctrl|strg|control)\s*\+\s*v\b|cmd\s*\+\s*space)/i;
      const BROWSER_CLAIM_RE =
        /(?:your|ihr|dein|deinen)\s+browser\b.{0,48}(?:out of date|veraltet|outdated|crashed|abgestürzt)|(?:chrome|edge|firefox|browser).{0,48}(?:has crashed|ist abgestürzt|is out of date|ist veraltet)|aw,\s*snap|(?:chrome|edge|browser).{0,40}(?:out of date|veraltet|outdated|crashed|abgestürzt)/i;
      const FIX_INSTRUCTION_RE =
        /(?:\bpaste\b|\beinfügen\b|\beinfuegen\b|\bfüge\b|\bfuege\b|\bkopiere\b).{0,48}\b(?:fix|command|befehl|this|diesen|den|code|it)\b|(?:press|drücke|druecke|hit)\b.{0,40}(?:ctrl|strg|windows|win\b)|(?:\brun\b|ausführen|ausfuehren|execute|führe).{0,40}\b(?:this|diesen|the command|den befehl|fix)\b/i;
      return parts.some(
        (part) => KEY_ACTION_RE.test(part) || (BROWSER_CLAIM_RE.test(part) && FIX_INSTRUCTION_RE.test(part)),
      );
    } catch {
      return false;
    }
  }

  /** "block" replaces the clipboard. "signal" reports the tier only and leaves the text. */
  function commandVerdict(text: string): "block" | "signal" | "allow" {
    const tier = commandTier(text);
    if (tier === "strong" || (tier === "weak" && clickFixContext())) return "block";
    if (tier === "weak") return "signal";
    return "allow";
  }

  /** Ctrl/Cmd+C, Ctrl+Insert, or the context menu: the user is copying on purpose. */
  let lastCopyGesture = 0;
  window.addEventListener(
    "keydown",
    (event) => {
      if (!event.isTrusted) return;
      const key = event.key?.toLowerCase();
      if (((event.ctrlKey || event.metaKey) && (key === "c" || key === "x")) || (event.ctrlKey && key === "insert")) {
        lastCopyGesture = Date.now();
      }
    },
    true,
  );
  window.addEventListener(
    "contextmenu",
    (event) => {
      if (event.isTrusted) lastCopyGesture = Date.now();
    },
    true,
  );

  function looksPromptInject(text: string): boolean {
    const n = String(text).replace(/\s+/g, " ").trim();
    if (n.length < 24) return false;
    const parts = n.length <= 8000 ? [n] : [n.slice(0, 8000), n.slice(-8000)];
    const re = /ignore (?:all )?(?:previous|prior|above) instructions|you are (?:now )?(?:a |an )?(?:helpful )?(?:browser )?(?:assistant|agent)|system prompt:|exfiltrat(?:e|ion)|send (?:me )?(?:all )?(?:cookies|credentials|api keys)/i;
    return parts.some((part) => part.length >= 24 && re.test(part));
  }

  const SAFE_TEXT = german
    ? "Fundament hat einen Befehl blockiert, den diese Webseite in deine Zwischenablage kopieren wollte. Füge niemals Befehle von Webseiten in Ausführen (Win+R), PowerShell oder das Terminal ein."
    : "Fundament blocked a command this website tried to copy to your clipboard. Never paste commands from a website into Run (Win+R), PowerShell, or Terminal.";

  /* ----------------------------------------------------- clipboard hijack */

  const ADDRESS_RE =
    /^(?:0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[1-9A-HJ-NP-Za-km-z]{33}|[1-9A-HJ-NP-Za-km-z]{32,44}|(?:ltc1|tb1)[a-z0-9]{25,62}|r[1-9A-HJ-NP-Za-km-z]{24,34})$/;
  let lastUserCopy: { text: string; at: number } | null = null;

  function isAddress(text: string): boolean {
    return ADDRESS_RE.test(String(text).trim());
  }

  /** Returns the text that should actually reach the clipboard. */
  function vet(text: string): string {
    const value = String(text);
    const verdict = commandVerdict(value);
    if (verdict === "block") {
      ping("clickfix-clipboard");
      return SAFE_TEXT;
    }
    if (verdict === "signal") ping("clickfix-weak");
    if (looksPromptInject(value)) ping("prompt-injection");
    if (lastUserCopy && Date.now() - lastUserCopy.at < 1500 && isAddress(value) && value.trim() !== lastUserCopy.text) {
      ping("clipboard-hijack");
      return lastUserCopy.text;
    }
    return value;
  }

  document.addEventListener(
    "copy",
    (event) => {
      try {
        const selection = String(window.getSelection?.()?.toString() ?? "").trim();
        // Kits select a hidden textarea without focusing it, so look at every text control.
        let fieldText = "";
        const active = document.activeElement;
        const controls = [
          ...(active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT") ? [active] : []),
          ...Array.from(document.querySelectorAll("textarea, input")).slice(0, 60),
        ] as (HTMLInputElement | HTMLTextAreaElement)[];
        for (const control of controls) {
          try {
            const start = control.selectionStart ?? 0;
            const end = control.selectionEnd ?? 0;
            if (end > start) {
              fieldText = String(control.value).slice(start, end).trim();
              break;
            }
          } catch {
            /* input types without selection (checkbox, number) */
          }
        }
        const copied = selection || fieldText;
        if (copied && isAddress(copied) && event.isTrusted) {
          lastUserCopy = { text: copied, at: Date.now() };
        }
        // execCommand("copy") on a hidden textarea is how many ClickFix kits copy.
        // A copy the user made with Ctrl+C or the context menu is never touched.
        const userCopy = Date.now() - lastCopyGesture < 2000;
        if (copied && !userCopy) {
          const verdict = commandVerdict(copied);
          if (verdict === "block") {
            event.preventDefault();
            event.clipboardData?.setData("text/plain", SAFE_TEXT);
            ping("clickfix-clipboard");
          } else if (verdict === "signal") {
            ping("clickfix-weak");
          }
        }
      } catch {
        /* ignore */
      }
    },
    true,
  );

  try {
    seal(DataTransfer.prototype, "setData", (original) => {
      return function (this: DataTransfer, format: string, data: string) {
        const text = /^text(\/plain)?$/i.test(String(format));
        return (original as (this: unknown, format: string, data: string) => unknown).call(this, format, text ? vet(data) : data);
      };
    });
  } catch {
    /* ignore */
  }

  const clipboard = navigator.clipboard;
  if (clipboard) {
    try {
      if (typeof clipboard.writeText === "function") {
        seal(clipboard, "writeText", (original) => {
          return function (this: unknown, data: string) {
            return (original as (this: unknown, data: string) => unknown).call(this, vet(data));
          };
        });
      }
      if (typeof clipboard.write === "function" && typeof ClipboardItem === "function") {
        seal(clipboard, "write", (original) => {
          return async function (this: unknown, items: ClipboardItems) {
            const vetted: ClipboardItem[] = [];
            for (const item of Array.from(items)) {
              if (item.types.includes("text/plain")) {
                try {
                  const text = await (await item.getType("text/plain")).text();
                  const safe = vet(text);
                  if (safe !== text) {
                    vetted.push(new ClipboardItem({ "text/plain": new Blob([safe], { type: "text/plain" }) }));
                    continue;
                  }
                } catch {
                  /* fall through to the original item */
                }
              }
              vetted.push(item);
            }
            return (original as (this: unknown, items: ClipboardItems) => unknown).call(this, vetted);
          };
        });
      }
    } catch {
      /* frozen clipboard object */
    }
  }

  /* ------------------------------------------------------------ wallets */

  if (location.protocol === "http:") {
    const check = (): void => {
      if (w.ethereum || w.solana || w.phantom?.solana) ping("wallet-http");
    };
    window.addEventListener("load", check, { once: true });
  }

  const MAX_HALF = BigInt("0x8000000000000000000000000000000000000000000000000000000000000000");

  function hexWord(data: string, index: number): string {
    return data.slice(10 + index * 64, 10 + (index + 1) * 64);
  }

  type Danger = { what: string } | null;

  function dangerOf(args: unknown): Danger {
    const req = args as { method?: unknown; params?: unknown } | null;
    const method = typeof req?.method === "string" ? req.method : "";
    const params = Array.isArray(req?.params) ? (req.params as unknown[]) : [];
    if (method === "eth_sign") {
      return { what: german ? "eine Blanko-Signatur (eth_sign)" : "a blind signature (eth_sign)" };
    }
    if (/^eth_signTypedData/.test(method)) {
      const raw = params.find((p) => typeof p === "string" && p.trim().startsWith("{")) ?? params.find((p) => typeof p === "object" && p !== null);
      type Typed = { primaryType?: unknown; message?: Record<string, unknown> } | null;
      let typed: Typed = null;
      try {
        typed = typeof raw === "string" ? (JSON.parse(raw) as Typed) : ((raw ?? null) as unknown as Typed);
      } catch {
        typed = null;
      }
      const primary = String(typed?.primaryType ?? "");
      if (/^Permit/i.test(primary) || (typed?.message && "spender" in typed.message && ("value" in typed.message || "details" in typed.message))) {
        return {
          what: german
            ? "eine Permit-Signatur, mit der eine fremde Adresse deine Token abziehen darf"
            : "a Permit signature that lets another address pull your tokens",
        };
      }
      if (/^OrderComponents$/i.test(primary)) {
        return { what: german ? "eine Marktplatz-Listung (Seaport) deiner NFTs" : "a marketplace listing (Seaport) of your NFTs" };
      }
      return null;
    }
    if (method === "eth_sendTransaction") {
      const tx = (params[0] ?? {}) as { data?: unknown; input?: unknown };
      const data = String(tx.data ?? tx.input ?? "").toLowerCase();
      if (data.startsWith("0xa22cb465") && /1$/.test(hexWord(data, 1))) {
        return {
          what: german
            ? "setApprovalForAll: Zugriff auf ALLE NFTs dieser Sammlung"
            : "setApprovalForAll: access to ALL your NFTs in this collection",
        };
      }
      if (data.startsWith("0x095ea7b3") || data.startsWith("0x39509351")) {
        try {
          const amount = BigInt(`0x${hexWord(data, 1) || "0"}`);
          if (amount >= MAX_HALF) {
            return {
              what: german ? "eine unbegrenzte Token-Freigabe (approve)" : "an unlimited token approval (approve)",
            };
          }
        } catch {
          /* malformed */
        }
      }
    }
    return null;
  }

  const wrapped = new WeakSet<object>();

  function wrapProvider(provider: unknown): void {
    const p = provider as { request?: (args: unknown) => Promise<unknown> } | null;
    if (!p || typeof p !== "object" || typeof p.request !== "function" || wrapped.has(p)) return;
    try {
      seal(p, "request", (original) => {
        return function (this: unknown, args: unknown): Promise<unknown> {
          const danger = dangerOf(args);
          if (danger) {
            ping("wallet-drainer");
            const host = location.hostname;
            const text = german
              ? `Fundament: ${host} fordert ${danger.what} an.\n\nWallet-Drainer leeren Konten mit genau dieser Anfrage. Nur fortfahren, wenn du diese Seite kennst und die Aktion selbst gestartet hast.\n\nAn die Wallet weitergeben?`
              : `Fundament: ${host} is requesting ${danger.what}.\n\nWallet drainers empty accounts with exactly this request. Only continue if you know this site and started this action yourself.\n\nPass it to your wallet?`;
            if (!nativeConfirm(text)) {
              return Promise.reject(Object.assign(new Error("User rejected the request (Fundament)."), { code: 4001 }));
            }
          }
          return (original as (this: unknown, args: unknown) => Promise<unknown>).call(this ?? p, args);
        };
      });
      wrapped.add(p);
    } catch {
      /* provider is frozen: detection-only via page checks */
    }
  }

  function scanProviders(): void {
    wrapProvider(w.ethereum);
    const multi = (w.ethereum as { providers?: unknown[] } | undefined)?.providers;
    if (Array.isArray(multi)) multi.forEach(wrapProvider);
  }

  scanProviders();
  window.addEventListener("eip6963:announceProvider", (event) => {
    const detail = (event as CustomEvent<{ provider?: unknown }>).detail;
    wrapProvider(detail?.provider);
  });
  window.addEventListener("ethereum#initialized", scanProviders);
  document.addEventListener("DOMContentLoaded", scanProviders, { once: true });
  window.addEventListener("load", scanProviders, { once: true });
  setTimeout(scanProviders, 1500);
  setTimeout(scanProviders, 4000);

  /* ------------------------------------------------- miners, keyboard lock */

  let wasmHits = 0;
  const wasm = globalThis.WebAssembly;
  if (wasm && typeof wasm.instantiate === "function") {
    const original = wasm.instantiate.bind(wasm);
    wasm.instantiate = function (module: never, imports?: never) {
      wasmHits += 1;
      if (wasmHits >= 4) ping("miner-wasm");
      return original(module, imports);
    } as typeof wasm.instantiate;
  }

  try {
    const WorkerRef = globalThis.Worker;
    if (typeof WorkerRef === "function") {
      const Wrapped = function (url: string | URL, options?: WorkerOptions) {
        if (/coinhive|cryptonight|webmine|coinimp|cryptoloot/i.test(String(url).slice(0, 300))) ping("miner-wasm");
        return new WorkerRef(url, options);
      } as unknown as typeof Worker;
      Wrapped.prototype = WorkerRef.prototype;
      (globalThis as unknown as { Worker: typeof Worker }).Worker = Wrapped;
    }
  } catch {
    /* frozen */
  }

  try {
    const keyboard = (navigator as Navigator & { keyboard?: { lock?: (keys?: string[]) => Promise<void> } }).keyboard;
    const proto = keyboard ? Object.getPrototypeOf(keyboard) : null;
    if (proto && typeof proto.lock === "function") {
      const originalLock = proto.lock;
      proto.lock = function (this: unknown, keys?: string[]) {
        ping("keyboard-lock");
        return originalLock.call(this, keys);
      };
    }
  } catch {
    /* ignore */
  }

  /* ------------------------------------------ fingerprint probes (detect) */

  let canvasHits = 0;
  try {
    const proto = HTMLCanvasElement.prototype;
    const originalToDataURL = proto.toDataURL;
    proto.toDataURL = function (this: HTMLCanvasElement, ...args: [string?, number?]) {
      canvasHits += 1;
      if (canvasHits === 3) ping("fingerprint-canvas");
      return originalToDataURL.apply(this, args);
    };
    const glProto = WebGLRenderingContext.prototype;
    const originalGetParameter = glProto.getParameter;
    glProto.getParameter = function (this: WebGLRenderingContext, pname: number) {
      if (pname === 0x9245 || pname === 0x9246) ping("fingerprint-canvas");
      return originalGetParameter.call(this, pname);
    };
  } catch {
    /* ignore */
  }

  try {
    const Offline = globalThis.OfflineAudioContext;
    if (typeof Offline === "function") {
      let offlineBuilt = false;
      const WrappedOffline = function (this: OfflineAudioContext, ...args: ConstructorParameters<typeof OfflineAudioContext>) {
        offlineBuilt = true;
        return new Offline(...args);
      } as unknown as typeof OfflineAudioContext;
      WrappedOffline.prototype = Offline.prototype;
      (globalThis as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext = WrappedOffline;
      const originalBins = AnalyserNode.prototype.getFloatFrequencyData;
      AnalyserNode.prototype.getFloatFrequencyData = function (this: AnalyserNode, array) {
        if (offlineBuilt) ping("fingerprint-audio");
        return originalBins.call(this, array);
      };
    }
  } catch {
    /* ignore */
  }
})();
