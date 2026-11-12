import type { ParsedUrl, RiskSignal } from "@shared/types";
import { WEIGHTS } from "../risk/weights";

const SAFE_PORTS = new Set(["", "80", "443", "8080", "8443"]);
const EXEC_PATH = /\.(exe|scr|bat|cmd|com|ps1|msi|apk|dmg|vbs|wsf|jar|dll|iso|img|hta|lnk)(\?|$)/i;
const DOUBLE_EXT = /\.(pdf|jpg|jpeg|png|gif|txt|doc|docx|zip)\.(exe|scr|js|bat|cmd|com|ps1|html|htm|svg)(\?|$)/i;
const BIDI_POINTS = ["\u202A", "\u202B", "\u202C", "\u202D", "\u202E", "\u2066", "\u2067", "\u2068", "\u2069", "\u200B", "\u200C", "\u200D", "\uFEFF"];

function hasBidiOrInvisible(text: string): boolean {
  return BIDI_POINTS.some((ch) => text.includes(ch));
}
const ENCODED_BIDI_RE = /%E2%80%(?:AA|AB|AC|AD|AE|8B|8C|8D)|%E2%81%A[6-9]|%EF%BB%BF/i;

function signal(
  id: string,
  weight: number,
  title: string,
  explanation: string,
): RiskSignal {
  return { id, weightApplied: weight, severity: "warn", title, explanation };
}

export function extraUrlSignals(parsed: ParsedUrl): RiskSignal[] {
  const out: RiskSignal[] = [];

  if (parsed.port && !SAFE_PORTS.has(parsed.port)) {
    out.push(
      signal(
        "port",
        WEIGHTS.unusualPort,
        "Unusual port",
        `This site uses port ${parsed.port} instead of a normal web port. That is sometimes used to hide phishing kits.`,
      ),
    );
  }

  const path = parsed.pathname;
  if (DOUBLE_EXT.test(path)) {
    out.push(
      signal(
        "double-ext",
        WEIGHTS.doubleExtension,
        "Disguised file",
        "The address looks like a document but actually points at a program. Treat this as a malware trick.",
      ),
    );
  } else if (EXEC_PATH.test(path) && parsed.protocol === "http:") {
    out.push(
      signal(
        "executable",
        WEIGHTS.executablePath,
        "Program over HTTP",
        "This address offers a program file over an unencrypted connection. Do not run it.",
      ),
    );
  }

  if (
    hasBidiOrInvisible(parsed.href) ||
    hasBidiOrInvisible(parsed.hostnameUnicode) ||
    hasBidiOrInvisible(parsed.pathname) ||
    ENCODED_BIDI_RE.test(parsed.href)
  ) {
    out.push(
      signal(
        "bidi",
        WEIGHTS.bidiOverride,
        "Hidden Unicode in the address",
        "This URL contains bidirectional or zero-width characters. That is a classic trick to disguise filenames and hosts. Do not trust how the address looks.",
      ),
    );
  }

  const blob = `${parsed.search}${parsed.hash}`.toLowerCase();
  if (/(?:\?|&|%5b)__proto__(?:%5d|=|\[)|(?:\?|&)constructor(?:%5b|\[)prototype/.test(blob)) {
    out.push(
      signal(
        "url-prototype",
        WEIGHTS.urlPrototypePollution,
        "Prototype pollution in the address",
        "The query string assigns to __proto__ or constructor.prototype. That is how client-side prototype-pollution gadgets (and several CVEs) take attacker-controlled defaults. Fundament does not execute a proof of concept.",
      ),
    );
  }

  return out;
}
