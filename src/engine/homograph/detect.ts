/**
 * Confusable characters frequently used in IDN homograph attacks against Latin brands.
 * Covers the Cyrillic / Greek / Armenian / IPA / fullwidth lookalikes seen in real kits.
 * Letters with diacritics (ü, é, ø) are NOT confusables: münchen.de is a normal German domain.
 */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x",
  і: "i", ї: "i", ј: "j", ѕ: "s", һ: "h", ӏ: "l", ԁ: "d", ԛ: "q", ԝ: "w", ү: "y", ɡ: "g", ҽ: "e", ӧ: "o",
  // Greek
  α: "a", β: "b", ε: "e", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x", ω: "w", ϲ: "c",
  // Armenian / misc look-alikes
  օ: "o", ս: "u", զ: "q", ց: "g", հ: "h", ո: "n",
  // Latin small capitals / IPA / dotless
  ᴀ: "a", ʙ: "b", ᴄ: "c", ᴅ: "d", ᴇ: "e", ɢ: "g", ʜ: "h", ɪ: "i", ᴊ: "j", ᴋ: "k", ʟ: "l", ᴍ: "m",
  ɴ: "n", ᴏ: "o", ᴘ: "p", ʀ: "r", ꜱ: "s", ᴛ: "t", ᴜ: "u", ᴠ: "v", ᴡ: "w", ʏ: "y", ᴢ: "z",
  ı: "i", ȷ: "j", ɑ: "a", ɩ: "i", ɵ: "o", ƅ: "b", ⅼ: "l", Ⅰ: "l", "ө": "o",
};

export function foldConfusables(input: string): string {
  let out = "";
  for (const char of input.normalize("NFKC").toLowerCase()) {
    out += CONFUSABLES[char] ?? char;
  }
  return out;
}

/** True when the label contains at least one confusable that folds into ASCII. */
export function hasConfusable(label: string): boolean {
  for (const char of label.normalize("NFKC").toLowerCase()) {
    if (CONFUSABLES[char] !== undefined) return true;
  }
  return false;
}

export function scriptFamilies(input: string): Set<string> {
  const families = new Set<string>();
  for (const char of input) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (code <= 0x7f) {
      if (/[a-z0-9]/i.test(char)) families.add("latin");
      continue;
    }
    if (code >= 0x00c0 && code <= 0x024f) families.add("latin");
    else if (code >= 0x0400 && code <= 0x052f) families.add("cyrillic");
    else if (code >= 0x0370 && code <= 0x03ff) families.add("greek");
    else if (code >= 0x0530 && code <= 0x058f) families.add("armenian");
    else if (code >= 0x3040 && code <= 0x30ff) families.add("kana");
    else if (code >= 0x4e00 && code <= 0x9fff) families.add("han");
    else if (code >= 0x0600 && code <= 0x06ff) families.add("arabic");
    else if (code >= 0x1d00 && code <= 0x1dbf) families.add("ipa");
    else if (code >= 0x0250 && code <= 0x02af) families.add("ipa");
    else if (code >= 0xff00 && code <= 0xffef) families.add("fullwidth");
    else families.add("other");
  }
  return families;
}

/** Latin mixed with Cyrillic / Greek / Armenian / IPA inside one label (pаypal). */
export function hasMixedScripts(labelsUnicode: string[]): boolean {
  return labelsUnicode.some((label) => {
    const f = scriptFamilies(label);
    if (!f.has("latin")) return false;
    return f.has("cyrillic") || f.has("greek") || f.has("armenian") || f.has("ipa") || f.has("fullwidth");
  });
}

/**
 * A label written entirely in a non-Latin script whose letters all fold to ASCII
 * (аррӏе → apple). Real Cyrillic words almost always contain letters with no Latin twin.
 */
export function isWholeScriptConfusable(label: string): boolean {
  if (![...label].some((ch) => (ch.codePointAt(0) ?? 0) > 0x7f)) return false;
  const folded = foldConfusables(label);
  return /^[a-z0-9-]+$/.test(folded) && hasConfusable(label);
}

/**
 * Mixed scripts inside one label are a red flag on their own.
 * Whole-script names (москва, аррӏе) are only suspicious when they spell a brand;
 * the impersonation matcher handles that, so plain Cyrillic/Greek domains stay green.
 */
export function looksLikeHomograph(labelsUnicode: string[], _containsPunycode?: boolean): boolean {
  return hasMixedScripts(labelsUnicode);
}
