import { MAX_LIST_ENTRIES } from "@shared/constants";
import { parseHttpsUrl, parseSha256Pin } from "@engine/filters/abp";
import { isPublicSuffix } from "@engine/domain/psl";
import { applyEntitlements } from "@billing/apply";
import { entitlementsFor } from "@billing/entitlements";
import { planFromLicense } from "@billing/license";
import type { Entitlements, Settings } from "@shared/types";

export const DEFAULT_SETTINGS: Settings = {
  threatProtection: true,
  trackerBlocking: true,
  phishingProtection: true,
  localAnalysis: true,
  telemetry: false,
  onlineReputation: false,
  httpsUpgrade: true,
  httpsUpgradePages: false,
  pageChecks: true,
  downloadProtection: true,
  stripTrackingParams: true,
  globalPrivacyControl: true,
  hardenBrowser: true,
  cosmeticFiltering: false,
  overlayProtection: true,
  filterPackUrl: "",
  filterPackSha256: "",
  cspReinforce: false,
  fingerprintShield: false,
  iocFeeds: true,
  iocFeedUrl: "",
  iocFeedSha256: "",
  searchMarks: true,
  liveFeed: true,
  blockNotificationPrompts: false,
  securityLevel: "standard",
  allowlist: [],
  blocklist: [],
  onboardingComplete: false,
  licenseToken: "",
};

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asLevel(value: unknown): Settings["securityLevel"] {
  return value === "relaxed" || value === "strict" || value === "standard" ? value : "standard";
}

function asHostList(value: unknown, max = MAX_LIST_ENTRIES): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const host = (item.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "").replace(/\.$/, "");
    if (!host || host.length > 253 || host.includes("*") || host.includes("..")) continue;
    if (isPublicSuffix(host)) continue;
    if (cleaned.length >= max) break;
    if (!cleaned.includes(host)) cleaned.push(host);
  }
  return cleaned;
}

function asToken(value: unknown): string {
  if (typeof value !== "string") return "";
  const token = value.trim();
  if (token.length > 8192) return "";
  return token;
}

function own(source: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(source, key) ? source[key] : undefined;
}

/**
 * chrome.storage.local.get(null) returns the whole area. 1.0 kept a master
 * `enabled` flag and an `allow` list at the top level. Those flags are not
 * the current switches: a missing or legacy blob comes back with protection on.
 * A boolean the current schema stored is kept.
 */
export function settingsFromStorageArea(area: unknown): unknown {
  if (typeof area !== "object" || area === null || Array.isArray(area)) return undefined;
  const record = area as Record<string, unknown>;
  if (Object.hasOwn(record, "settings")) return record.settings;
  if (Object.hasOwn(record, "enabled") || Object.hasOwn(record, "allow") || Object.hasOwn(record, "phishing")) {
    return { allowlist: record.allow, blocklist: record.block };
  }
  return undefined;
}

export function migratedSettings(area: unknown): Settings {
  const raw = settingsFromStorageArea(area);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ...DEFAULT_SETTINGS };
  const o = raw as Record<string, unknown>;
  return parseSettings({
    threatProtection: own(o, "threatProtection"),
    trackerBlocking: own(o, "trackerBlocking"),
    phishingProtection: own(o, "phishingProtection"),
    telemetry: own(o, "telemetry"),
    onlineReputation: own(o, "onlineReputation"),
    httpsUpgrade: own(o, "httpsUpgrade"),
    httpsUpgradePages: own(o, "httpsUpgradePages"),
    pageChecks: own(o, "pageChecks"),
    downloadProtection: own(o, "downloadProtection"),
    stripTrackingParams: own(o, "stripTrackingParams"),
    globalPrivacyControl: own(o, "globalPrivacyControl"),
    hardenBrowser: own(o, "hardenBrowser"),
    cosmeticFiltering: own(o, "cosmeticFiltering"),
    overlayProtection: own(o, "overlayProtection"),
    filterPackUrl: own(o, "filterPackUrl"),
    filterPackSha256: own(o, "filterPackSha256"),
    cspReinforce: own(o, "cspReinforce"),
    fingerprintShield: own(o, "fingerprintShield"),
    iocFeeds: own(o, "iocFeeds"),
    iocFeedUrl: own(o, "iocFeedUrl"),
    iocFeedSha256: own(o, "iocFeedSha256"),
    searchMarks: own(o, "searchMarks"),
    liveFeed: own(o, "liveFeed"),
    blockNotificationPrompts: own(o, "blockNotificationPrompts"),
    securityLevel: own(o, "securityLevel"),
    allowlist: own(o, "allowlist"),
    blocklist: own(o, "blocklist"),
    onboardingComplete: own(o, "onboardingComplete"),
    licenseToken: own(o, "licenseToken"),
  });
}

export interface SettingsStore {
  get(): Promise<unknown>;
  set(settings: Settings): Promise<void>;
}

/** Install and update both go through here before rules are applied. Startup does too. */
export async function healStoredSettings(storage: SettingsStore): Promise<Settings> {
  const parsed = migratedSettings(await storage.get());
  const next = applyEntitlements(parsed, await resolveEntitlements(parsed));
  await storage.set(next);
  return next;
}

export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  return {
    threatProtection: asBoolean(own(o, "threatProtection"), true),
    trackerBlocking: asBoolean(own(o, "trackerBlocking"), true),
    phishingProtection: asBoolean(own(o, "phishingProtection"), true),
    localAnalysis: true,
    telemetry: asBoolean(own(o, "telemetry"), false),
    onlineReputation: asBoolean(own(o, "onlineReputation"), false),
    httpsUpgrade: asBoolean(own(o, "httpsUpgrade"), true),
    httpsUpgradePages: asBoolean(own(o, "httpsUpgradePages"), false),
    pageChecks: asBoolean(own(o, "pageChecks"), true),
    downloadProtection: asBoolean(own(o, "downloadProtection"), true),
    stripTrackingParams: asBoolean(own(o, "stripTrackingParams"), true),
    globalPrivacyControl: asBoolean(own(o, "globalPrivacyControl"), true),
    hardenBrowser: asBoolean(own(o, "hardenBrowser"), true),
    cosmeticFiltering: asBoolean(own(o, "cosmeticFiltering"), false),
    overlayProtection: asBoolean(own(o, "overlayProtection"), true),
    filterPackUrl: parseHttpsUrl(typeof own(o, "filterPackUrl") === "string" ? (own(o, "filterPackUrl") as string) : "") ?? "",
    filterPackSha256: parseSha256Pin(typeof own(o, "filterPackSha256") === "string" ? (own(o, "filterPackSha256") as string) : "") ?? "",
    cspReinforce: asBoolean(own(o, "cspReinforce"), false),
    fingerprintShield: asBoolean(own(o, "fingerprintShield"), false),
    iocFeeds: asBoolean(own(o, "iocFeeds"), true),
    iocFeedUrl: parseHttpsUrl(typeof own(o, "iocFeedUrl") === "string" ? (own(o, "iocFeedUrl") as string) : "") ?? "",
    iocFeedSha256: parseSha256Pin(typeof own(o, "iocFeedSha256") === "string" ? (own(o, "iocFeedSha256") as string) : "") ?? "",
    searchMarks: asBoolean(own(o, "searchMarks"), true),
    liveFeed: asBoolean(own(o, "liveFeed"), true),
    blockNotificationPrompts: asBoolean(own(o, "blockNotificationPrompts"), false),
    securityLevel: asLevel(own(o, "securityLevel")),
    allowlist: asHostList(own(o, "allowlist")),
    blocklist: asHostList(own(o, "blocklist")),
    onboardingComplete: asBoolean(own(o, "onboardingComplete"), false),
    licenseToken: asToken(own(o, "licenseToken")),
  };
}

export async function resolveEntitlements(settings: Settings): Promise<Entitlements> {
  const plan = await planFromLicense(settings.licenseToken);
  return entitlementsFor(plan);
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get("settings");
  const parsed = parseSettings(stored.settings);
  const entitlements = await resolveEntitlements(parsed);
  return applyEntitlements(parsed, entitlements);
}

export async function saveSettings(settings: Settings): Promise<void> {
  const entitlements = await resolveEntitlements(settings);
  const next = applyEntitlements(parseSettings(settings), entitlements);
  await chrome.storage.local.set({ settings: next });
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const stored = await chrome.storage.local.get("settings");
  const current = parseSettings(stored.settings);
  const merged = parseSettings({ ...current, ...patch, localAnalysis: true });
  const entitlements = await resolveEntitlements(merged);
  const next = applyEntitlements(merged, entitlements);
  await chrome.storage.local.set({ settings: next });
  return next;
}
