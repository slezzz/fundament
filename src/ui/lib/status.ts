import type { UrlAnalysis } from "@shared/types";
import { presentAnalysis, primaryIssue, type PresentExtras, type StatusCopy } from "@engine/status/present";
import { t } from "./i18n";

export type { StatusCopy, PresentExtras } from "@engine/status/present";
export { issueSignals, presentAnalysis, primaryIssue } from "@engine/status/present";

export function statusFrom(analysis: UrlAnalysis | null, hasTab: boolean, extras: PresentExtras = {}) {
  return presentAnalysis(analysis, hasTab, extras);
}

export function explanation(analysis: UrlAnalysis): string | undefined {
  return primaryIssue(analysis)?.explanation;
}

/** Locale overlay for the few home-screen labels. Issue titles stay engine copy. */
export function visibleStatus(status: StatusCopy, blocked = 0): { label: string; hint: string } {
  switch (status.label) {
    case "Protected":
      return {
        label: t("status_protected"),
        hint: blocked > 0 ? t("status_hint_protectedHits", [String(blocked)]) : t("status_hint_protected"),
      };
    case "Allowed":
      return { label: t("status_allowed"), hint: t("status_hint_allowed") };
    case "Paused":
      return { label: t("status_paused"), hint: t("status_hint_paused") };
    case "Watching":
      return { label: t("status_watching"), hint: t("status_hint_watching") };
    case "Stopped":
      return { label: t("status_stopped"), hint: status.hint };
    case "Not encrypted":
      return { label: t("status_notEncrypted"), hint: t("status_hint_notEncrypted") };
    default:
      return { label: status.label, hint: status.hint };
  }
}
