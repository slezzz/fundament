import { entitlementsFor } from "./entitlements";
import type { PlanId } from "@shared/types";

/**
 * Every line on the Pro screen. `measure` is the behavior a test can observe.
 * Reputation and remote filter packs are not lines: they are not in this build.
 */
export const PLAN_LINES = [
  { text: "plan_local", tier: "free", measure: "threat-engine" },
  { text: "plan_ads", tier: "free", measure: "tracker-core" },
  { text: "plan_extra", tier: "free", measure: "ads-extra" },
  { text: "plan_hibp", tier: "free", measure: "hibp" },
  { text: "plan_extended", tier: "pro", measure: "tracker-extended" },
  { text: "plan_fp", tier: "pro", measure: "fingerprint-shield" },
  { text: "plan_cosmetic", tier: "pro", measure: "cosmetic" },
  { text: "plan_lists", tier: "scaled", measure: "list-cap" },
  { text: "plan_history", tier: "scaled", measure: "history" },
  { text: "plan_level", tier: "scaled", measure: "level" },
] as const;

export type PlanMeasure = (typeof PLAN_LINES)[number]["measure"];

/** What the store build actually changes for this line. */
export function planLineEffect(measure: PlanMeasure, plan: PlanId): boolean | number {
  const entitlements = entitlementsFor(plan);
  switch (measure) {
    case "threat-engine":
    case "tracker-core":
    case "ads-extra":
    case "hibp":
      return true;
    case "tracker-extended":
      return entitlements.extendedTrackers;
    case "fingerprint-shield":
      return entitlements.fingerprintShield;
    case "cosmetic":
      return entitlements.cosmeticFiltering;
    case "list-cap":
      return entitlements.maxListEntries;
    case "history":
      return entitlements.eventRetentionMs;
    case "level":
      return entitlements.securityLevels.length;
  }
}
