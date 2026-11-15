/**
 * Detects ClickFix-style commands a page tries to place on the clipboard.
 * Does not read the user's clipboard.
 *
 * KEEP IN SYNC with commandTier() in src/content/walletBridge.ts (classic script, no imports).
 *
 * "strong": only malware does this (hidden window, encoded payload, LOLBins, fake-captcha tail).
 * "weak":   real installers look like this too (irm …|iex, curl …|sh, powershell -c). The bridge
 *           blocks these only when the page shows ClickFix instructions (Win+R, captcha).
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
    if (/\bfinger(?:\.exe)?\s+\S+@\S+\s*\|/i.test(n)) return "strong";
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

/** `pageShowsClickFixInstructions` = the page tells you to press Win+R / solve a captcha. */
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
