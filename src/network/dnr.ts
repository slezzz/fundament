import {
  DYNAMIC_RULE_ID_ALLOW_START,
  DYNAMIC_RULE_ID_BLOCK_PAGE_START,
  DYNAMIC_RULE_ID_BLOCK_START,
  DYNAMIC_RULE_ID_IOC_PAGE_START,
  DYNAMIC_RULE_ID_IOC_START,
  DYNAMIC_RULE_ID_PACK_START,
  DYNAMIC_RULE_ID_PAUSE_START,
  HTTPS_UPGRADE_PAGES_RULESET_ID,
  HTTPS_UPGRADE_RULESET_ID,
  PRIVACY_HEADERS_RULESET_ID,
  CLICKJACK_HEADERS_RULESET_ID,
  SESSION_RULE_ID_BYPASS_START,
  THREATS_CORE_RULESET_ID,
  THREATS_FEED_RULESET_ID,
  TRACKER_CORE_RULESET_ID,
  ADS_EXTRA_RULESET_ID,
  TRACKER_EXTENDED_RULESET_ID,
  TRACKER_PLUS_RULESET_ID,
  TRACKING_PARAMS_RULESET_ID,
} from "@shared/constants";
import { hostsToDnrRules } from "@engine/filters/abp";

type ResourceType = chrome.declarativeNetRequest.ResourceType;
type Rule = chrome.declarativeNetRequest.Rule;

const SUBRESOURCE_TYPES = [
  "script",
  "xmlhttprequest",
  "image",
  "sub_frame",
  "ping",
  "media",
  "font",
  "stylesheet",
  "websocket",
  "other",
] as ResourceType[];

const PAGE_TYPES = ["main_frame", "sub_frame"] as ResourceType[];
const ALL_TYPES = ["main_frame", ...SUBRESOURCE_TYPES] as ResourceType[];

function push(enable: string[], disable: string[], id: string, on: boolean): void {
  (on ? enable : disable).push(id);
}

export async function applyNetworkRulesets(options: {
  trackerCore: boolean;
  adsExtra: boolean;
  trackerExtended: boolean;
  trackerPlus: boolean;
  httpsUpgrade: boolean;
  httpsUpgradePages: boolean;
  threatsCore: boolean;
  threatsFeed: boolean;
  stripTrackingParams: boolean;
  globalPrivacyControl: boolean;
  clickjackHeaders: boolean;
}): Promise<void> {
  const enableRulesetIds: string[] = [];
  const disableRulesetIds: string[] = [];
  push(enableRulesetIds, disableRulesetIds, TRACKER_CORE_RULESET_ID, options.trackerCore);
  push(enableRulesetIds, disableRulesetIds, ADS_EXTRA_RULESET_ID, options.adsExtra);
  push(enableRulesetIds, disableRulesetIds, TRACKER_EXTENDED_RULESET_ID, options.trackerExtended);
  push(enableRulesetIds, disableRulesetIds, TRACKER_PLUS_RULESET_ID, options.trackerPlus);
  push(enableRulesetIds, disableRulesetIds, HTTPS_UPGRADE_RULESET_ID, options.httpsUpgrade);
  push(enableRulesetIds, disableRulesetIds, HTTPS_UPGRADE_PAGES_RULESET_ID, options.httpsUpgradePages);
  push(enableRulesetIds, disableRulesetIds, THREATS_CORE_RULESET_ID, options.threatsCore);
  push(enableRulesetIds, disableRulesetIds, THREATS_FEED_RULESET_ID, options.threatsFeed);
  push(enableRulesetIds, disableRulesetIds, TRACKING_PARAMS_RULESET_ID, options.stripTrackingParams);
  push(enableRulesetIds, disableRulesetIds, PRIVACY_HEADERS_RULESET_ID, options.globalPrivacyControl);
  push(enableRulesetIds, disableRulesetIds, CLICKJACK_HEADERS_RULESET_ID, options.clickjackHeaders);
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds,
    disableRulesetIds,
  });
}

function warningRedirect(reason: string): chrome.declarativeNetRequest.RuleAction {
  return {
    type: "redirect" as chrome.declarativeNetRequest.RuleActionType,
    redirect: { extensionPath: `/warning.html?blocked=${reason}` },
  };
}

/** Pure builder so the rule layout is unit-testable without Chrome. */
export function buildDynamicRules(
  allowlist: string[],
  blocklist: string[],
  pausedHosts: string[],
  packHosts: string[] = [],
  iocHosts: string[] = [],
): Rule[] {
  const addRules: Rule[] = [];

  blocklist.forEach((host, index) => {
    // Your blocklist: pages go to the warning screen, everything else is cut.
    addRules.push({
      id: DYNAMIC_RULE_ID_BLOCK_PAGE_START + index,
      priority: 6,
      action: warningRedirect("user"),
      condition: { requestDomains: [host], resourceTypes: PAGE_TYPES },
    });
    addRules.push({
      id: DYNAMIC_RULE_ID_BLOCK_START + index,
      priority: 6,
      action: { type: "block" as chrome.declarativeNetRequest.RuleActionType },
      condition: { requestDomains: [host], resourceTypes: SUBRESOURCE_TYPES.filter((t) => t !== "sub_frame") },
    });
  });

  allowlist.forEach((host, index) => {
    // Allowlisted hosts are reachable even if a feed lists them (feed false positives).
    addRules.push({
      id: DYNAMIC_RULE_ID_ALLOW_START + index,
      priority: 100,
      action: { type: "allow" as chrome.declarativeNetRequest.RuleActionType },
      condition: { requestDomains: [host], resourceTypes: ALL_TYPES },
    });
  });

  pausedHosts.forEach((host, index) => {
    addRules.push({
      id: DYNAMIC_RULE_ID_PAUSE_START + index,
      priority: 1000,
      action: { type: "allowAllRequests" as chrome.declarativeNetRequest.RuleActionType },
      condition: { requestDomains: [host], resourceTypes: PAGE_TYPES },
    });
  });

  for (const rule of hostsToDnrRules(packHosts, DYNAMIC_RULE_ID_PACK_START, 200)) {
    addRules.push({
      id: rule.id,
      priority: rule.priority,
      action: { type: "block" as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        domainType: "thirdParty" as chrome.declarativeNetRequest.DomainType,
        requestDomains: rule.condition.requestDomains,
        resourceTypes: SUBRESOURCE_TYPES,
      },
    });
  }

  for (const rule of hostsToDnrRules(iocHosts, DYNAMIC_RULE_ID_IOC_START, 80)) {
    addRules.push({
      id: rule.id,
      priority: 5,
      action: { type: "block" as chrome.declarativeNetRequest.RuleActionType },
      condition: { requestDomains: rule.condition.requestDomains, resourceTypes: SUBRESOURCE_TYPES.filter((t) => t !== "sub_frame") },
    });
    addRules.push({
      id: rule.id - DYNAMIC_RULE_ID_IOC_START + DYNAMIC_RULE_ID_IOC_PAGE_START,
      priority: 5,
      action: warningRedirect("ioc"),
      condition: { requestDomains: rule.condition.requestDomains, resourceTypes: PAGE_TYPES },
    });
  }

  return addRules;
}

export async function syncDynamicLists(
  allowlist: string[],
  blocklist: string[],
  pausedHosts: string[],
  packHosts: string[] = [],
  iocHosts: string[] = [],
): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: buildDynamicRules(allowlist, blocklist, pausedHosts, packHosts, iocHosts),
  });
}

/**
 * "Continue anyway" from a DNR-blocked page: allow that host's pages in this tab only,
 * for this browser session. Subresource blocks on the host stay in force.
 */
export async function allowHostInTab(tabId: number, host: string): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getSessionRules();
  const ids = existing.map((r) => r.id);
  let id = SESSION_RULE_ID_BYPASS_START;
  while (ids.includes(id)) id += 1;
  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id,
        priority: 10_000,
        action: { type: "allow" as chrome.declarativeNetRequest.RuleActionType },
        condition: { requestDomains: [host], resourceTypes: PAGE_TYPES, tabIds: [tabId] },
      },
    ],
  });
}

export async function clearTabBypasses(tabId: number): Promise<void> {
  try {
    const existing = await chrome.declarativeNetRequest.getSessionRules();
    const removeRuleIds = existing.filter((r) => r.condition.tabIds?.includes(tabId)).map((r) => r.id);
    if (removeRuleIds.length > 0) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds });
  } catch {
    /* ignore */
  }
}

export async function countMatchedRules(tabId: number): Promise<number> {
  const slices = await matchedBreakdown(tabId);
  return slices.reduce((sum, slice) => sum + slice.count, 0);
}

export async function matchedBreakdown(tabId: number): Promise<{ rulesetId: string; count: number }[]> {
  try {
    const result = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
    const counts = new Map<string, number>();
    for (const info of result.rulesMatchedInfo) {
      const id = info.rule.rulesetId || "_dynamic";
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([rulesetId, count]) => ({ rulesetId, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}
