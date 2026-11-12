import type { RiskBand, SecurityLevel } from "@shared/types";
import { BANDS, LEVEL_MULTIPLIER } from "./weights";

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function applyLevel(score: number, level: SecurityLevel): number {
  return clampScore(score * LEVEL_MULTIPLIER[level]);
}

export function bandForScore(score: number): RiskBand {
  const s = clampScore(score);
  if (s <= BANDS.safe[1]) return "safe";
  if (s <= BANDS.low[1]) return "low";
  if (s <= BANDS.suspicious[1]) return "suspicious";
  if (s <= BANDS.high[1]) return "high";
  return "critical";
}
