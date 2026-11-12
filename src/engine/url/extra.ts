import type { ParsedUrl, RiskSignal } from "@shared/types";
import { textSignal } from "../i18n/signal";
import { WEIGHTS } from "../risk/weights";

const SAFE_PORTS = new Set(["", "80", "443", "8080", "8443"]);
const EXEC_PATH = /\.(exe|scr|bat|cmd|com|ps1|msi|apk|dmg|vbs|wsf|jar|dll|iso|img|hta|lnk)(\?|$)/i;
const DOUBLE_EXT = /\.(pdf|jpg|jpeg|png|gif|txt|doc|docx|zip)\.(exe|scr|js|bat|cmd|com|ps1|html|htm|svg)(\?|$)/i;
const BIDI_POINTS = ["\u202A", "\u202B", "\u202C", "\u202D", "\u202E", "\u2066", "\u2067", "\u2068", "\u2069", "\u200B", "\u200C", "\u200D", "\uFEFF"];

function hasBidiOrInvisible(text: string): boolean {
  return BIDI_POINTS.some((ch) => text.includes(ch));
}
const ENCODED_BIDI_RE = /%E2%80%(?:AA|AB|AC|AD|AE|8B|8C|8D)|%E2%81%A[6-9]|%EF%BB%BF/i;


export function extraUrlSignals(parsed: ParsedUrl): RiskSignal[] {
  const out: RiskSignal[] = [];

  if (parsed.port && !SAFE_PORTS.has(parsed.port)) {
    out.push(
      textSignal("port", "port", WEIGHTS.unusualPort, "warn", [parsed.port]),
    );
  }

  const path = parsed.pathname;
  if (DOUBLE_EXT.test(path)) {
    out.push(
      textSignal("double-ext", "double-ext", WEIGHTS.doubleExtension, "warn"),
    );
  } else if (EXEC_PATH.test(path) && parsed.protocol === "http:") {
    out.push(
      textSignal("executable", "executable", WEIGHTS.executablePath, "warn"),
    );
  }

  if (
    hasBidiOrInvisible(parsed.href) ||
    hasBidiOrInvisible(parsed.hostnameUnicode) ||
    hasBidiOrInvisible(parsed.pathname) ||
    ENCODED_BIDI_RE.test(parsed.href)
  ) {
    out.push(
      textSignal("bidi", "bidi", WEIGHTS.bidiOverride, "warn"),
    );
  }

  const blob = `${parsed.search}${parsed.hash}`.toLowerCase();
  if (/(?:\?|&|%5b)__proto__(?:%5d|=|\[)|(?:\?|&)constructor(?:%5b|\[)prototype/.test(blob)) {
    out.push(
      textSignal("url-prototype", "url-prototype", WEIGHTS.urlPrototypePollution, "warn"),
    );
  }

  return out;
}
