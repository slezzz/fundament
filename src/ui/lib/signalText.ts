import type { RiskSignal } from "@shared/types";
import { langFromLocale, localizeSignal, type SignalLang } from "@engine/i18n/signals";

export function uiLang(): SignalLang {
  try {
    return langFromLocale(chrome.i18n.getUILanguage());
  } catch {
    return langFromLocale(typeof navigator !== "undefined" ? navigator.language : "en");
  }
}

/** Title and explanation of a signal in the browser language. */
export function sigText(signal: RiskSignal): { title: string; explanation: string } {
  return localizeSignal(signal, uiLang());
}
