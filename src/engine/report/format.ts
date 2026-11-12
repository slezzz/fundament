import type { RiskSignal, UrlAnalysis } from "@shared/types";
import { BANDS } from "../risk/weights";

const SEVERITY_ORDER: Record<RiskSignal["severity"], number> = {
  fail: 0,
  warn: 1,
  info: 2,
  ok: 3,
  unavailable: 4,
};

export function sortSignals(signals: RiskSignal[]): RiskSignal[] {
  return [...signals].sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    return b.weightApplied - a.weightApplied;
  });
}

export function contributingPoints(analysis: UrlAnalysis): number {
  return analysis.signals.reduce((sum, s) => sum + s.weightApplied, 0);
}

export function coverageLine(analysis: UrlAnalysis): string {
  const missing = analysis.signals.filter((s) => s.severity === "unavailable").map((s) => s.id);
  const parts = [
    "Scope: URL heuristics, DNR, page structure, download names, DOM gadgets, IOC hosts.",
    "Chrome owns TLS. No file-content antivirus.",
  ];
  if (missing.length > 0) {
    parts.push(`Not claimed: ${missing.join(", ")}.`);
  }
  if (!analysis.reputationAvailable) {
    parts.push("Reputation feed: off or unavailable.");
  }
  return parts.join(" ");
}

/** Deterministic text a reviewer can paste into a ticket. No query values. */
export function formatAnalysisReport(analysis: UrlAnalysis): string {
  const host = analysis.domain?.registrableDomain ?? analysis.parsed?.hostname ?? "unknown";
  const unicode = analysis.domain?.hostnameUnicode ?? host;
  const band =
    (Object.entries(BANDS) as [string, readonly [number, number]][]).find(
      ([, range]) => analysis.score >= range[0] && analysis.score <= range[1],
    )?.[0] ?? analysis.band;

  const lines = [
    "FUNDAMENT ANALYSIS",
    `engine=${analysis.engineVersion} weights=${analysis.weightsVersion}`,
    `host=${host}`,
    unicode !== host ? `unicode=${unicode}` : undefined,
    `idn=${analysis.domain?.containsPunycode ? "punycode" : "ascii"}`,
    `score=${analysis.score} band=${band} raw=${contributingPoints(analysis)}`,
    `allowlisted=${analysis.allowlisted} blocklisted=${analysis.blocklisted}`,
    "",
    "signals:",
  ].filter((line): line is string => line !== undefined);

  for (const signal of sortSignals(analysis.signals)) {
    const pts = signal.weightApplied.toString().padStart(3, " ");
    lines.push(`  ${signal.severity.padEnd(12)} +${pts}  ${signal.id}  ${signal.title}`);
  }

  lines.push("", coverageLine(analysis));
  return lines.join("\n");
}
