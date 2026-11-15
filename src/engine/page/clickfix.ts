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
  const raw = String(text).trim();
  if (raw.length < 12 || raw.length > 12_000) return null;
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
