import type { RiskSignal } from "@shared/types";

export function partitionSignals(signals: RiskSignal[]): { issues: RiskSignal[]; rest: RiskSignal[] } {
  const issues: RiskSignal[] = [];
  const rest: RiskSignal[] = [];
  for (const signal of signals) {
    if (signal.severity === "fail" || signal.severity === "warn") issues.push(signal);
    else rest.push(signal);
  }
  return { issues, rest };
}
