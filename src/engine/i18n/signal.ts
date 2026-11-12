import type { RiskSignal } from "@shared/types";
import { signalCopy } from "./signals";

/**
 * Build a signal whose copy comes from the catalog (src/engine/i18n/signals.ts).
 * `title` / `explanation` hold English for logs, reports, and tests; the UI
 * re-renders from `key` + `args` in the browser language.
 */
export function textSignal(
  id: string,
  key: string,
  weight: number,
  severity: RiskSignal["severity"],
  args: string[] = [],
): RiskSignal {
  const copy = signalCopy(key, args, "en");
  return { id, key, args, weightApplied: weight, severity, title: copy.title, explanation: copy.explanation };
}
