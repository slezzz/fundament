/**
 * MAIN world, document_start, all frames. No Chrome APIs, no imports (classic script).
 *
 * Runs before page scripts so it holds the original browser functions. What it does:
 * - ClickFix: a page-initiated clipboard write that is a shell/PowerShell command is
 *   replaced with a harmless warning. The user's own copies are never touched or read.
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

  /* ----------------------------------------------------------- ClickFix */

  /**
   * "strong": only malware does this (hidden window, encoded payload, LOLBins, fake-captcha tail).
   * "weak":   also how real installers look (irm …|iex, curl …|sh, powershell -c). Blocked only
   *           when the page itself shows the ClickFix script (Win+R, captcha, "not a robot").
   */
  function commandTier(text: string): "strong" | "weak" | null {
    const raw = String(text).trim();
    if (raw.length < 12 || raw.length > 12000) return null;
    const n = raw.replace(/\s+/g, " ");
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
    if (/\bfinger(?:\.exe)?\s+\S+@\S+\s*\|/i.test(n)) return "strong";
    if (/add-mppreference|set-mppreference/i.test(n) && /exclusion|disable/i.test(n)) return "strong";
    if (/\bbase64\s+(?:-d|-D|--decode)\b[^|]{0,120}\|\s*(?:ba|z)?sh\b/i.test(n)) return "strong";
    if (/\bosascript\s+-e\b.{0,200}(?:curl|do shell script)/i.test(n)) return "strong";
    if (/cmd(?:\.exe)?\s+\/[ck]\s+.{0,60}(powershell|mshta|bitsadmin|wscript|cscript|curl|certutil|rundll32)/i.test(n)) return "strong";
    if (/powershell(?:\.exe)?\s+-/i.test(n) && /-(?:nop|noprofile|exec(?:utionpolicy)?|c|command)\b/i.test(n)) return "weak";
    if (/\b(?:iex|invoke-expression)\b\s*\(?\s*\(?\s*(?:irm|iwr|invoke-restmethod|invoke-webrequest|new-object)/i.test(n)) return "weak";
    if (/(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod).{0,160}\|\s*(iex|invoke-expression)/i.test(n)) return "weak";
    if (/\bcurl\b[^|;]{0,240}\|\s*(?:sudo\s+)?(?:ba|z|k)?sh\b/i.test(n)) return "weak";
    return null;
  }

  /** The fake-captcha / "fix it" instructions ClickFix pages show next to the copy button. */
  function clickFixContext(): boolean {
    try {
      const text = (document.body?.innerText ?? "").slice(0, 20000);
      return /(windows\s*(?:key|taste)?\s*\+\s*r\b|win\s*\+\s*r\b|⊞\s*\+?\s*r\b|run dialog|ausführen-dialog|i'?m not a robot|i am not a robot|ich bin kein roboter|verify (?:that )?you are (?:a )?human|human verification|captcha|press\s+(?:ctrl|strg)\s*\+\s*v|cmd\s*\+\s*space)/i.test(text);
    } catch {
      return false;
    }
  }

  function looksCommand(text: string): boolean {
    const tier = commandTier(text);
    return tier === "strong" || (tier === "weak" && clickFixContext());
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
    const n = String(text).replace(/\s+/g, " ");
    if (n.length < 24 || n.length > 8000) return false;
    return /ignore (?:all )?(?:previous|prior|above) instructions|you are (?:now )?(?:a |an )?(?:helpful )?(?:browser )?(?:assistant|agent)|system prompt:|exfiltrat(?:e|ion)|send (?:me )?(?:all )?(?:cookies|credentials|api keys)/i.test(n);
  }

  const SAFE_TEXT = german
    ? "Fundament hat einen Befehl blockiert, den diese Webseite in Ihre Zwischenablage kopieren wollte. Fügen Sie niemals Befehle von Webseiten in Ausführen (Win+R), PowerShell oder das Terminal ein."
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
    if (looksCommand(value)) {
      ping("clickfix-clipboard");
      return SAFE_TEXT;
    }
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
        if (copied && !userCopy && looksCommand(copied)) {
          event.preventDefault();
          event.clipboardData?.setData("text/plain", SAFE_TEXT);
          ping("clickfix-clipboard");
        }
      } catch {
        /* ignore */
      }
    },
    true,
  );

  try {
    const dtProto = DataTransfer.prototype;
    const originalSetData = dtProto.setData;
    dtProto.setData = function (this: DataTransfer, format: string, data: string) {
      if (/^text(\/plain)?$/i.test(String(format))) {
        return originalSetData.call(this, format, vet(data));
      }
      return originalSetData.call(this, format, data);
    };
  } catch {
    /* ignore */
  }

  const clipboard = navigator.clipboard;
  if (clipboard) {
    try {
      const originalWriteText = clipboard.writeText?.bind(clipboard);
      if (originalWriteText) {
        clipboard.writeText = function (data: string) {
          return originalWriteText(vet(data));
        };
      }
      const originalWrite = clipboard.write?.bind(clipboard);
      if (originalWrite && typeof ClipboardItem === "function") {
        clipboard.write = async function (items: ClipboardItems) {
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
          return originalWrite(vetted);
        };
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
            ? "eine Permit-Signatur, mit der eine fremde Adresse Ihre Token abziehen darf"
            : "a Permit signature that lets another address pull your tokens",
        };
      }
      if (/^OrderComponents$/i.test(primary)) {
        return { what: german ? "eine Marktplatz-Listung (Seaport) Ihrer NFTs" : "a marketplace listing (Seaport) of your NFTs" };
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
    const original = p.request;
    try {
      const guarded = function (this: unknown, args: unknown): Promise<unknown> {
        const danger = dangerOf(args);
        if (danger) {
          ping("wallet-drainer");
          const host = location.hostname;
          const text = german
            ? `Fundament: ${host} fordert ${danger.what} an.\n\nWallet-Drainer leeren Konten mit genau dieser Anfrage. Nur fortfahren, wenn Sie diese Seite kennen und die Aktion selbst gestartet haben.\n\nAn die Wallet weitergeben?`
            : `Fundament: ${host} is requesting ${danger.what}.\n\nWallet drainers empty accounts with exactly this request. Only continue if you know this site and started this action yourself.\n\nPass it to your wallet?`;
          if (!nativeConfirm(text)) {
            return Promise.reject(Object.assign(new Error("User rejected the request (Fundament)."), { code: 4001 }));
          }
        }
        return original.call(this ?? p, args);
      };
      Object.defineProperty(p, "request", { value: guarded, configurable: true, writable: true });
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
        if (/coinhive|cryptonight|webmine|coinimp|cryptoloot/i.test(String(url))) ping("miner-wasm");
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
