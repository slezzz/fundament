import type { ParsedUrl } from "@shared/types";

export interface RedirectHeuristic {
  nestedUrl: string | null;
  chainedParams: boolean;
}

const URLISH = /https?:\/\/|www\./i;
const REDIRECT_KEYS = new Set([
  "redirect",
  "redirect_uri",
  "url",
  "next",
  "continue",
  "return",
  "returnurl",
  "return_url",
  "dest",
  "destination",
  "target",
  "r",
  "u",
  "goto",
  "out",
]);

export function analyzeRedirectShape(parsed: ParsedUrl): RedirectHeuristic {
  const params = new URLSearchParams(parsed.search);
  let nestedUrl: string | null = null;
  let redirectKeys = 0;

  for (const [key, value] of params) {
    const k = key.toLowerCase();
    if (REDIRECT_KEYS.has(k)) {
      redirectKeys += 1;
    }
    const decoded = safeDecode(value);
    if (URLISH.test(decoded) || decoded.startsWith("//")) {
      nestedUrl = decoded;
    }
  }

  if (!nestedUrl && URLISH.test(parsed.pathname)) {
    nestedUrl = parsed.pathname;
  }

  return {
    nestedUrl,
    chainedParams: redirectKeys >= 2,
  };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
