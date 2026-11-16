/**
 * Detects ClickFix-style commands a page tries to place on the clipboard.
 * Does not read the user's clipboard.
 *
 * KEEP IN SYNC with commandTier() in src/content/walletBridge.ts (classic script, no imports).
 *
 * "strong": only malware does this (hidden window, encoded payload, LOLBins, fake-captcha tail).
 * "weak":   real installers look like this too (irm …|iex, curl …|sh, powershell -c). The bridge
 *           blocks these only when pasteLureContext is true (a key combination, or a claim
 *           about this browser together with a paste or run instruction).
 */
export function clickFixTier(text: string): "strong" | "weak" | null {
  // A length cutoff used to return "harmless". Padding (spaces, a # comment, newlines,
  // Unicode spaces) kept the command runnable in Run / Terminal. Collapse that padding,
  // then scan the head, the tail, and a short slice around each command marker.
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
 * A lure is a call to an OS surface (a key combination or the Run dialog), or a claim
 * that THIS browser crashed or is out of date together with an instruction to paste
 * or run a fix. One word is not a lure: "reCAPTCHA", "captcha", "I'm not a robot",
 * and "Your browser is out of date" on their own are ordinary page text.
 * "Paste this into Terminal" without that claim is how install docs are written.
 * The real browser version stays in posture.ts. This does not read it.
 */
const KEY_ACTION_RE =
  /(?:windows\s*(?:key|taste)?\s*\+\s*r\b|win\s*\+\s*r\b|⊞\s*\+?\s*r\b|run dialog|ausführen-dialog|press\s+(?:ctrl|strg|control)\s*\+\s*v|(?:ctrl|strg|control)\s*\+\s*v\b|cmd\s*\+\s*space)/i;

const BROWSER_CLAIM_RE =
  /(?:your|ihr|dein|deinen)\s+browser\b.{0,48}(?:out of date|veraltet|outdated|crashed|abgestürzt)|(?:chrome|edge|firefox|browser).{0,48}(?:has crashed|ist abgestürzt|is out of date|ist veraltet)|aw,\s*snap|(?:chrome|edge|browser).{0,40}(?:out of date|veraltet|outdated|crashed|abgestürzt)/i;

const FIX_INSTRUCTION_RE =
  /(?:\bpaste\b|\beinfügen\b|\beinfuegen\b|\bfüge\b|\bfuege\b|\bkopiere\b).{0,48}\b(?:fix|command|befehl|this|diesen|den|code|it)\b|(?:press|drücke|druecke|hit)\b.{0,40}(?:ctrl|strg|windows|win\b)|(?:\brun\b|ausführen|ausfuehren|execute|führe).{0,40}\b(?:this|diesen|the command|den befehl|fix)\b/i;

export function pasteLureContext(text: string): boolean {
  const raw = String(text);
  const parts = raw.length <= 20000 ? [raw] : [raw.slice(0, 20000), raw.slice(-20000)];
  return parts.some(
    (part) => KEY_ACTION_RE.test(part) || (BROWSER_CLAIM_RE.test(part) && FIX_INSTRUCTION_RE.test(part)),
  );
}

/**
 * A weak command the page copied, when no lure text was visible.
 * Popular hosts stay quiet (install docs, brand sites). A user site on a
 * hosting zone does not. The command text is not an argument: the worker
 * only learns that the tier was weak.
 */
export function warnUnseenWeakCommand(host: { popular: boolean; userHosted: boolean }): boolean {
  if (host.popular) return false;
  return host.userHosted;
}

/** `pageShowsClickFixInstructions` = pasteLureContext(page text). */
export function looksLikeClickFixCommand(text: string, pageShowsClickFixInstructions = true): boolean {
  const tier = clickFixTier(text);
  return tier === "strong" || (tier === "weak" && pageShowsClickFixInstructions);
}

export function looksLikeHtmlSmugglingName(name: string): boolean {
  const n = name.slice(-180).toLowerCase();
  if (/\.(pdf|docx?|xlsx?|zip|txt|jpe?g|png|gif)\.(html?|svg|js|iso|img|exe|scr|hta)$/i.test(n)) {
    return true;
  }
  return /\.(search-ms|library-ms|lnk|scf|hta|msc|gadget|msix|appinstaller|diagcab|jse|pif|cpl|settingcontent-ms|website|inf)$/i.test(
    n,
  );
}
