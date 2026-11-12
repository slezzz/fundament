import type { UrlAnalysis } from "@shared/types";
import { presentAnalysis, primaryIssue, type PresentExtras, type StatusCopy } from "@engine/status/present";
import { t } from "./i18n";
import { sigText } from "./signalText";

export type { StatusCopy, PresentExtras } from "@engine/status/present";
export { issueSignals, presentAnalysis, primaryIssue } from "@engine/status/present";

/** Engine status with the primary issue rendered in the browser language. */
export function statusFrom(analysis: UrlAnalysis | null, hasTab: boolean, extras: PresentExtras = {}): StatusCopy {
  const status = presentAnalysis(analysis, hasTab, extras);
  const issue = analysis ? primaryIssue(analysis) : undefined;
  if (!issue || status.hint !== issue.explanation) return status;
  const text = sigText(issue);
  return {
    ...status,
    label: status.label === issue.title ? text.title : status.label,
    hint: text.explanation,
  };
}

export function explanation(analysis: UrlAnalysis): string | undefined {
  const issue = primaryIssue(analysis);
  return issue ? sigText(issue).explanation : undefined;
}

/** Locale overlay for the fixed home-screen labels. */
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
