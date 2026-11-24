import type { Entitlements, Settings } from "@shared/types";

/** Clamp paid-only options so a stale Free install cannot keep Pro settings. */
export function applyEntitlements(settings: Settings, entitlements: Entitlements): Settings {
  const securityLevel = entitlements.securityLevels.includes(settings.securityLevel)
    ? settings.securityLevel
    : "standard";
  return {
    ...settings,
    onlineReputation: entitlements.onlineReputation ? settings.onlineReputation : false,
    cosmeticFiltering: entitlements.cosmeticFiltering ? settings.cosmeticFiltering : false,
    fingerprintShield: entitlements.fingerprintShield ? settings.fingerprintShield : false,
    filterPackUrl: entitlements.filterPack ? settings.filterPackUrl : "",
    filterPackSha256: entitlements.filterPack ? settings.filterPackSha256 : "",
    securityLevel,
    allowlist: settings.allowlist.slice(0, entitlements.maxListEntries),
    blocklist: settings.blocklist.slice(0, entitlements.maxListEntries),
  };
}
