import type { RiskSignal, UrlAnalysis } from "@shared/types";

export interface StatusCopy {
  label: string;
  hint: string;
  tone: "safe" | "warn" | "danger" | "idle";
}

export interface PresentExtras {
  blocked?: number;
  pausedUntil?: number | null;
}

/** Any real problem: never show a green “Protected” state. */
export function issueSignals(analysis: UrlAnalysis): RiskSignal[] {
  return (analysis.signals ?? []).filter((s) => s.severity === "fail" || s.severity === "warn");
}

export function primaryIssue(analysis: UrlAnalysis): RiskSignal | undefined {
  const issues = issueSignals(analysis);
  if (issues.length === 0) return undefined;
  const fails = issues.filter((s) => s.severity === "fail");
  const pool = fails.length > 0 ? fails : issues;
  return [...pool].sort((a, b) => b.weightApplied - a.weightApplied)[0];
}

export function presentAnalysis(
  analysis: UrlAnalysis | null,
  hasTab: boolean,
  extras: PresentExtras | undefined = {},
): StatusCopy {
  const extra = extras ?? {};
  if (extra.pausedUntil && extra.pausedUntil > Date.now()) {
    return {
      label: "Paused",
      hint: "Blocking is off for this site until the pause ends.",
      tone: "idle",
    };
  }
  if (!hasTab || !analysis) {
    return {
      label: "Watching",
      hint: "Open a website. Fundament will name anything that is not safe.",
      tone: "idle",
    };
  }
  if (analysis.allowlisted) {
    return { label: "Allowed", hint: "This site is on your allowlist. Blocking is skipped here.", tone: "idle" };
  }

  const issue = primaryIssue(analysis);
  if (issue) {
    const tone = issue.severity === "fail" || analysis.band === "high" || analysis.band === "critical"
      ? "danger"
      : "warn";
    const label =
      analysis.band === "critical" && issue.severity === "fail"
        ? "Stopped"
        : issue.title;
    return {
      label,
      hint: issue.explanation,
      tone,
    };
  }

  if (analysis.parsed?.protocol === "http:") {
    return {
      label: "Not encrypted",
      hint: "This site uses HTTP. The network can read or change the page.",
      tone: "warn",
    };
  }

  const stopped = extra.blocked ?? analysis.trackerHits ?? 0;
  return {
    label: "Protected",
    hint:
      stopped > 0
        ? `Stopped ${stopped} tracker request${stopped === 1 ? "" : "s"} on this page.`
        : "No warning signs on this address. Hostile requests are still cut off in the background.",
    tone: "safe",
  };
}
