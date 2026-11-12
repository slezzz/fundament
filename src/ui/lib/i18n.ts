import en from "../../../public/_locales/en/messages.json";

type MessageCatalog = Record<string, { message: string }>;

const fallback = en as MessageCatalog;

function substitute(template: string, substitutions?: string | string[]): string {
  const parts = substitutions === undefined ? [] : Array.isArray(substitutions) ? substitutions : [substitutions];
  return template.replace(/\$(\d+)/g, (_all, index: string) => parts[Number(index) - 1] ?? "");
}

export function t(id: string, substitutions?: string | string[]): string {
  try {
    const fromChrome = chrome?.i18n?.getMessage?.(id, substitutions);
    if (fromChrome) return fromChrome;
  } catch {
    /* tests and node have no chrome.i18n */
  }
  const template = fallback[id]?.message;
  if (!template) return id;
  return substitute(template, substitutions);
}

export function applyDocumentLocale(): void {
  try {
    const lang = chrome?.i18n?.getUILanguage?.();
    if (lang) document.documentElement.lang = lang;
  } catch {
    /* ignore */
  }
  document.documentElement.style.colorScheme = "light dark";
}
