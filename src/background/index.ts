import { LocalSecurityAnalyzer } from "@privacy/localAnalyzer";
import { ThreatIntelligenceClient } from "@privacy/threatIntelligence";
import { HttpThreatIntelligence } from "@privacy/httpProvider";
import { NullThreatIntelligence } from "@engine/reputation/null-provider";
import { GatedTelemetryClient } from "@privacy/telemetry";
import { hostOnly } from "@privacy/sanitize";
import { reputationBaseUrl } from "@privacy/remoteConfig";
import { loadSettings, patchSettings } from "@storage/settings";
import { appendEvent, clearEvents, loadEvents } from "@storage/events";
import { deleteTab, emptyTab, getTab, saveTab, type TabRecord } from "@storage/tabs";
import {
  allowHostInTab,
  applyNetworkRulesets,
  clearTabBypasses,
  countMatchedRules,
  matchedBreakdown,
  syncDynamicLists,
} from "@network/dnr";
import { issueSignals, presentAnalysis } from "@engine/status/present";
import { analyzeUrl } from "@engine/analyze";
import { searchHitLabel, unwrapSearchDestination } from "@engine/search/unwrap";
import { mapPool } from "@engine/search/pool";
import { ESCALATING_KINDS, SUBFRAME_KINDS, isPageSignalKind } from "@engine/page/kinds";
import { brandContentSignal, mergeSignals, signalsForPageChecks } from "@engine/page/merge";
import { brandsNamedOnPage } from "@engine/impersonation/detect";
import { attachDownloadProtection } from "./downloads";
import { notifyDownloadBlocked } from "./notify";
import { applyBrowserHardening } from "./privacy";
import { applyNotificationPromptBlock } from "./contentSettings";
import { attachContextMenus } from "./menus";
import { listExtensionRisks } from "./audit";
import { checkExtensions, loadExtensionChanges } from "./extensionWatch";
import { readPosture } from "./posture";
import { liveFeedView, loadLiveFeed, refreshLiveFeed } from "./liveFeed";
import { loadPauses, pauseUntilFor, savePauses, withPause, withoutPause } from "@storage/pauses";
import { bumpStats, loadStats, EMPTY_STATS } from "@storage/stats";
import { clearPack, loadPackHosts, loadPackStatus, savePack, savePackError } from "@storage/pack";
import { fetchHostPack } from "@network/pack";
import { loadIocState } from "@storage/feeds";
import { loadIntegrityStatus } from "@storage/integrity";
import { iocStatusFrom, refreshPinnedIoc, rollbackIoc, seedShippedIoc } from "./feeds";
import { runIntegrityCheck } from "./integrity";
import { PAUSE_MS_DEFAULT } from "@shared/constants";
import { isClientMessage, type ClientMessage, type ServerMessage } from "@shared/messages";
import type { Entitlements, FeedStatusView, PopupState, PostureItem, RiskSignal, SecurityEvent, Settings, UrlAnalysis } from "@shared/types";
import { resolveEntitlements } from "@storage/settings";
import { verifyLicense } from "@billing/license";
import { LICENSE_PUBLIC_KEY_SPKI_B64 } from "@billing/publicKey";
import { licenseActivationAllowed } from "@billing/launch";
import { fetchLicenseRevoked } from "@billing/status";
import { FREE_ENTITLEMENTS } from "@billing/entitlements";
import { WEIGHTS } from "@engine/risk/weights";
import { textSignal } from "@engine/i18n/signal";
import { langFromLocale } from "@engine/i18n/signals";
import { parsePopularList, popularityCheck } from "@engine/reputation/popular";

const httpIntelligence = new HttpThreatIntelligence({ baseUrl: reputationBaseUrl() });
const telemetry = new GatedTelemetryClient(() => telemetryEnabled);

let telemetryEnabled = false;
let eventLimits: Entitlements = FREE_ENTITLEMENTS;
const SERP_TTL_MS = 10 * 60 * 1000;
const ANALYSIS_TTL_MS = 30 * 1000;
const serpCache = new Map<string, { label: string | null; at: number }>();
const analysisCache = new Map<string, { analysis: UrlAnalysis; at: number }>();
const lastSafeLog = new Map<string, number>();

/* ------------------------------------------------------------ popularity list */

type PopularityFn = (registrable: string, hostname?: string) => boolean;
let popularLoad: Promise<PopularityFn> | null = null;

async function packagedText(path: string): Promise<string> {
  const response = await fetch(chrome.runtime.getURL(path));
  return response.ok ? response.text() : "";
}

/** Loaded once per worker life from the packaged lists; never fetched from the network. */
function popularity(): Promise<PopularityFn> {
  if (!popularLoad) {
    popularLoad = Promise.all([packagedText("data/popular-domains.txt"), packagedText("data/hosted-zones.txt")])
      .then(([popularText, zonesText]) => popularityCheck(parsePopularList(popularText), parsePopularList(zonesText)))
      .catch(() => () => false);
  }
  return popularLoad;
}

/* ------------------------------------------------------------------ settings */

let settingsCache: Settings | null = null;

async function currentSettings(): Promise<Settings> {
  if (!settingsCache) settingsCache = await loadSettings();
  return settingsCache;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) {
    settingsCache = null;
    analysisCache.clear();
  }
});

function analyzerFor(settings: Settings): LocalSecurityAnalyzer {
  const inner = settings.onlineReputation ? httpIntelligence : new NullThreatIntelligence();
  return new LocalSecurityAnalyzer({
    intelligence: new ThreatIntelligenceClient(inner),
  });
}

function logEvent(event: Omit<SecurityEvent, "id">): Promise<void> {
  return appendEvent(event, eventLimits);
}

async function applySettings(settings: Settings): Promise<void> {
  settingsCache = settings;
  analysisCache.clear();
  const entitlements = await resolveEntitlements(settings);
  eventLimits = entitlements;
  telemetryEnabled = settings.telemetry;
  await applyNetworkRulesets({
    trackerCore: settings.trackerBlocking,
    adsExtra: settings.trackerBlocking,
    trackerExtended: settings.trackerBlocking && entitlements.extendedTrackers,
    trackerPlus: settings.trackerBlocking && entitlements.plusTrackers,
    httpsUpgrade: settings.httpsUpgrade,
    httpsUpgradePages: settings.httpsUpgradePages,
    threatsCore: settings.threatProtection,
    threatsFeed: settings.threatProtection && settings.iocFeeds,
    stripTrackingParams: settings.stripTrackingParams,
    globalPrivacyControl: settings.globalPrivacyControl,
    clickjackHeaders: settings.cspReinforce,
  });
  const pauses = await loadPauses();
  const packHosts = settings.trackerBlocking && entitlements.filterPack ? await loadPackHosts() : [];
  const iocHosts = settings.iocFeeds && settings.threatProtection ? (await loadIocState()).current?.hosts ?? [] : [];
  const liveHosts = settings.liveFeed && settings.threatProtection ? (await loadLiveFeed()).hosts : [];
  await syncDynamicLists(
    settings.allowlist,
    settings.threatProtection ? settings.blocklist : [],
    pauses.map((p) => p.host),
    packHosts,
    iocHosts,
    liveHosts,
  );
  await applyBrowserHardening(settings.hardenBrowser);
  await applyNotificationPromptBlock(settings.blockNotificationPrompts);
  await syncFingerprintShield(settings.fingerprintShield, settings.allowlist);
}

/* -------------------------------------------- fingerprint shield (MAIN world) */

const SHIELD_ID = "fundament-shield";

/**
 * The shield runs in the page's world, so it is registered only while the setting is on.
 * No page-controlled message can switch it (the old postMessage config could be spoofed).
 */
async function syncFingerprintShield(on: boolean, allowlist: string[]): Promise<void> {
  if (!chrome.scripting?.getRegisteredContentScripts) return;
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SHIELD_ID] });
    if (existing.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [SHIELD_ID] });
    if (!on) return;
    const excludeMatches = allowlist.flatMap((host) => [`*://${host}/*`, `*://*.${host}/*`]);
    await chrome.scripting.registerContentScripts([
      {
        id: SHIELD_ID,
        js: ["content-shield.js"],
        matches: ["http://*/*", "https://*/*"],
        excludeMatches,
        runAt: "document_start",
        world: "MAIN" as chrome.scripting.ExecutionWorld,
        allFrames: true,
        persistAcrossSessions: true,
      },
    ]);
  } catch {
    /* invalid allowlist pattern or older Chrome: shield stays off */
  }
}

/* ------------------------------------------------------------------ analysis */

function isHttpUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Our pages as tabs see them. Always build from the fixed extension id: with web-accessible
 * resources, chrome.runtime.getURL() can return a per-session dynamic origin instead.
 */
function extensionOrigin(): string {
  return `chrome-extension://${chrome.runtime.id}/`;
}

function isOwnPage(url: string | undefined): boolean {
  return Boolean(url && (url.startsWith(extensionOrigin()) || url.startsWith(chrome.runtime.getURL(""))));
}

function isWarningUrl(url: string): boolean {
  return isOwnPage(url) && /^chrome-extension:\/\/[^/]+\/warning\.html/.test(url);
}

function warningPageUrl(tabId: number): string {
  return `${extensionOrigin()}warning.html?tab=${tabId}`;
}

function siteKey(analysis: UrlAnalysis | null, url: string): string {
  return analysis?.domain?.registrableDomain ?? hostOnly(url);
}

async function analyze(url: string, settings: Settings): Promise<UrlAnalysis> {
  const cached = analysisCache.get(url);
  if (cached && Date.now() - cached.at < ANALYSIS_TTL_MS) return cached.analysis;
  const analysis = await analyzerFor(settings).analyze({
    url,
    allowlist: settings.allowlist,
    blocklist: settings.blocklist,
    phishingProtection: settings.phishingProtection,
    threatProtection: settings.threatProtection,
    securityLevel: settings.securityLevel,
    isPopular: await popularity(),
  });
  analysisCache.set(url, { analysis, at: Date.now() });
  if (analysisCache.size > 300) {
    for (const key of [...analysisCache.keys()].slice(0, 100)) analysisCache.delete(key);
  }
  return analysis;
}

async function shouldWarn(record: TabRecord, analysis: UrlAnalysis, settings: Settings, url: string): Promise<boolean> {
  if (!settings.threatProtection || analysis.allowlisted) return false;
  if (analysis.band !== "high" && analysis.band !== "critical") return false;
  const key = siteKey(analysis, url);
  if (record.continuedHost && record.continuedHost === key) return false;
  return pauseUntilFor(await loadPauses(), key) === null;
}

async function showWarning(tabId: number, record: TabRecord, analysis: UrlAnalysis, url: string): Promise<void> {
  record.interstitial = true;
  record.analysis = analysis;
  record.url = url;
  record.threats += 1;
  await saveTab(tabId, record);
  telemetry.record("warning_shown");
  await bumpStats({ threats: 1 });
  await logEvent({ type: "threat_blocked", host: siteKey(analysis, url), at: Date.now(), score: analysis.score });
  await chrome.tabs.update(tabId, { url: warningPageUrl(tabId) });
}

/** Before the request leaves: warn as early as the local engine allows. */
async function onBeforeNavigate(tabId: number, url: string): Promise<void> {
  const settings = await currentSettings();
  const record = (await getTab(tabId)) ?? emptyTab();
  if (record.continuedHost && record.continuedHost !== hostOnly(url) && !hostOnly(url).endsWith(`.${record.continuedHost}`)) {
    record.continuedHost = "";
  }
  record.pendingUrl = url;
  record.blockedBy = "";
  await saveTab(tabId, record);
  if (!settings.localAnalysis || (!settings.phishingProtection && !settings.threatProtection)) return;
  const analysis = await analyze(url, settings);
  if (await shouldWarn(record, analysis, settings, url)) {
    await showWarning(tabId, record, analysis, url);
  }
}

async function onCommitted(tabId: number, url: string): Promise<void> {
  const settings = await currentSettings();
  const record = (await getTab(tabId)) ?? emptyTab(url);
  record.url = url;
  record.pendingUrl = "";
  record.connections += 1;

  if (!settings.localAnalysis || (!settings.phishingProtection && !settings.threatProtection)) {
    record.analysis = null;
    await saveTab(tabId, record);
    return;
  }

  const analysis = await analyze(url, settings);
  if (record.interstitial && record.analysis?.url === analysis.url) {
    // onBeforeNavigate already sent this tab to the warning page.
    await saveTab(tabId, record);
    return;
  }
  record.analysis = analysis;

  try {
    const matched = await countMatchedRules(tabId);
    if (matched > record.trackers) {
      await bumpStats({ trackers: matched - record.trackers });
      if (record.trackers === 0) {
        await logEvent({ type: "tracker_blocked", host: siteKey(analysis, url), at: Date.now() });
      }
    }
    record.trackers = matched;
  } catch {
    /* internal pages */
  }

  if (await shouldWarn(record, analysis, settings, url)) {
    await showWarning(tabId, record, analysis, url);
    return;
  }
  record.interstitial = false;
  await saveTab(tabId, record);
  await maybeLog(analysis);
  await updateBadge(tabId, analysis);
}

/** Single-page apps change the path without a new document (…/login, …/verify). */
async function onHistoryChange(tabId: number, url: string): Promise<void> {
  const settings = await currentSettings();
  if (!settings.localAnalysis || (!settings.phishingProtection && !settings.threatProtection)) return;
  const record = (await getTab(tabId)) ?? emptyTab(url);
  const pageSignals = (record.analysis?.signals ?? []).filter((s) => PAGE_SIGNAL_IDS.has(s.id));
  let analysis = await analyze(url, settings);
  if (pageSignals.length > 0) analysis = mergeSignals(analysis, pageSignals, settings.securityLevel);
  record.url = url;
  record.analysis = analysis;
  if (await shouldWarn(record, analysis, settings, url)) {
    await showWarning(tabId, record, analysis, url);
    return;
  }
  await saveTab(tabId, record);
  await updateBadge(tabId, analysis);
}

const PAGE_SIGNAL_IDS = new Set<string>([
  ...["password-http", "insecure-form", "overlay-clickjack", "permission-bait", "wallet-http", "seed-form", "api-key-field"],
  ...["clickfix-clipboard", "fullscreen-trap", "cross-origin-login", "mixed-content", "weak-csp", "cookie-flags"],
  ...["obfuscated-js", "prototype-pollution", "dom-xss", "prompt-injection", "quishing", "miner-wasm"],
  ...["fingerprint-canvas", "fingerprint-audio", "malvertising-chain", "login-form", "card-form", "brand-content"],
  ...["browser-in-browser", "tech-support-scam", "keyboard-lock", "hidden-autofill", "clipboard-hijack", "wallet-drainer"],
]);

async function maybeLog(analysis: UrlAnalysis): Promise<void> {
  const host = analysis.domain?.registrableDomain ?? hostOnly(analysis.url);
  if (!host) return;
  if (analysis.band === "critical" || analysis.band === "high") {
    await logEvent({ type: "threat_blocked", host, at: Date.now(), score: analysis.score });
    return;
  }
  if (analysis.band === "suspicious" || issueSignals(analysis).length > 0) {
    await logEvent({ type: "site_suspicious", host, at: Date.now(), score: analysis.score });
    return;
  }
  if (analysis.band === "safe") {
    const prev = lastSafeLog.get(host) ?? 0;
    if (Date.now() - prev > 24 * 60 * 60 * 1000) {
      lastSafeLog.set(host, Date.now());
      await logEvent({ type: "site_safe", host, at: Date.now(), score: analysis.score });
    }
  }
}

async function updateBadge(tabId: number, analysis: UrlAnalysis): Promise<void> {
  const status = presentAnalysis(analysis, true);
  const color = status.tone === "danger" ? "#C45C4A" : status.tone === "warn" ? "#C4A35A" : "#3D9A6A";
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    await chrome.action.setBadgeText({ tabId, text: status.tone === "safe" || status.tone === "idle" ? "" : "!" });
  } catch {
    /* tab closed */
  }
}

/* ---------------------------------------------------------- DNR-blocked pages */

function blockedSignal(reason: string): RiskSignal {
  const key = /^(feed|ioc|threat|user)$/.test(reason) ? `blocked-${reason}` : "blocked-feed";
  return textSignal("known-malicious", key, reason === "user" ? WEIGHTS.userBlocklist + 30 : WEIGHTS.knownMaliciousHost, "fail");
}

async function blockedAnalysis(tabId: number, reason: string): Promise<UrlAnalysis | null> {
  const record = await getTab(tabId);
  const url = record?.pendingUrl || record?.url || "";
  if (!record || !isHttpUrl(url)) return record?.analysis ?? null;
  if (record.blockedBy === reason && record.analysis?.url === url) return record.analysis;
  const settings = await currentSettings();
  const base = await analyze(url, settings);
  const analysis = mergeSignals({ ...base, allowlisted: false }, [blockedSignal(reason)], settings.securityLevel);
  record.analysis = analysis;
  record.url = url;
  record.blockedBy = reason;
  record.interstitial = true;
  record.threats += 1;
  await saveTab(tabId, record);
  await bumpStats({ threats: 1 });
  await logEvent({ type: "page_blocked", host: siteKey(analysis, url), at: Date.now(), score: analysis.score });
  return analysis;
}

/* ------------------------------------------------------------------ popup */

async function postureAlerts(): Promise<PostureItem[]> {
  try {
    return (await readPosture()).filter((item) => item.status === "fail" || item.status === "warn");
  } catch {
    return [];
  }
}

async function popupState(tab: chrome.tabs.Tab | undefined): Promise<PopupState> {
  const settings = await currentSettings();
  const entitlements = await resolveEntitlements(settings);
  const tabId = tab?.id ?? null;
  const record = tabId !== null ? await getTab(tabId) : undefined;
  const host = record?.analysis?.domain?.registrableDomain ?? (record?.url ? hostOnly(record.url) : null);
  const pauses = await loadPauses().catch(() => []);
  const lifetime = await loadStats().catch(() => ({ ...EMPTY_STATS }));
  return {
    settings,
    analysis: record?.analysis ?? null,
    tabId,
    tabTitle: tab?.title ?? null,
    connectionsChecked: record?.connections ?? 0,
    trackersBlocked: record?.trackers ?? 0,
    threatsDetected: record?.threats ?? 0,
    reputationAvailable: record?.analysis?.reputationAvailable ?? false,
    plan: entitlements.plan,
    entitlements,
    lifetime,
    pausedUntil: pauseUntilFor(pauses, host),
    blockedSlices: tabId !== null ? await matchedBreakdown(tabId) : [],
    filterPack: await loadPackStatus().catch(() => ({ hostCount: 0, updatedAt: null, sha256: "", error: null })),
    iocFeed: iocStatusFrom(await loadIocState().catch(() => ({ current: null, previous: null, error: null }))),
    integrity: await loadIntegrityStatus().catch(() => ({ ok: true, detail: "Integrity has not been checked yet.", fingerprint: "" })),
    postureAlerts: await postureAlerts(),
  };
}

/* ------------------------------------------------------------------ page checks */

function cleanHints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\s+/g, " ").trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, 12);
}

const CREDENTIAL_KINDS = new Set(["login-form", "card-form", "seed-form", "api-key-field", "cross-origin-login"]);

async function onPageCheck(
  message: Extract<ClientMessage, { type: "PAGE_CHECK" }>,
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  const tabId = sender.tab?.id;
  const tabUrl = sender.tab?.url;
  if (tabId === undefined || !tabUrl || !isHttpUrl(tabUrl)) return;
  const settings = await currentSettings();
  if (!settings.pageChecks && !settings.overlayProtection) return;

  const subframe = (sender.frameId ?? 0) > 0;
  let kinds = (Array.isArray(message.kinds) ? message.kinds : [])
    .filter((k): k is string => typeof k === "string")
    .filter(isPageSignalKind)
    .filter((k) => !subframe || SUBFRAME_KINDS.has(k));
  if (!settings.pageChecks) kinds = kinds.filter((k) => k === "overlay-clickjack" || k === "permission-bait");
  if (!settings.overlayProtection) kinds = kinds.filter((k) => k !== "overlay-clickjack" && k !== "permission-bait");
  if (kinds.length === 0) return;

  const record = await getTab(tabId);
  if (!record?.analysis || (record.analysis.url !== tabUrl && hostOnly(record.analysis.url) !== hostOnly(tabUrl))) return;

  const extra = signalsForPageChecks(kinds);
  const hasCredential =
    kinds.some((k) => CREDENTIAL_KINDS.has(k)) || record.analysis.signals.some((s) => CREDENTIAL_KINDS.has(s.id));
  const hints = subframe ? [] : cleanHints(message.hints);
  if (settings.phishingProtection && hasCredential && hints.length > 0 && record.analysis.domain) {
    const named = brandsNamedOnPage(hints, record.analysis.domain);
    if (named[0]) extra.push(brandContentSignal(named[0].name, record.analysis.domain.registrableDomain));
  }

  const before = record.analysis.band;
  record.analysis = mergeSignals(record.analysis, extra, settings.securityLevel);
  const escalate = kinds.some((k) => ESCALATING_KINDS.has(k));
  const url = record.analysis.url;
  if (!record.interstitial && (escalate || record.analysis.band !== before)) {
    const warn =
      (await shouldWarn(record, record.analysis, settings, url)) ||
      (escalate && settings.threatProtection && !record.analysis.allowlisted && record.continuedHost !== siteKey(record.analysis, url));
    if (warn) {
      await showWarning(tabId, record, record.analysis, url);
      return;
    }
  }
  await saveTab(tabId, record);
  await updateBadge(tabId, record.analysis);
}

/* ------------------------------------------------------------------ messages */

async function onMessage(message: ClientMessage, sender: chrome.runtime.MessageSender): Promise<ServerMessage> {
  if (sender.id && sender.id !== chrome.runtime.id) {
    return { type: "ERROR", message: "untrusted sender" };
  }

  const fromExtensionPage = isOwnPage(sender.url);
  if (message.type === "PAGE_CHECK" || message.type === "SEARCH_MARK") {
    if (!sender.tab) return { type: "ERROR", message: "untrusted sender" };
  } else if (sender.tab && !fromExtensionPage) {
    return { type: "ERROR", message: "untrusted sender" };
  }

  switch (message.type) {
    case "GET_POPUP_STATE": {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return { type: "POPUP_STATE", state: await popupState(tab) };
      } catch (error) {
        return { type: "ERROR", message: error instanceof Error ? error.message : "Could not read tab state" };
      }
    }
    case "GET_TAB_ANALYSIS": {
      if (typeof message.tabId !== "number") return { type: "ERROR", message: "Missing tab" };
      if (typeof message.blocked === "string" && /^(feed|ioc|threat|user)$/.test(message.blocked)) {
        return { type: "TAB_ANALYSIS", analysis: await blockedAnalysis(message.tabId, message.blocked) };
      }
      const record = await getTab(message.tabId);
      return { type: "TAB_ANALYSIS", analysis: record?.analysis ?? null };
    }
    case "UPDATE_SETTINGS": {
      const settings = await patchSettings(message.patch);
      if (message.patch.filterPackUrl !== undefined || message.patch.filterPackSha256 !== undefined) {
        await refreshFilterPack(settings);
      }
      const next = await loadSettings();
      await applySettings(next);
      return { type: "SETTINGS", settings: next };
    }
    case "GET_HISTORY":
      return { type: "HISTORY", events: await loadEvents(eventLimits) };
    case "CLEAR_HISTORY":
      await clearEvents();
      return { type: "OK" };
    case "ADD_ALLOWLIST":
      return (await addToList("allowlist", message.host)) ?? { type: "OK" };
    case "REMOVE_ALLOWLIST": {
      const settings = await loadSettings();
      await patchSettings({ allowlist: settings.allowlist.filter((h) => h !== message.host) });
      await applySettings(await loadSettings());
      return { type: "OK" };
    }
    case "ADD_BLOCKLIST":
      return (await addToList("blocklist", message.host)) ?? { type: "OK" };
    case "REMOVE_BLOCKLIST": {
      const settings = await loadSettings();
      await patchSettings({ blocklist: settings.blocklist.filter((h) => h !== message.host) });
      await applySettings(await loadSettings());
      return { type: "OK" };
    }
    case "GO_BACK": {
      const record = await getTab(message.tabId);
      if (record) {
        record.interstitial = false;
        record.pendingUrl = "";
        await saveTab(message.tabId, record);
      }
      await logEvent({ type: "user_went_back", host: record?.analysis?.domain?.registrableDomain ?? "unknown", at: Date.now() });
      try {
        await chrome.tabs.goBack(message.tabId);
      } catch {
        await chrome.tabs.update(message.tabId, { url: "chrome://newtab/" });
      }
      return { type: "OK" };
    }
    case "CONTINUE_TO_SITE": {
      const record = await getTab(message.tabId);
      const url = record?.url;
      if (!record || !url || !isHttpUrl(url)) {
        return { type: "ERROR", message: "No original address to continue to." };
      }
      record.interstitial = false;
      record.continuedHost = siteKey(record.analysis, url);
      if (record.blockedBy) {
        await allowHostInTab(message.tabId, hostOnly(url));
      }
      await saveTab(message.tabId, record);
      telemetry.record("user_continued");
      await logEvent({ type: "user_continued", host: record.continuedHost, at: Date.now(), score: record.analysis?.score });
      await chrome.tabs.update(message.tabId, { url });
      return { type: "OK" };
    }
    case "PAUSE_SITE": {
      if (!message.host) return { type: "ERROR", message: "Missing host" };
      const minutes = Number.isFinite(message.minutes) ? Math.min(Math.max(message.minutes, 1), 120) : 15;
      await savePauses(withPause(await loadPauses(), message.host, Date.now() + minutes * 60 * 1000));
      await applySettings(await loadSettings());
      return { type: "OK" };
    }
    case "RESUME_SITE":
      await savePauses(withoutPause(await loadPauses(), message.host));
      await applySettings(await loadSettings());
      return { type: "OK" };
    case "PAGE_CHECK":
      await onPageCheck(message, sender);
      return { type: "OK" };
    case "SEARCH_MARK":
      return searchMarks(message.hrefs);
    case "GET_EXTENSION_AUDIT":
      return { type: "EXTENSION_AUDIT", items: await listExtensionRisks(), changes: await loadExtensionChanges() };
    case "GET_FEED_STATUS":
      return { type: "FEED_STATUS", status: await feedStatus() };
    case "REFRESH_LIVE_FEED":
      await updateLiveFeed();
      return { type: "FEED_STATUS", status: await feedStatus() };
    case "GET_POSTURE":
      return { type: "POSTURE", items: await readPosture() };
    case "OPEN_SETTINGS_PAGE": {
      const url = String(message.url ?? "");
      if (!/^chrome:\/\/(settings|extensions)(\/[a-z0-9/-]*)?$/i.test(url)) return { type: "ERROR", message: "Not allowed" };
      await chrome.tabs.create({ url });
      return { type: "OK" };
    }
    case "REFRESH_FILTER_PACK":
      await refreshFilterPack(await loadSettings());
      await applySettings(await loadSettings());
      return { type: "OK" };
    case "REFRESH_IOC_FEED": {
      const settings = await loadSettings();
      if (!settings.iocFeeds) return { type: "ERROR", message: "IOC feeds are turned off." };
      const before = await loadIocState();
      const next = settings.iocFeedUrl
        ? await refreshPinnedIoc(settings.iocFeedUrl, settings.iocFeedSha256)
        : await seedShippedIoc(true);
      if (next.current && next.current.sha256 !== before.current?.sha256) {
        await logEvent({ type: "feed_updated", host: next.current.source.slice(0, 253), at: Date.now() });
      }
      await applySettings(await loadSettings());
      return { type: "OK" };
    }
    case "ROLLBACK_IOC_FEED": {
      const next = await rollbackIoc();
      if (next.current) {
        await logEvent({ type: "feed_rolled_back", host: next.current.source.slice(0, 253), at: Date.now() });
      }
      await applySettings(await loadSettings());
      return { type: "OK" };
    }
    case "COMPLETE_ONBOARDING":
      await patchSettings({ onboardingComplete: true });
      settingsCache = null;
      return { type: "OK" };
    case "ACTIVATE_LICENSE": {
      if (!licenseActivationAllowed(LICENSE_PUBLIC_KEY_SPKI_B64)) {
        return { type: "ERROR", message: "Paid licenses are not enabled in this build." };
      }
      const claims = await verifyLicense(message.token);
      if (!claims) return { type: "ERROR", message: "That license is not valid." };
      if (claims.ext && claims.ext !== chrome.runtime.id) {
        return { type: "ERROR", message: "That license is bound to another Fundament install." };
      }
      if (await fetchLicenseRevoked(claims.sid, claims.sub)) {
        return { type: "ERROR", message: "That license was refunded or cancelled." };
      }
      const settings = await patchSettings({ licenseToken: message.token.trim() });
      await applySettings(settings);
      return { type: "SETTINGS", settings };
    }
    case "DEACTIVATE_LICENSE": {
      const settings = await patchSettings({ licenseToken: "", onlineReputation: false, securityLevel: "standard" });
      await applySettings(settings);
      return { type: "SETTINGS", settings };
    }
    default:
      return { type: "ERROR", message: "Unknown message" };
  }
}

async function addToList(list: "allowlist" | "blocklist", raw: unknown): Promise<ServerMessage | null> {
  const host = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!host || host.length > 253) return { type: "ERROR", message: "Missing host" };
  const settings = await loadSettings();
  const entitlements = await resolveEntitlements(settings);
  if (settings[list].includes(host)) return null;
  if (settings[list].length >= entitlements.maxListEntries) {
    return {
      type: "ERROR",
      message: list === "allowlist" ? "Allowlist limit reached. Upgrade to Pro for more." : "Blocklist limit reached. Upgrade to Pro for more.",
    };
  }
  await patchSettings({ [list]: [...settings[list], host] } as Partial<Settings>);
  await applySettings(await loadSettings());
  return null;
}

async function searchMarks(rawHrefs: unknown): Promise<ServerMessage> {
  const settings = await currentSettings();
  if (!settings.searchMarks || !settings.phishingProtection || !Array.isArray(rawHrefs)) {
    return { type: "SEARCH_MARKS", marks: [] };
  }
  const hrefs = rawHrefs
    .filter((href): href is string => typeof href === "string" && href.length > 8 && href.length <= 2000)
    .slice(0, 24);
  const jobs: { href: string; dest: string }[] = [];
  const seenDest = new Set<string>();
  for (const href of hrefs) {
    const dest = unwrapSearchDestination(href);
    if (!dest || seenDest.has(dest)) continue;
    seenDest.add(dest);
    jobs.push({ href, dest });
  }
  const now = Date.now();
  const labeled = await mapPool(jobs, 6, async ({ href, dest }) => {
    const cached = serpCache.get(dest);
    let label: string | null;
    if (cached && now - cached.at < SERP_TTL_MS) {
      label = cached.label;
    } else {
      const analysis = await analyzeUrl({
        url: dest,
        blocklist: settings.blocklist,
        allowlist: settings.allowlist,
        phishingProtection: true,
        threatProtection: settings.threatProtection,
        securityLevel: settings.securityLevel,
        isPopular: await popularity(),
      });
      label = analysis.allowlisted ? null : searchHitLabel(analysis.signals, analysis.score, langFromLocale(chrome.i18n?.getUILanguage?.()));
      serpCache.set(dest, { label, at: now });
      if (serpCache.size > 400) {
        for (const key of [...serpCache.keys()].slice(0, 80)) serpCache.delete(key);
      }
    }
    return label ? { href, label } : null;
  });
  return { type: "SEARCH_MARKS", marks: labeled.filter((row): row is { href: string; label: string } => row !== null) };
}

/* ------------------------------------------------------------------ lifecycle */

const ALARMS: { name: string; periodInMinutes: number }[] = [
  { name: "fundament-prune", periodInMinutes: 60 },
  { name: "fundament-filter-pack", periodInMinutes: 24 * 60 },
  { name: "fundament-license", periodInMinutes: 6 * 60 },
  { name: "fundament-integrity", periodInMinutes: 12 * 60 },
  { name: "fundament-ioc", periodInMinutes: 24 * 60 },
  { name: "fundament-extensions", periodInMinutes: 6 * 60 },
  { name: "fundament-posture", periodInMinutes: 12 * 60 },
  { name: "fundament-live-feed", periodInMinutes: 6 * 60 },
];

/**
 * chrome.alarms.create() with an existing name *replaces* the alarm and restarts its
 * timer. Calling it on every service-worker wake meant daily jobs never fired.
 */
async function ensureAlarms(): Promise<void> {
  for (const alarm of ALARMS) {
    const existing = await chrome.alarms.get(alarm.name);
    if (!existing || existing.periodInMinutes !== alarm.periodInMinutes) {
      await chrome.alarms.create(alarm.name, { periodInMinutes: alarm.periodInMinutes, delayInMinutes: 1 });
    }
  }
}

async function onExtensionChange(): Promise<void> {
  await checkExtensions(async (change) => {
    await logEvent({ type: "extension_changed", host: change.name.slice(0, 253), at: change.at });
    if (change.severity === "critical") {
      await chrome.action.setBadgeText({ text: "!" });
      await chrome.action.setBadgeBackgroundColor({ color: "#C45C4A" });
    }
  }).catch(() => []);
}

async function boot(reason: "install" | "startup"): Promise<void> {
  const integrity = await runIntegrityCheck(reason);
  if (!integrity.ok) await logEvent({ type: "integrity_alert", host: "extension", at: Date.now() });
  await seedShippedIoc();
  await applySettings(await loadSettings());
  await enforceLicense();
  await ensureAlarms();
  await onExtensionChange();
  await updateLiveFeed();
}

async function feedStatus(): Promise<FeedStatusView> {
  let shippedHosts = 0;
  try {
    const meta = (await (await fetch(chrome.runtime.getURL("data/threats-feed.meta.json"))).json()) as { hostCount?: number };
    shippedHosts = Number(meta.hostCount) || 0;
  } catch {
    /* meta missing in dev builds */
  }
  return { shippedHosts, live: liveFeedView(await loadLiveFeed()) };
}

async function updateLiveFeed(): Promise<void> {
  const settings = await loadSettings();
  if (!settings.liveFeed) return;
  const before = await loadLiveFeed();
  const after = await refreshLiveFeed(await popularity());
  if (after.version !== before.version) {
    await logEvent({ type: "feed_updated", host: `live feed v${after.version}`, at: Date.now() });
    await applySettings(await loadSettings());
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await boot("install");
  const settings = await loadSettings();
  if (details.reason === "install" && !settings.onboardingComplete) {
    await chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
});

chrome.runtime.onStartup.addListener(() => {
  void boot("startup");
});

void ensureAlarms();

async function dropLicense(): Promise<void> {
  const settings = await patchSettings({ licenseToken: "", onlineReputation: false, securityLevel: "standard" });
  await applySettings(settings);
}

async function enforceLicense(): Promise<void> {
  const settings = await loadSettings();
  if (!licenseActivationAllowed(LICENSE_PUBLIC_KEY_SPKI_B64)) {
    if (settings.licenseToken) await dropLicense();
    return;
  }
  if (!settings.licenseToken) return;
  const claims = await verifyLicense(settings.licenseToken);
  if (!claims || (claims.ext && claims.ext !== chrome.runtime.id)) {
    await dropLicense();
    return;
  }
  if (await fetchLicenseRevoked(claims.sid, claims.sub)) await dropLicense();
}

async function refreshFilterPack(settings: Settings): Promise<void> {
  if (!settings.filterPackUrl || !settings.filterPackSha256) {
    await clearPack();
    return;
  }
  const result = await fetchHostPack(settings.filterPackUrl, settings.filterPackSha256);
  if (!result.ok) {
    await savePackError(result.error);
    return;
  }
  await savePack(result.hosts, result.sha256);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case "fundament-prune":
      await loadEvents(eventLimits);
      await savePauses(await loadPauses());
      await applySettings(await loadSettings());
      break;
    case "fundament-filter-pack":
      await refreshFilterPack(await loadSettings());
      await applySettings(await loadSettings());
      break;
    case "fundament-license":
      await enforceLicense();
      break;
    case "fundament-integrity": {
      const integrity = await runIntegrityCheck("startup");
      if (!integrity.ok) await logEvent({ type: "integrity_alert", host: "extension", at: Date.now() });
      break;
    }
    case "fundament-ioc": {
      const settings = await loadSettings();
      if (settings.iocFeeds) {
        if (settings.iocFeedUrl) await refreshPinnedIoc(settings.iocFeedUrl, settings.iocFeedSha256);
        else await seedShippedIoc();
        await applySettings(await loadSettings());
      }
      break;
    }
    case "fundament-extensions":
      await onExtensionChange();
      break;
    case "fundament-live-feed":
      await updateLiveFeed();
      break;
    case "fundament-posture":
      await readPosture().catch(() => []);
      break;
    default:
      break;
  }
});

/* ------------------------------------------------------------------ navigation */

chrome.tabs.onRemoved.addListener((tabId) => {
  void deleteTab(tabId);
  void clearTabBypasses(tabId);
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0 || details.tabId < 0) return;
  if (!isHttpUrl(details.url)) return;
  void onBeforeNavigate(details.tabId, details.url);
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0 || details.tabId < 0) return;
  if (isWarningUrl(details.url)) return;
  if (!isHttpUrl(details.url)) {
    void (async () => {
      const record = (await getTab(details.tabId)) ?? emptyTab();
      record.analysis = null;
      record.url = details.url;
      await saveTab(details.tabId, record);
    })();
    return;
  }
  void onCommitted(details.tabId, details.url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0 || details.tabId < 0 || !isHttpUrl(details.url)) return;
  void onHistoryChange(details.tabId, details.url);
});

async function analysisForPage(url: string): Promise<UrlAnalysis | null> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id !== undefined && tab.url === url) {
        const record = await getTab(tab.id);
        if (record?.analysis) return record.analysis;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

attachDownloadProtection(currentSettings, analysisForPage, popularity, async (host, reason) => {
  await bumpStats({ downloads: 1 });
  await logEvent({ type: "download_blocked", host, at: Date.now() });
  notifyDownloadBlocked(host, reason);
});

attachContextMenus({
  allow: async (host) => {
    await addToList("allowlist", host);
  },
  block: async (host) => {
    await addToList("blocklist", host);
  },
  pause: async (host) => {
    await savePauses(withPause(await loadPauses(), host, Date.now() + PAUSE_MS_DEFAULT));
    await applySettings(await loadSettings());
  },
});

if (chrome.management?.onInstalled) {
  chrome.management.onInstalled.addListener((info) => {
    if (info.type !== "extension" || info.id === chrome.runtime.id) return;
    void onExtensionChange();
  });
  chrome.management.onEnabled?.addListener((info) => {
    if (info.type !== "extension" || info.id === chrome.runtime.id) return;
    void onExtensionChange();
  });
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isClientMessage(message)) {
    sendResponse({ type: "ERROR", message: "Invalid message" } satisfies ServerMessage);
    return false;
  }
  void onMessage(message, sender)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({ type: "ERROR", message: error instanceof Error ? error.message : "Worker failed" } satisfies ServerMessage);
    });
  return true;
});

chrome.runtime.onConnectExternal.addListener((port) => {
  port.disconnect();
});

chrome.runtime.onMessageExternal.addListener((message: unknown, sender, sendResponse) => {
  if (!isClientMessage(message) || message.type !== "ACTIVATE_LICENSE") {
    sendResponse({ type: "ERROR", message: "unsupported" } satisfies ServerMessage);
    return false;
  }
  const trusted: chrome.runtime.MessageSender = {
    ...sender,
    id: chrome.runtime.id,
    url: `${extensionOrigin()}popup.html`,
  };
  void onMessage(message, trusted)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({ type: "ERROR", message: error instanceof Error ? error.message : "Worker failed" } satisfies ServerMessage);
    });
  return true;
});
