import { MAX_LIST_ENTRIES } from "@shared/constants";
import { parseHttpsUrl, parseSha256Pin } from "@engine/filters/abp";
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
    const host = item.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
    if (!host || host.length > 253) continue;
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

export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  return {
    threatProtection: asBoolean(o.threatProtection, true),
    trackerBlocking: asBoolean(o.trackerBlocking, true),
    phishingProtection: asBoolean(o.phishingProtection, true),
    localAnalysis: true,
    telemetry: asBoolean(o.telemetry, false),
    onlineReputation: asBoolean(o.onlineReputation, false),
    httpsUpgrade: asBoolean(o.httpsUpgrade, true),
    httpsUpgradePages: asBoolean(o.httpsUpgradePages, false),
    pageChecks: asBoolean(o.pageChecks, true),
    downloadProtection: asBoolean(o.downloadProtection, true),
    stripTrackingParams: asBoolean(o.stripTrackingParams, true),
    globalPrivacyControl: asBoolean(o.globalPrivacyControl, true),
    hardenBrowser: asBoolean(o.hardenBrowser, true),
    cosmeticFiltering: asBoolean(o.cosmeticFiltering, false),
    overlayProtection: asBoolean(o.overlayProtection, true),
    filterPackUrl: parseHttpsUrl(typeof o.filterPackUrl === "string" ? o.filterPackUrl : "") ?? "",
    filterPackSha256: parseSha256Pin(typeof o.filterPackSha256 === "string" ? o.filterPackSha256 : "") ?? "",
    cspReinforce: asBoolean(o.cspReinforce, false),
    fingerprintShield: asBoolean(o.fingerprintShield, false),
    iocFeeds: asBoolean(o.iocFeeds, true),
    iocFeedUrl: parseHttpsUrl(typeof o.iocFeedUrl === "string" ? o.iocFeedUrl : "") ?? "",
    iocFeedSha256: parseSha256Pin(typeof o.iocFeedSha256 === "string" ? o.iocFeedSha256 : "") ?? "",
    searchMarks: asBoolean(o.searchMarks, true),
    liveFeed: asBoolean(o.liveFeed, true),
    blockNotificationPrompts: asBoolean(o.blockNotificationPrompts, false),
    securityLevel: asLevel(o.securityLevel),
    allowlist: asHostList(o.allowlist),
    blocklist: asHostList(o.blocklist),
    onboardingComplete: asBoolean(o.onboardingComplete, false),
    licenseToken: asToken(o.licenseToken),
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
