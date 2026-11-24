/**
 * MAIN world, document_start, all frames. No Chrome APIs, no imports (classic script).
 *
 * Runs before page scripts so it holds the original browser functions. What it does:
 * - ClickFix: a page-initiated clipboard write that is a shell/PowerShell command is
 *   replaced when the lure text is on the page, including open and closed shadow
 *   roots and CSS ::before/::after. Text near the click and on screen is read before
 *   shadow trees. A weak command with no such text is reported by tier only.
 *   Text counts as shown only when a person could read it.
 *   The user's own copies are never touched or read.
 * - Clipboard hijack: if you copied a wallet address and the page swaps in another one
 *   within a second, your original address is kept.
 * - Wallet drainers: unlimited approvals, setApprovalForAll, Permit/Permit2 signatures,
 *   Seaport listings, blind eth_sign, and the same calldata selectors hidden inside
 *   wallet_sendCalls need a native confirm() before they reach the wallet.
 *   The request itself is never modified.
 * - Signals only (kinds, no content): wallet on HTTP, miner WASM, keyboard lock,
 *   canvas/audio fingerprint probes, hidden AI prompt in copied text.
 *
 * Pings go to the isolated content script via window.postMessage. A page can forge a
 * ping (which can only *raise* a warning) but cannot switch any protection off.
 */
declare const __FUNDAMENT_MARKS__: boolean | undefined;

(function () {
  function marksOn(): boolean {
    return typeof __FUNDAMENT_MARKS__ !== "undefined" && __FUNDAMENT_MARKS__ === true;
  }
  /* page-natives */
  // Captured before page scripts run. Later calls go through these references only.
  // RegExp.prototype.test and String.prototype.replace look up exec / Symbol.replace,
  // so matching goes through the saved exec on a fresh regexp with its own lastIndex.
  function pick<T>(get: () => T): T | undefined {
    try {
      return get();
    } catch {
      return undefined;
    }
  }
  const apply = Reflect.apply.bind(Reflect) as <T>(fn: (...args: never[]) => T, thisArg: unknown, args: unknown[]) => T;
  const native = {
    exec: RegExp.prototype.exec,
    source: Object.getOwnPropertyDescriptor(RegExp.prototype, "source")?.get,
    flags: Object.getOwnPropertyDescriptor(RegExp.prototype, "flags")?.get,
    defineProperty: Object.defineProperty,
    getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    getPrototypeOf: Object.getPrototypeOf,
    string: String,
    regExp: RegExp,
    slice: String.prototype.slice,
    trim: String.prototype.trim,
    toLowerCase: String.prototype.toLowerCase,
    stringIncludes: String.prototype.includes,
    startsWith: String.prototype.startsWith,
    indexOf: String.prototype.indexOf,
    lastIndexOf: String.prototype.lastIndexOf,
    charCodeAt: String.prototype.charCodeAt,
    push: Array.prototype.push,
    join: Array.prototype.join,
    arrayIncludes: Array.prototype.includes,
    arraySlice: Array.prototype.slice,
    from: Array.from,
    isArray: Array.isArray,
    dateNow: Date.now,
    jsonParse: JSON.parse,
    assign: Object.assign,
    bigInt: BigInt,
    max: Math.max,
    min: Math.min,
    promiseReject: Promise.reject.bind(Promise),
    weakRef: WeakRef,
    weakSet: WeakSet,
    error: Error,
    deref: WeakRef.prototype.deref,
    now: pick(() => Performance.prototype.now),
    measure: pick(() => Performance.prototype.measure),
    preventDefault: pick(() => Event.prototype.preventDefault),
    isTrusted: pick(() => Object.getOwnPropertyDescriptor(Event.prototype, "isTrusted")?.get),
    eventTarget: pick(() => Object.getOwnPropertyDescriptor(Event.prototype, "target")?.get),
    key: pick(() => Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, "key")?.get),
    isConnected: pick(() => Object.getOwnPropertyDescriptor(Node.prototype, "isConnected")?.get),
    textContent: pick(() => Object.getOwnPropertyDescriptor(Node.prototype, "textContent")?.get),
    parentElement: pick(() => Object.getOwnPropertyDescriptor(Node.prototype, "parentElement")?.get),
    tagName: pick(() => Object.getOwnPropertyDescriptor(Element.prototype, "tagName")?.get),
    shadowRoot: pick(() => Object.getOwnPropertyDescriptor(Element.prototype, "shadowRoot")?.get),
    host: pick(() => Object.getOwnPropertyDescriptor(ShadowRoot.prototype, "host")?.get),
    innerText: pick(() => Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerText")?.get),
    querySelectorAll: pick(() => Document.prototype.querySelectorAll),
    elementQuery: pick(() => Element.prototype.querySelectorAll),
    fragmentQuery: pick(() => DocumentFragment.prototype.querySelectorAll),
    nodeType: pick(() => Object.getOwnPropertyDescriptor(Node.prototype, "nodeType")?.get),
    createTreeWalker: pick(() => Document.prototype.createTreeWalker),
    nextNode: pick(() => TreeWalker.prototype.nextNode),
    getBoundingClientRect: pick(() => Element.prototype.getBoundingClientRect),
    rectHeight: pick(() => Object.getOwnPropertyDescriptor(DOMRectReadOnly.prototype, "height")?.get),
    rectWidth: pick(() => Object.getOwnPropertyDescriptor(DOMRectReadOnly.prototype, "width")?.get),
    rectTop: pick(() => Object.getOwnPropertyDescriptor(DOMRectReadOnly.prototype, "top")?.get),
    rectBottom: pick(() => Object.getOwnPropertyDescriptor(DOMRectReadOnly.prototype, "bottom")?.get),
    rectLeft: pick(() => Object.getOwnPropertyDescriptor(DOMRectReadOnly.prototype, "left")?.get),
    rectRight: pick(() => Object.getOwnPropertyDescriptor(DOMRectReadOnly.prototype, "right")?.get),
    getComputedStyle: pick(() => globalThis.getComputedStyle),
    showText: pick(() => NodeFilter.SHOW_TEXT),
    addEventListener: pick(() => EventTarget.prototype.addEventListener),
    confirm: pick(() => window.confirm),
    postMessage: pick(() => window.postMessage),
    clipboardItem: pick(() => globalThis.ClipboardItem),
    blob: pick(() => globalThis.Blob),
    set: Set,
    setAdd: Set.prototype.add,
    setHas: Set.prototype.has,
    bind: Function.prototype.bind,
    innerHeight: pick(() => Object.getOwnPropertyDescriptor(Window.prototype, "innerHeight")?.get),
    innerWidth: pick(() => Object.getOwnPropertyDescriptor(Window.prototype, "innerWidth")?.get),
    createRange: pick(() => Document.prototype.createRange),
    selectNodeContents: pick(() => Range.prototype.selectNodeContents),
    rangeRect: pick(() => Range.prototype.getBoundingClientRect),
    pow: Math.pow,
    contentDocument: pick(() => Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentDocument")?.get),
    getPropertyValue: pick(() => CSSStyleDeclaration.prototype.getPropertyValue),
    clipboardData: pick(() => Object.getOwnPropertyDescriptor(ClipboardEvent.prototype, "clipboardData")?.get),
    setData: pick(() => DataTransfer.prototype.setData),
    getSelection: pick(() => window.getSelection),
    selectionString: pick(() => Selection.prototype.toString),
    textareaValue: pick(() => Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.get),
    inputValue: pick(() => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.get),
    selectionStart: pick(() => Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "selectionStart")?.get),
    selectionEnd: pick(() => Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "selectionEnd")?.get),
    inputSelectionStart: pick(() => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "selectionStart")?.get),
    inputSelectionEnd: pick(() => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "selectionEnd")?.get),
    activeElement: pick(() => Object.getOwnPropertyDescriptor(Document.prototype, "activeElement")?.get),
    ctrlKey: pick(() => Object.getOwnPropertyDescriptor(MouseEvent.prototype, "ctrlKey")?.get),
    metaKey: pick(() => Object.getOwnPropertyDescriptor(MouseEvent.prototype, "metaKey")?.get),
    types: pick(() => Object.getOwnPropertyDescriptor(ClipboardItem.prototype, "types")?.get),
    getType: pick(() => ClipboardItem.prototype.getType),
    blobText: pick(() => Blob.prototype.text),
    weakHas: WeakSet.prototype.has,
    weakAdd: WeakSet.prototype.add,
    later: pick(() => globalThis.setTimeout),
  };
  const nativeConfirm = native.confirm ? apply(Function.prototype.bind, native.confirm, [window]) : () => false;
  const post = native.postMessage ? apply(Function.prototype.bind, native.postMessage, [window]) : () => undefined;
  /* end-page-natives */
  let bridgeStarted = 0;
  try {
    /* mark-start */
    if (marksOn() && native.now) bridgeStarted = apply(native.now, performance, []);
    /* mark-end */
  } catch {
    bridgeStarted = 0;
  }

  function matches(re: RegExp, value: string): boolean {
    try {
      const source = apply(native.source as (this: RegExp) => string, re, []);
      const flags = apply(native.flags as (this: RegExp) => string, re, []);
      const fresh = new native.regExp(source, flags);
      fresh.lastIndex = 0;
      return apply(native.exec, fresh, [native.string(value)]) != null;
    } catch {
      return false;
    }
  }
  function slice(value: string, start: number, end?: number): string {
    return apply(native.slice, value, end === undefined ? [start] : [start, end]);
  }
  function bothEnds(value: string, limit: number): string[] {
    return value.length <= limit ? [value] : [slice(value, 0, limit), slice(value, -limit)];
  }
  function lower(value: string): string {
    return apply(native.toLowerCase, value, []);
  }
  function trim(value: string): string {
    return apply(native.trim, value, []);
  }
  function includes(value: string, needle: string): boolean {
    return apply(native.stringIncludes, value, [needle]);
  }
  function startsWith(value: string, needle: string): boolean {
    return apply(native.startsWith, value, [needle]);
  }
  function findAt(value: string, needle: string): number {
    return apply(native.indexOf, value, [needle]);
  }
  function findLast(value: string, needle: string): number {
    return apply(native.lastIndexOf, value, [needle]);
  }
  function push<T>(list: T[], value: T): void {
    apply(native.push, list, [value]);
  }
  function join(list: string[], sep: string): string {
    return apply(native.join, list, [sep]);
  }
  function listIncludes(list: readonly unknown[], value: unknown): boolean {
    return apply(native.arrayIncludes, list, [value]);
  }
  function listSlice<T>(list: readonly T[], start: number, end?: number): T[] {
    return apply(native.arraySlice, list, end === undefined ? [start] : [start, end]);
  }
  function dateNow(): number {
    return apply(native.dateNow, Date, []);
  }
  function clock(): number {
    return native.now ? apply(native.now, performance, []) : 0;
  }
  function textOf(node: Node): string {
    return native.textContent ? apply(native.textContent, node, []) ?? "" : "";
  }
  function tagOf(node: Node): string {
    const parent = native.parentElement ? apply(native.parentElement, node, []) : null;
    return parent && native.tagName ? apply(native.tagName, parent, []) ?? "" : "";
  }
  function shadowOf(el: Element): ShadowRoot | null {
    return native.shadowRoot ? apply(native.shadowRoot, el, []) ?? null : null;
  }
  function innerTextOf(el: Element): string {
    return native.innerText ? apply(native.innerText, el, []) ?? "" : "";
  }
  function connected(node: Node): boolean {
    return native.isConnected ? apply(native.isConnected, node, []) === true : false;
  }
  function hostOf(root: ShadowRoot): Element | null {
    return native.host ? apply(native.host, root, []) ?? null : null;
  }
  function deref(ref: WeakRef<ShadowRoot>): ShadowRoot | undefined {
    return apply(native.deref, ref, []);
  }
  function boxOf(el: Element): DOMRect | { height: number; width: number; top: number; bottom: number } {
    return native.getBoundingClientRect
      ? apply(native.getBoundingClientRect, el, [])
      : { height: 0, width: 0, top: 0, bottom: 0 };
  }
  function styles(el: Element, pseudo: string): CSSStyleDeclaration | null {
    return native.getComputedStyle ? apply(native.getComputedStyle, window, [el, pseudo]) : null;
  }
  function all(root: ParentNode, selector: string): Element[] {
    const kind = native.nodeType ? apply(native.nodeType, root, []) : 0;
    const fn = kind === 9 ? native.querySelectorAll : kind === 11 ? native.fragmentQuery : native.elementQuery;
    if (!fn) return [];
    return apply(native.from, Array, [apply(fn, root, [selector])]) as Element[];
  }
  function trusted(event: Event): boolean {
    return native.isTrusted ? apply(native.isTrusted, event, []) === true : false;
  }
  function keyOf(event: KeyboardEvent): string {
    const key = native.key ? apply(native.key, event, []) : "";
    return key ? lower(key) : "";
  }
  function prevent(event: Event): void {
    if (native.preventDefault) apply(native.preventDefault, event, []);
  }
  function listen(target: object, type: string, fn: EventListener, options?: boolean | AddEventListenerOptions): void {
    if (!native.addEventListener) return;
    try {
      apply(native.addEventListener, target, options === undefined ? [type, fn] : [type, fn, options]);
    } catch {
      /* a test double is not an EventTarget */
    }
  }
  function stripMarks(value: string): string {
    let out = "";
    for (let i = 0; i < value.length; i += 1) {
      const code = apply(native.charCodeAt, value, [i]);
      if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0x2060) continue;
      out += apply(native.slice, value, [i, i + 1]);
    }
    return out;
  }
  function collapseSpaces(value: string, pattern = "[\\s\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]+"): string {
    const fresh = new native.regExp(pattern, "g");
    fresh.lastIndex = 0;
    let out = "";
    let last = 0;
    for (let guard = 0; guard < 100000; guard += 1) {
      const found = apply(native.exec, fresh, [value]) as RegExpExecArray | null;
      if (!found || found[0].length === 0) break;
      out += slice(value, last, found.index) + " ";
      last = found.index + found[0].length;
    }
    return out + slice(value, last);
  }

  const w = window as Window & {
    ethereum?: unknown;
    solana?: unknown;
    phantom?: { solana?: unknown };
    __fundamentBridge?: boolean;
  };
  if (w.__fundamentBridge) return;
  try {
    native.defineProperty(w, "__fundamentBridge", { value: true, enumerable: false });
  } catch {
    /* ignore */
  }

  const german = matches(/^de\b/i, navigator.language || "");

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
      desc = native.getOwnPropertyDescriptor(host, key);
      if (desc) break;
      host = native.getPrototypeOf(host);
    }
    if (!host || !desc || typeof desc.value !== "function") return;
    const original = desc.value as (...args: never[]) => unknown;
    let current = wrap(original);
    try {
      native.defineProperty(host, key, {
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

  // Weak refs only. A strong list would keep every removed component's tree alive.
  // Disconnected roots are dropped when the list gets long, and again on each copy.
  const shadowRefs: WeakRef<ShadowRoot>[] = [];
  let lastClick: Element | null = null;
  function rememberShadow(root: ShadowRoot): void {
    if (shadowRefs.length >= 512) {
      let write = 0;
      for (const ref of shadowRefs) {
        const live = deref(ref);
        const host = live ? hostOf(live) : null;
        if (live && host && connected(host)) shadowRefs[write++] = ref;
      }
      shadowRefs.length = write;
    }
    push(shadowRefs, new native.weakRef(root));
  }
  try {
    seal(Element.prototype, "attachShadow", (original) => {
      return function (this: Element, init?: ShadowRootInit) {
        const root = apply(original as (this: Element, init?: ShadowRootInit) => ShadowRoot, this, [init]);
        try {
          rememberShadow(root);
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
      if (!native.createTreeWalker || !native.nextNode || native.showText === undefined) return "";
      const walker = apply(native.createTreeWalker, document, [root, native.showText]);
      let count = 0;
      let node = apply(native.nextNode, walker, []) as Node | null;
      while (node && count < 400) {
        const tag = tagOf(node);
        if (tag !== "SCRIPT" && tag !== "STYLE" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
          const value = trim(textOf(node));
          if (value) push(parts, value);
        }
        count += 1;
        node = apply(native.nextNode, walker, []) as Node | null;
      }
    } catch {
      /* ignore */
    }
    return join(parts, " ");
  }

  /**
   * "strong": only malware does this (hidden window, encoded payload, LOLBins, fake-captcha tail).
   * "weak":   also how real installers look (irm …|iex, curl|wget …|sh, bash -c "$(curl …)"). Blocked only
   *           when the page shows a key combination or a browser-fix instruction.
   */
  function commandTier(text: string): "strong" | "weak" | null {
    const raw = native.string(text);
    if (matches(/(?:[a-z]:\\|\\\\)[^\n]{0,240}(?:[ \t\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]{20,}|#).{0,80}\b(?:powershell|pwsh|cmd|conhost|mshta|curl|wget|bitsadmin|certutil|rundll32|regsvr32|wscript|cscript|msiexec|finger)\b/i, raw)) return "strong";
    if (matches(/\b(?:powershell|pwsh|cmd|conhost|mshta|curl|wget|bitsadmin|certutil|rundll32|regsvr32|wscript|cscript|msiexec|finger)\b[^\n]{0,80}(?:[ \t\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]{20,}|#).{0,240}(?:[a-z]:\\|\\\\)/i, raw)) return "strong";
    const flat = trim(collapseSpaces(stripMarks(native.string(text))));
    const markers = ["powershell", "mshta", "bitsadmin", "certutil", "regsvr32", "rundll32", "msiexec", "wscript", "cscript", "conhost", "finger", "curl", "wget", "iex", "invoke-expression", "invoke-webrequest", "invoke-restmethod", "osascript", "frombase64string", "add-mppreference", "set-mppreference", "base64", "cmd", "captcha", "robot", "search-ms", "ms-search", "ms-msdt", "ms-settings", "davwwwroot"];
    const windows = bothEnds(flat, 12000);
    if (flat.length > 12000) {
      const folded = lower(flat);
      for (const marker of markers) {
        for (const at of [findAt(folded, marker), findLast(folded, marker)]) {
          if (at < 12000 || at >= flat.length - 12000) continue;
          push(windows, slice(flat, native.max(0, at - 80), native.min(flat.length, at + 400)));
        }
      }
    }
    for (const n of windows) {
      if (matches(/(?:^|\s|["'])(?:[a-z]:\\|\\\\|file:\/\/)?[\w .\\/-]{1,180}\.(?:search-ms|library-ms|lnk|scf|hta|diagcab|settingcontent-ms)\b/i, n)) return "strong";
      if (matches(/(?:^|[\s"'`(])(?:search-ms|ms-search|ms-msdt):/i, n)) return "strong";
      if (matches(/(?:^|[\s"'`(])search:[^\s"'`]{0,180}(?:query=|crumb=)/i, n)) return "strong";
      if (matches(/(?:^|[\s"'`(])ms-settings:[a-z0-9-]/i, n)) return "strong";
      if (matches(/\\\\[^\s\\]{1,120}@(?:ssl|80|443)\b/i, n)) return "strong";
      if (matches(/[/\\]davwwwroot[/\\]/i, n)) return "strong";
      if (n.length < 12) continue;
      if (matches(/#.{0,8}(?:i am not a robot|i'?m not a robot|ich bin kein roboter|captcha|verification id|verify you are human)/i, n)) return "strong";
      if (matches(/powershell(?:\.exe)?\b.{0,80}-(?:w(?:indowstyle)?)\s+(?:h|hidden|1)\b/i, n)) return "strong";
      if (matches(/powershell(?:\.exe)?\b.{0,80}\s-(?:e|ec|enc|encodedcommand)\s+[a-z0-9+/=]{8,}/i, n)) return "strong";
      if (matches(/frombase64string/i, n) && matches(/iex|invoke-expression|powershell/i, n)) return "strong";
      if (matches(/mshta(?:\.exe)?\s+["']?(?:https?:|javascript:|vbscript:)/i, n)) return "strong";
      if (matches(/bitsadmin\s+\/transfer/i, n)) return "strong";
      if (matches(/certutil(?:\.exe)?\s+.{0,40}-urlcache/i, n)) return "strong";
      if (matches(/regsvr32(?:\.exe)?\s+\/s\s+.{0,10}(?:https?:|\\\\)/i, n)) return "strong";
      if (matches(/rundll32(?:\.exe)?\s+.{0,120}(?:https?:|\\\\\w)/i, n)) return "strong";
      if (matches(/msiexec(?:\.exe)?\s+.{0,20}\/(?:i|q)\S*\s+https?:/i, n)) return "strong";
      if (matches(/\b(?:w|c)script(?:\.exe)?\s+.{0,60}(?:https?:|\\\\)/i, n)) return "strong";
      if (matches(/conhost(?:\.exe)?\s+--headless/i, n)) return "strong";
      if (matches(/\bfinger(?:\.exe)?\s+\S+@\S+/i, n)) return "strong";
      if (matches(/\b(?:cmd|start)(?:\.exe)?\b.{0,80}\b(?:finger|ct)\.exe\b/i, n)) return "strong";
      if (matches(/add-mppreference|set-mppreference/i, n) && matches(/exclusion|disable/i, n)) return "strong";
      if (matches(/\bbase64\s+(?:-d|-D|--decode)\b[^|]{0,120}\|\s*(?:ba|z)?sh\b/i, n)) return "strong";
      if (matches(/\bosascript\s+-e\b.{0,200}(?:curl|do shell script)/i, n)) return "strong";
      if (matches(/cmd(?:\.exe)?\s+\/[ck]\s+.{0,60}(powershell|mshta|bitsadmin|wscript|cscript|curl|certutil|rundll32)/i, n)) return "strong";
    }
    for (const n of windows) {
      if (n.length < 12) continue;
      if (matches(/powershell(?:\.exe)?\s+-/i, n) && matches(/-(?:nop|noprofile|exec(?:utionpolicy)?|c|command)\b/i, n)) return "weak";
      if (matches(/\b(?:iex|invoke-expression)\b\s*\(?\s*\(?\s*(?:irm|iwr|invoke-restmethod|invoke-webrequest|new-object)/i, n)) return "weak";
      if (matches(/(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod).{0,160}\|\s*(iex|invoke-expression)/i, n)) return "weak";
      if (matches(/\b(?:curl|wget)\b[^|;]{0,240}\|\s*(?:(?:sudo|nohup)\s+)?(?:ba|z|k)?sh\b/i, n)) return "weak";
      if (matches(/(?:^|[^\w])(?:\/bin\/)?(?:ba|z|k)?sh\b[^|]{0,48}-c\b[^|]{0,120}\$\(\s*(?:curl|wget)\b/i, n)) return "weak";
      if (matches(/\b(?:ba|z|k)?sh\s+<\(\s*(?:curl|wget)\b/i, n)) return "weak";
      if (matches(/\b(?:curl|wget)\b[^|]{0,240}(?:-o|--output)\s+\S+.{0,120}\bchmod\s+\+x\b/i, n)) return "weak";
    }
    return null;
  }

  /**
   * A key combination or the Run dialog, or a claim that this browser crashed or is
   * out of date together with a paste/run instruction. A word alone (captcha, reCAPTCHA,
   * "out of date") is not a lure. Same expressions as pasteLureContext in clickfix.ts.
   * Generated text near the click and on screen is read before shadow trees, so filler
   * roots cannot spend the 12 ms first.
   */
  function hiddenInstructionText(): string {
    const chunks: string[] = [];
    const deadline = clock() + 12;
    const seen = new native.set<ShadowRoot>();
    const seenEl = new native.set<Element>();
    const addChunk = (value: string | null | undefined) => {
      if (!value) return;
      push(chunks, value.length > 4000 ? `${slice(value, 0, 2000)}\n${slice(value, -2000)}` : value);
    };
    const room = () => clock() < deadline;
    const saw = (root: ShadowRoot) => apply(native.setHas, seen, [root]) === true;
    const mark = (root: ShadowRoot) => {
      apply(native.setAdd, seen, [root]);
    };
    const sawEl = (el: Element) => apply(native.setHas, seenEl, [el]) === true;
    const markEl = (el: Element) => {
      apply(native.setAdd, seenEl, [el]);
    };
    // An empty padding div has no height. A lure the visitor can see has a box.
    const hasBox = (el: Element): boolean => {
      try {
        const box = boxOf(el);
        const height = (native.innerHeight ? apply(native.innerHeight, window, []) : 0) || 800;
        const read = (get: ((this: Element) => number) | undefined) => (get ? apply(get, box, []) : 0);
        return read(native.rectHeight) >= 1 && read(native.rectWidth) >= 1 && read(native.rectBottom) > -80 && read(native.rectTop) < height + 80;
      } catch {
        return false;
      }
    };
    const readGenerated = (el: Element) => {
      for (const pseudo of ["::before", "::after"]) {
        if (!room()) return;
        const style = styles(el, pseudo);
        const content = style && native.getPropertyValue ? apply(native.getPropertyValue, style, ["content"]) : "";
        if (content && content !== "none" && content !== "normal") addChunk(content);
      }
    };
    const readOpen = (root: ParentNode | null | undefined, depth: number) => {
      if (!root || depth > 32 || !room()) return;
      let nodes: Element[] = [];
      try {
        nodes = all(root, "*");
      } catch {
        return;
      }
      for (const el of nodes) {
        if (!room()) return;
        const open = shadowOf(el);
        if (!open || saw(open)) continue;
        mark(open);
        addChunk(textNodes(open));
        readOpen(open, depth + 1);
      }
    };
    try {
      const near: Element[] = [];
      const addNear = (el: Element | null | undefined) => {
        if (!el || sawEl(el)) return;
        markEl(el);
        push(near, el);
      };
      addNear(document.documentElement);
      addNear(document.body);
      let cursor: Element | null = lastClick;
      for (let depth = 0; depth < 24 && cursor; depth += 1) {
        addNear(cursor);
        cursor = parentEl(cursor);
      }
      for (const el of near) readGenerated(el);
      for (const el of all(document, "*")) {
        if (!room()) break;
        if (sawEl(el) || !hasBox(el)) continue;
        markEl(el);
        readGenerated(el);
      }
    } catch {
      /* ignore */
    }
    try {
      readOpen(document.body, 0);
    } catch {
      /* ignore */
    }
    {
      let write = 0;
      for (const ref of shadowRefs) {
        const root = deref(ref);
        const owner = root ? hostOf(root) : null;
        if (!root || !owner || !connected(owner)) continue;
        shadowRefs[write++] = ref;
        if (!room() || saw(root)) continue;
        try {
          mark(root);
          addChunk(textNodes(root));
        } catch {
          /* detached */
        }
      }
      shadowRefs.length = write;
    }
    try {
      for (const frame of all(document, "iframe")) {
        if (!room() || !hasBox(frame)) continue;
        try {
          const doc = native.contentDocument ? apply(native.contentDocument, frame, []) : null;
          const body = doc?.body;
          if (body) addChunk(textNodes(body));
        } catch {
          /* a foreign frame is not readable */
        }
      }
    } catch {
      /* ignore */
    }
    return join(chunks, "\n");
  }

  function clickFixContext(): boolean {
    try {
      const text = `${document.body ? innerTextOf(document.body) : ""}\n${hiddenInstructionText()}`;
      const parts = bothEnds(text, 20000);
      const KEY_ACTION_RE =
        /(?:windows\s*(?:key|taste)?\s*\+\s*r\b|win\s*\+\s*r\b|⊞\s*\+?\s*r\b|run dialog|ausführen-dialog|press\s+(?:ctrl|strg|control)\s*\+\s*v|(?:ctrl|strg|control)\s*\+\s*v\b|cmd\s*\+\s*space)/i;
      const BROWSER_CLAIM_RE =
        /(?:your|ihr|dein|deinen)\s+browser\b.{0,48}(?:out of date|veraltet|outdated|crashed|abgestürzt)|(?:chrome|edge|firefox|browser).{0,48}(?:has crashed|ist abgestürzt|is out of date|ist veraltet)|aw,\s*snap|(?:chrome|edge|browser).{0,40}(?:out of date|veraltet|outdated|crashed|abgestürzt)/i;
      const FIX_INSTRUCTION_RE =
        /(?:\bpaste\b|\beinfügen\b|\beinfuegen\b|\bfüge\b|\bfuege\b|\bkopiere\b).{0,48}\b(?:fix|command|befehl|this|diesen|den|code|it)\b|(?:press|drücke|druecke|hit)\b.{0,40}(?:ctrl|strg|windows|win\b)|(?:\brun\b|ausführen|ausfuehren|execute|führe).{0,40}\b(?:this|diesen|the command|den befehl|fix)\b/i;
      for (const part of parts) {
        if (matches(KEY_ACTION_RE, part) || (matches(BROWSER_CLAIM_RE, part) && matches(FIX_INSTRUCTION_RE, part))) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /** A number in a computed style, such as "12px" or "0.5". */
  function readFloatAt(value: string, start: number): { n: number; i: number } | null {
    let i = start;
    const len = value.length;
    while (i < len) {
      const code = apply(native.charCodeAt, value, [i]);
      if ((code >= 48 && code <= 57) || code === 46) break;
      i += 1;
      if (i - start > 24) return null;
    }
    if (i >= len) return null;
    let whole = 0;
    let frac = 0;
    let scale = 1;
    let saw = false;
    let dot = false;
    for (; i < len; i += 1) {
      const code = apply(native.charCodeAt, value, [i]);
      if (code >= 48 && code <= 57) {
        saw = true;
        if (!dot) whole = whole * 10 + (code - 48);
        else {
          scale *= 10;
          frac = frac * 10 + (code - 48);
        }
      } else if (code === 46 && !dot) dot = true;
      else break;
    }
    if (!saw) return null;
    return { n: whole + frac / scale, i };
  }

  function cssOf(el: Element): CSSStyleDeclaration | null {
    return native.getComputedStyle ? apply(native.getComputedStyle, window, [el]) : null;
  }
  function cssProp(style: CSSStyleDeclaration | null, name: string): string {
    if (!style || !native.getPropertyValue) return "";
    const value = apply(native.getPropertyValue, style, [name]);
    return value ? native.string(value) : "";
  }
  function parentEl(node: Node): Element | null {
    return native.parentElement ? apply(native.parentElement, node, []) ?? null : null;
  }
  function edges(box: object): { y: number; xEnd: number; yEnd: number; x: number; across: number; down: number } {
    const read = (get: ((this: Element) => number) | undefined) => (get ? apply(get, box, []) : 0);
    return {
      y: read(native.rectTop),
      xEnd: read(native.rectRight),
      yEnd: read(native.rectBottom),
      x: read(native.rectLeft),
      across: read(native.rectWidth),
      down: read(native.rectHeight),
    };
  }
  function parseColor(value: string): { r: number; g: number; b: number; a: number } | null {
    const text = lower(trim(native.string(value)));
    if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    if (!startsWith(text, "rgb")) return null;
    const channels: number[] = [];
    let i = 0;
    while (channels.length < 4 && i < text.length) {
      const found = readFloatAt(text, i);
      if (!found) break;
      let n = found.n;
      let at = found.i;
      if (at < text.length && apply(native.charCodeAt, text, [at]) === 37) {
        n = channels.length < 3 ? (n / 100) * 255 : n / 100;
        at += 1;
      }
      push(channels, n);
      i = at;
    }
    const red = channels[0];
    const green = channels[1];
    const blue = channels[2];
    const fourth = channels[3];
    if (red === undefined || green === undefined || blue === undefined) return null;
    const alpha = fourth === undefined ? 1 : fourth;
    return { r: red, g: green, b: blue, a: alpha > 1 ? alpha / 255 : alpha };
  }
  function linear(channel: number): number {
    const s = channel / 255;
    if (s <= 0.03928) return s / 12.92;
    return apply(native.pow, Math, [(s + 0.055) / 1.055, 2.4]);
  }
  function contrastOf(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }): number {
    const lum = (color: { r: number; g: number; b: number }) => 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
    const hi = apply(native.max, Math, [lum(fg), lum(bg)]);
    const lo = apply(native.min, Math, [lum(fg), lum(bg)]);
    return (hi + 0.05) / (lo + 0.05);
  }
  /** Same ink as the page behind it, under 8 px, faded, off-screen, or clipped is not readable. */
  function readable(node: Node): boolean {
    const el = parentEl(node);
    if (!el) return false;
    const chain: Element[] = [];
    let cursor: Element | null = el;
    for (let depth = 0; depth < 24 && cursor; depth += 1) {
      push(chain, cursor);
      cursor = parentEl(cursor);
    }
    for (let i = 0; i < chain.length; i += 1) {
      const item = chain[i];
      if (!item) continue;
      const style = cssOf(item);
      const display = cssProp(style, "display");
      const visibility = cssProp(style, "visibility");
      if (display === "none" || visibility === "hidden" || visibility === "collapse") return false;
    }
    let opacity = 1;
    for (let i = 0; i < chain.length; i += 1) {
      const item = chain[i];
      if (!item) continue;
      const raw = cssProp(cssOf(item), "opacity");
      const found = raw ? readFloatAt(raw, 0) : null;
      if (found) opacity *= found.n;
      if (opacity <= 0.1) return false;
    }
    const size = readFloatAt(cssProp(cssOf(el), "font-size"), 0);
    if (size && size.n < 8) return false;
    const color = parseColor(cssProp(cssOf(el), "color"));
    if (color) {
      if (color.a <= 0.1) return false;
      let bgR = 255;
      let bgG = 255;
      let bgB = 255;
      for (let i = chain.length - 1; i >= 0; i -= 1) {
        const item = chain[i];
        if (!item) continue;
        const layer = parseColor(cssProp(cssOf(item), "background-color"));
        if (!layer || layer.a <= 0) continue;
        bgR = layer.r * layer.a + bgR * (1 - layer.a);
        bgG = layer.g * layer.a + bgG * (1 - layer.a);
        bgB = layer.b * layer.a + bgB * (1 - layer.a);
      }
      const fg = color.a >= 0.99 ? color : { r: color.r * color.a + bgR * (1 - color.a), g: color.g * color.a + bgG * (1 - color.a), b: color.b * color.a + bgB * (1 - color.a) };
      if (contrastOf(fg, { r: bgR, g: bgG, b: bgB }) < 3) return false;
    }
    let box: { y: number; xEnd: number; yEnd: number; x: number; across: number; down: number } | null = null;
    try {
      if (native.createRange && native.selectNodeContents && native.rangeRect) {
        const range = apply(native.createRange, document, []);
        apply(native.selectNodeContents, range, [node]);
        const rect = apply(native.rangeRect, range, []);
        if (rect) box = edges(rect);
      }
    } catch {
      box = null;
    }
    if (!box) {
      try {
        box = edges(boxOf(el));
      } catch {
        return false;
      }
    }
    if (box.across < 1 || box.down < 1) return false;
    const viewW = (native.innerWidth ? apply(native.innerWidth, window, []) : 0) || 800;
    // Below the fold is still shown: the visitor can scroll. A box parked off to the side is not.
    if (box.xEnd < 1 || box.yEnd < 1 || box.x > viewW) return false;
    for (let i = 0; i < chain.length; i += 1) {
      const item = chain[i];
      if (!item) continue;
      const style = cssOf(item);
      const clip = lower(cssProp(style, "clip"));
      if (clip && clip !== "auto" && startsWith(clip, "rect")) {
        const nums: number[] = [];
        let at = 0;
        while (nums.length < 4) {
          const found = readFloatAt(clip, at);
          if (!found) break;
          push(nums, found.n);
          at = found.i;
        }
        const clipTop = nums[0];
        const clipRight = nums[1];
        const clipBottom = nums[2];
        const clipLeft = nums[3];
        if (clipTop !== undefined && clipRight !== undefined && clipBottom !== undefined && clipLeft !== undefined && (clipRight - clipLeft < 1 || clipBottom - clipTop < 1)) return false;
      }
      const path = lower(cssProp(style, "clip-path"));
      if (path && path !== "none" && (includes(path, "circle(0") || startsWith(path, "inset(100"))) return false;
      const ox = cssProp(style, "overflow-x");
      const oy = cssProp(style, "overflow-y");
      const clipX = ox === "hidden" || ox === "clip";
      const clipY = oy === "hidden" || oy === "clip";
      if (!clipX && !clipY) continue;
      let host: { y: number; xEnd: number; yEnd: number; x: number; across: number; down: number };
      try {
        host = edges(boxOf(item));
      } catch {
        continue;
      }
      const left = clipX ? apply(native.max, Math, [box.x, host.x]) : box.x;
      const right = clipX ? apply(native.min, Math, [box.xEnd, host.xEnd]) : box.xEnd;
      const top = clipY ? apply(native.max, Math, [box.y, host.y]) : box.y;
      const bottom = clipY ? apply(native.min, Math, [box.yEnd, host.yEnd]) : box.yEnd;
      if (right - left < 1 || bottom - top < 1) return false;
    }
    return true;
  }

  function linesOf(value: string): string[] {
    const raw = native.string(value);
    const out: string[] = [];
    let start = 0;
    for (let i = 0; i <= raw.length; i += 1) {
      if (i !== raw.length && slice(raw, i, i + 1) !== "\n") continue;
      const line = slice(raw, start, i);
      push(out, slice(line, -1) === "\r" ? slice(line, 0, -1) : line);
      start = i + 1;
    }
    return out;
  }

  /**
   * One walk for every needle. A needle in unreadable text stays unseen.
   * innerText is only a fallback when the walk runs out of time first.
   */
  function commandsAreShown(needles: readonly string[]): boolean {
    if (needles.length === 0) return false;
    const shownByInnerText = (needle: string): boolean => {
      try {
        const hay = document.body ? innerTextOf(document.body) : "";
        return includes(lower(collapseSpaces(hay, "[\\s\\u00A0]+")), needle);
      } catch {
        return false;
      }
    };
    const everyInner = (): boolean => {
      for (let i = 0; i < needles.length; i += 1) {
        const needle = needles[i];
        if (!needle || !shownByInnerText(needle)) return false;
      }
      return true;
    };
    try {
      if (!document.body || !native.createTreeWalker || !native.nextNode || native.showText === undefined) return everyInner();
      const found: boolean[] = [];
      const blocked: boolean[] = [];
      for (let i = 0; i < needles.length; i += 1) {
        push(found, false);
        push(blocked, false);
      }
      const deadline = clock() + 12;
      const walker = apply(native.createTreeWalker, document, [document.body, native.showText]);
      let node = apply(native.nextNode, walker, []) as Node | null;
      let count = 0;
      let rolling = "";
      let unfinished = false;
      while (node && count < 2000) {
        if (clock() >= deadline) {
          unfinished = true;
          break;
        }
        count += 1;
        const tag = tagOf(node);
        const flat = lower(trim(collapseSpaces(textOf(node), "[\\s\\u00A0]+")));
        if (!flat || tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") {
          node = apply(native.nextNode, walker, []) as Node | null;
          continue;
        }
        let canRead = false;
        try {
          canRead = readable(node);
        } catch {
          canRead = false;
        }
        if (canRead) rolling = slice(rolling + " " + flat, -4000);
        const window = canRead ? lower(collapseSpaces(rolling, "[\\s\\u00A0]+")) : "";
        let pending = false;
        for (let i = 0; i < needles.length; i += 1) {
          if (found[i]) continue;
          const needle = needles[i];
          if (!needle) continue;
          if (canRead && (includes(flat, needle) || includes(window, needle))) found[i] = true;
          else if (!canRead && includes(flat, needle)) blocked[i] = true;
          if (!found[i]) pending = true;
        }
        if (!pending) return true;
        node = apply(native.nextNode, walker, []) as Node | null;
      }
      for (let i = 0; i < needles.length; i += 1) {
        if (found[i]) continue;
        const needle = needles[i];
        if (unfinished && !blocked[i] && needle && shownByInnerText(needle)) continue;
        return false;
      }
      return true;
    } catch {
      return everyInner();
    }
  }

  /**
   * Same whitespace rule as weakCommandIsShown in clickfix.ts. A textarea's value
   * is not shown. Text that is on the page but not readable is not shown either:
   * no area, under 8 px, opacity at or under 0.1, contrast under 3:1, off-screen, or clipped.
   */
  function commandIsShown(command: string): boolean {
    const needle = lower(trim(collapseSpaces(native.string(command), "[\\s\\u00A0]+")));
    if (needle.length < 12) return false;
    return commandsAreShown([needle]);
  }

  /** A weak clipboard is shown when every weak line is readable. Other lines do not count. */
  function weakPartsAreShown(text: string): boolean {
    const parts = linesOf(text);
    const needles: string[] = [];
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (!part || commandTier(part) !== "weak") continue;
      const needle = lower(trim(collapseSpaces(part, "[\\s\\u00A0]+")));
      if (needle.length < 12) return false;
      push(needles, needle);
    }
    if (needles.length === 0) return commandIsShown(text);
    return commandsAreShown(needles);
  }

  /** "block" replaces the clipboard. "signal" reports the tier only and leaves the text. */
  function commandVerdict(text: string): "block" | "signal" | "allow" {
    const tier = commandTier(text);
    if (tier === "strong" || (tier === "weak" && clickFixContext())) return "block";
    if (tier === "weak" && !weakPartsAreShown(text)) return "signal";
    return "allow";
  }

  function announced(text: string): "block" | "signal" | "allow" {
    const verdict = commandVerdict(text);
    if (verdict === "block") ping("clickfix-clipboard");
    else if (verdict === "signal") ping("clickfix-weak");
    return verdict;
  }

  /** Ctrl/Cmd+C, Ctrl+Insert, or the context menu: the user is copying on purpose. */
  let lastCopyGesture = 0;
  listen(
    window,
    "click",
    (event) => {
      try {
        const found = native.eventTarget ? apply(native.eventTarget, event, []) : null;
        if (found && native.nodeType && apply(native.nodeType, found, []) === 1) lastClick = found as Element;
      } catch {
        /* ignore */
      }
    },
    true,
  );
  listen(
    window,
    "keydown",
    (event) => {
      if (!trusted(event)) return;
      const key = keyOf(event as KeyboardEvent);
      const ctrl = native.ctrlKey ? apply(native.ctrlKey, event, []) === true : false;
      const meta = native.metaKey ? apply(native.metaKey, event, []) === true : false;
      if (((ctrl || meta) && (key === "c" || key === "x")) || (ctrl && key === "insert")) lastCopyGesture = dateNow();
    },
    true,
  );
  listen(
    window,
    "contextmenu",
    (event) => {
      if (trusted(event)) lastCopyGesture = dateNow();
    },
    true,
  );

  function looksPromptInject(text: string): boolean {
    const n = trim(collapseSpaces(native.string(text), "\\s+"));
    if (n.length < 24) return false;
    const parts = bothEnds(n, 8000);
    const re = /ignore (?:all )?(?:previous|prior|above) instructions|you are (?:now )?(?:a |an )?(?:helpful )?(?:browser )?(?:assistant|agent)|system prompt:|exfiltrat(?:e|ion)|send (?:me )?(?:all )?(?:cookies|credentials|api keys)/i;
    for (const part of parts) {
      if (part.length >= 24 && matches(re, part)) return true;
    }
    return false;
  }

  const SAFE_TEXT = german
    ? "Fundament hat einen Befehl blockiert, den diese Webseite in deine Zwischenablage kopieren wollte. Füge niemals Befehle von Webseiten in Ausführen (Win+R), PowerShell oder das Terminal ein."
    : "Fundament blocked a command this website tried to copy to your clipboard. Never paste commands from a website into Run (Win+R), PowerShell, or Terminal.";

  /* ----------------------------------------------------- clipboard hijack */

  const ADDRESS_RE =
    /^(?:0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[1-9A-HJ-NP-Za-km-z]{33}|[1-9A-HJ-NP-Za-km-z]{32,44}|(?:ltc1|tb1)[a-z0-9]{25,62}|r[1-9A-HJ-NP-Za-km-z]{24,34})$/;
  let lastUserCopy: { text: string; at: number } | null = null;

  function isAddress(text: string): boolean {
    return matches(ADDRESS_RE, trim(native.string(text)));
  }

  /** Returns the text that should actually reach the clipboard. */
  function vet(text: string): string {
    const value = native.string(text);
    if (announced(value) === "block") return SAFE_TEXT;
    if (looksPromptInject(value)) ping("prompt-injection");
    if (lastUserCopy && dateNow() - lastUserCopy.at < 1500 && isAddress(value) && trim(value) !== lastUserCopy.text) {
      ping("clipboard-hijack");
      return lastUserCopy.text;
    }
    return value;
  }

  function fieldSlice(control: Element): string {
    const tag = native.tagName ? apply(native.tagName, control, []) : "";
    const input = tag === "INPUT";
    const startGet = input ? native.inputSelectionStart : native.selectionStart;
    const endGet = input ? native.inputSelectionEnd : native.selectionEnd;
    const valueGet = input ? native.inputValue : native.textareaValue;
    const start = startGet ? apply(startGet, control, []) : 0;
    const end = endGet ? apply(endGet, control, []) : 0;
    const value = valueGet ? native.string(apply(valueGet, control, []) ?? "") : "";
    if (typeof start !== "number" || typeof end !== "number" || end <= start) return "";
    return trim(slice(value, start, end));
  }

  listen(
    document,
    "copy",
    (event) => {
      try {
        let selection = "";
        if (native.getSelection && native.selectionString) {
          const sel = apply(native.getSelection, window, []);
          if (sel) selection = trim(native.string(apply(native.selectionString, sel, []) ?? ""));
        }
        // Kits select a hidden textarea without focusing it, so look at every text control.
        let fieldText = "";
        const active = native.activeElement ? apply(native.activeElement, document, []) : null;
        const activeTag = active && native.tagName ? apply(native.tagName, active, []) : "";
        const controls: Element[] = [];
        if (active && (activeTag === "TEXTAREA" || activeTag === "INPUT")) push(controls, active);
        for (const el of listSlice(all(document, "textarea, input"), 0, 60)) push(controls, el);
        for (const control of controls) {
          try {
            fieldText = fieldSlice(control);
            if (fieldText) break;
          } catch {
            /* input types without selection (checkbox, number) */
          }
        }
        const copied = selection || fieldText;
        if (copied && isAddress(copied) && trusted(event)) lastUserCopy = { text: copied, at: dateNow() };
        // execCommand("copy") on a hidden textarea is how many ClickFix kits copy.
        // A copy the user made with Ctrl+C or the context menu is never touched.
        const userCopy = dateNow() - lastCopyGesture < 2000;
        if (copied && !userCopy && announced(copied) === "block") {
          prevent(event);
          const data = native.clipboardData ? apply(native.clipboardData, event, []) : null;
          if (data && native.setData) apply(native.setData, data, ["text/plain", SAFE_TEXT]);
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
        const text = matches(/^text(\/plain)?$/i, native.string(format));
        return apply(original as (this: unknown, format: string, data: string) => unknown, this, [format, text ? vet(data) : data]);
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
            return apply(original as (this: unknown, data: string) => unknown, this, [vet(data)]);
          };
        });
      }
      if (typeof clipboard.write === "function" && typeof ClipboardItem === "function") {
        seal(clipboard, "write", (original) => {
          return async function (this: unknown, items: ClipboardItems) {
            const vetted: ClipboardItem[] = [];
            for (const item of apply(native.from, Array, [items]) as ClipboardItem[]) {
              const types = native.types ? apply(native.types, item, []) : null;
              if (types && listIncludes(types as readonly unknown[], "text/plain") && native.getType && native.blobText && native.clipboardItem && native.blob) {
                try {
                  const blob = await apply(native.getType, item, ["text/plain"]);
                  const text = native.string(await apply(native.blobText, blob, []));
                  const safe = vet(text);
                  if (safe !== text) {
                    push(vetted, new native.clipboardItem({ "text/plain": new native.blob([safe], { type: "text/plain" }) }));
                    continue;
                  }
                } catch {
                  /* fall through to the original item */
                }
              }
              push(vetted, item);
            }
            return apply(original as (this: unknown, items: ClipboardItems) => unknown, this, [vetted]);
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
    listen(window, "load", check, { once: true });
  }

  const MAX_HALF = native.bigInt("0x8000000000000000000000000000000000000000000000000000000000000000");

  function hexWord(data: string, index: number): string {
    return slice(data, 10 + index * 64, 10 + (index + 1) * 64);
  }

  type Danger = { what: string } | null;

  function dangerOf(args: unknown): Danger {
    const req = args as { method?: unknown; params?: unknown } | null;
    const method = typeof req?.method === "string" ? req.method : "";
    const params = native.isArray(req?.params) ? (req.params as unknown[]) : [];
    if (method === "eth_sign") {
      return { what: german ? "eine Blanko-Signatur (eth_sign)" : "a blind signature (eth_sign)" };
    }
    if (matches(/^eth_signTypedData/, method)) {
      let raw: unknown = null;
      let objectParam: unknown = null;
      for (const param of params) {
        if (raw == null && typeof param === "string" && startsWith(trim(param), "{")) raw = param;
        else if (objectParam == null && typeof param === "object" && param !== null) objectParam = param;
      }
      if (raw == null) raw = objectParam;
      type Typed = { primaryType?: unknown; message?: Record<string, unknown> } | null;
      let typed: Typed = null;
      try {
        typed = typeof raw === "string" ? (apply(native.jsonParse, JSON, [raw]) as Typed) : ((raw ?? null) as unknown as Typed);
      } catch {
        typed = null;
      }
      const primary = native.string(typed?.primaryType ?? "");
      if (matches(/^Permit/i, primary) || (typed?.message && "spender" in typed.message && ("value" in typed.message || "details" in typed.message))) {
        return {
          what: german
            ? "eine Permit-Signatur, mit der eine fremde Adresse deine Token abziehen darf"
            : "a Permit signature that lets another address pull your tokens",
        };
      }
      if (matches(/^OrderComponents$/i, primary)) {
        return { what: german ? "eine Marktplatz-Listung (Seaport) deiner NFTs" : "a marketplace listing (Seaport) of your NFTs" };
      }
      return null;
    }
    if (method === "eth_sendTransaction") {
      const tx = (params[0] ?? {}) as { data?: unknown; input?: unknown };
      return calldataDanger(lower(native.string(tx.data ?? tx.input ?? "")));
    }
    if (method === "wallet_sendCalls") {
      const batch = (params[0] ?? {}) as { calls?: unknown };
      const calls = native.isArray(batch.calls) ? batch.calls : [];
      for (const call of calls) {
        const tx = (call ?? {}) as { data?: unknown; input?: unknown };
        const danger = calldataDanger(lower(native.string(tx.data ?? tx.input ?? "")));
        if (danger) return danger;
      }
    }
    return null;
  }

  function calldataDanger(data: string): Danger {
    if (startsWith(data, "0xa22cb465") && matches(/1$/, hexWord(data, 1))) {
      return {
        what: german
          ? "setApprovalForAll: Zugriff auf ALLE NFTs dieser Sammlung"
          : "setApprovalForAll: access to ALL your NFTs in this collection",
      };
    }
    if (startsWith(data, "0x095ea7b3") || startsWith(data, "0x39509351")) {
      try {
        const amount = native.bigInt(`0x${hexWord(data, 1) || "0"}`);
        if (amount >= MAX_HALF) {
          return {
            what: german ? "eine unbegrenzte Token-Freigabe (approve)" : "an unlimited token approval (approve)",
          };
        }
      } catch {
        /* malformed */
      }
    }
    return null;
  }

  const wrapped = new native.weakSet<object>();

  function wrapProvider(provider: unknown): void {
    const p = provider as { request?: (args: unknown) => Promise<unknown> } | null;
    if (!p || typeof p !== "object" || typeof p.request !== "function" || apply(native.weakHas, wrapped, [p])) return;
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
              return native.promiseReject(native.assign(new native.error("User rejected the request (Fundament)."), { code: 4001 }));
            }
          }
          return apply(original as (this: unknown, args: unknown) => Promise<unknown>, this ?? p, [args]);
        };
      });
      apply(native.weakAdd, wrapped, [p]);
    } catch {
      /* provider is frozen: detection-only via page checks */
    }
  }

  function scanProviders(): void {
    wrapProvider(w.ethereum);
    const multi = (w.ethereum as { providers?: unknown[] } | undefined)?.providers;
    if (native.isArray(multi)) {
      for (const provider of multi) wrapProvider(provider);
    }
  }

  scanProviders();
  listen(window, "eip6963:announceProvider", (event) => {
    const detail = (event as CustomEvent<{ provider?: unknown }>).detail;
    wrapProvider(detail?.provider);
  });
  listen(window, "ethereum#initialized", scanProviders);
  listen(document, "DOMContentLoaded", scanProviders, { once: true });
  listen(window, "load", scanProviders, { once: true });
  if (native.later) {
    apply(native.later, undefined, [scanProviders, 1500]);
    apply(native.later, undefined, [scanProviders, 4000]);
  }

  /* ------------------------------------------------- miners, keyboard lock */

  let wasmHits = 0;
  const wasm = globalThis.WebAssembly;
  if (wasm && typeof wasm.instantiate === "function") {
    const original = apply(native.bind, wasm.instantiate, [wasm]) as typeof wasm.instantiate;
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
        if (matches(/coinhive|cryptonight|webmine|coinimp|cryptoloot/i, slice(native.string(url), 0, 300))) ping("miner-wasm");
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
    const proto = keyboard ? native.getPrototypeOf(keyboard) : null;
    if (proto && typeof proto.lock === "function") {
      const originalLock = proto.lock;
      proto.lock = function (this: unknown, keys?: string[]) {
        ping("keyboard-lock");
        return apply(originalLock, this, [keys]);
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
      return apply(originalToDataURL, this, args);
    };
    const glProto = WebGLRenderingContext.prototype;
    const originalGetParameter = glProto.getParameter;
    glProto.getParameter = function (this: WebGLRenderingContext, pname: number) {
      if (pname === 0x9245 || pname === 0x9246) ping("fingerprint-canvas");
      return apply(originalGetParameter, this, [pname]);
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
        return apply(originalBins, this, [array]);
      };
    }
  } catch {
    /* ignore */
  }

  try {
    /* mark-start */
    if (marksOn() && native.now && native.measure) {
      const bridgeElapsed = apply(native.now, performance, []) - bridgeStarted;
      apply(native.measure, performance, ["fundament-bridge", { start: bridgeStarted, duration: bridgeElapsed }]);
    }
    /* mark-end */
  } catch {
    /* a missing clock must not undo the hooks above */
  }
})();
