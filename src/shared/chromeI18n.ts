/** Service-worker-safe i18n. UI pages still use `t()` in ui/lib/i18n.ts. */

export function chromeMessage(
  id: string,
  fallback: string,
  substitutions?: string | string[],
): string {
  try {
    const fromChrome = chrome?.i18n?.getMessage?.(id, substitutions);
    if (fromChrome) return fromChrome;
  } catch {
    /* tests / node */
  }
  const parts = substitutions === undefined ? [] : Array.isArray(substitutions) ? substitutions : [substitutions];
  return fallback.replace(/\$(\d+)/g, (_all, index: string) => parts[Number(index) - 1] ?? "");
}
