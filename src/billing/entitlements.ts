import type { Entitlements, PlanId } from "@shared/types";

export const FREE_ENTITLEMENTS: Entitlements = {
  plan: "free",
  onlineReputation: false,
  plusTrackers: false,
  extendedTrackers: false,
  cosmeticFiltering: false,
  filterPack: false,
  securityLevels: ["standard"],
  maxListEntries: 10,
  maxEvents: 40,
  eventRetentionMs: 24 * 60 * 60 * 1000,
};

export const PRO_ENTITLEMENTS: Entitlements = {
  plan: "pro",
  onlineReputation: true,
  plusTrackers: true,
  extendedTrackers: true,
  cosmeticFiltering: true,
  filterPack: true,
  securityLevels: ["relaxed", "standard", "strict"],
  maxListEntries: 200,
  maxEvents: 200,
  eventRetentionMs: 7 * 24 * 60 * 60 * 1000,
};

export function entitlementsFor(plan: PlanId): Entitlements {
  return plan === "pro" ? { ...PRO_ENTITLEMENTS } : { ...FREE_ENTITLEMENTS };
}
