import { parseHttpsUrl, parseSha256Pin } from "@engine/filters/abp";
import { isPageSignalKind } from "@engine/page/kinds";
import { MAX_LIST_ENTRIES } from "./constants";
import type { ClientMessage } from "./messages";
import type { Settings } from "./types";

/**
 * Turns an untrusted runtime message into a fresh object with only known fields.
 * Inherited `type` values, extra keys, and `__proto__` do not come through.
 * The worker must use the returned object, not the original.
 */

const BOOL_KEYS = [
  "threatProtection",
  "trackerBlocking",
  "phishingProtection",
  "telemetry",
  "onlineReputation",
  "httpsUpgrade",
  "httpsUpgradePages",
  "pageChecks",
  "downloadProtection",
  "stripTrackingParams",
  "globalPrivacyControl",
  "hardenBrowser",
  "cosmeticFiltering",
  "overlayProtection",
  "cspReinforce",
  "fingerprintShield",
  "iocFeeds",
  "liveFeed",
  "searchMarks",
  "blockNotificationPrompts",
  "onboardingComplete",
] as const satisfies readonly (keyof Settings)[];

const NO_FIELDS = new Set<ClientMessage["type"]>([
  "GET_HISTORY",
  "CLEAR_HISTORY",
  "DEACTIVATE_LICENSE",
  "GET_EXTENSION_AUDIT",
  "REFRESH_FILTER_PACK",
  "COMPLETE_ONBOARDING",
  "ROLLBACK_IOC_FEED",
  "REFRESH_IOC_FEED",
  "GET_FEED_STATUS",
  "REFRESH_LIVE_FEED",
]);

const BLOCKED = new Set(["feed", "ioc", "threat", "user"]);
const SETTINGS_URL = /^chrome:\/\/(settings|extensions)(\/[a-z0-9/-]*)?$/i;
const LICENSE_TOKEN = /^fundament1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export interface GateSender {
  id?: string;
  url?: string;
  hasTab: boolean;
}

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function own(source: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(source, key) ? source[key] : undefined;
}

function tabId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2_147_483_647) return null;
  return value;
}

function hostField(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  const host = value.trim().toLowerCase();
  if (host.length === 0 || host.length > 253) return null;
  if (/[\s/?#@\\]/.test(host)) return null;
  for (let i = 0; i < host.length; i++) {
    const code = host.charCodeAt(i);
    if (code <= 31 || code === 127) return null;
  }
  return host;
}

function httpUrl(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length < 9 || value.length > max) return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) return null;
  return value;
}

function limited<T>(value: unknown, max: number, map: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  const n = Math.min(value.length, max);
  for (let i = 0; i < n; i++) {
    const item = map(value[i]);
    if (item !== null) out.push(item);
  }
  return out;
}

function settingsPatch(value: unknown): Partial<Settings> | null {
  const source = record(value);
  if (!source) return null;
  const patch: Partial<Settings> = {};
  for (const key of BOOL_KEYS) {
    const item = own(source, key);
    if (typeof item === "boolean") patch[key] = item;
  }
  const level = own(source, "securityLevel");
  if (level === "relaxed" || level === "standard" || level === "strict") patch.securityLevel = level;
  for (const key of ["filterPackUrl", "iocFeedUrl"] as const) {
    const item = own(source, key);
    if (item === "") patch[key] = "";
    else if (typeof item === "string") {
      const url = parseHttpsUrl(item);
      if (url) patch[key] = url;
    }
  }
  for (const key of ["filterPackSha256", "iocFeedSha256"] as const) {
    const item = own(source, key);
    if (item === "") patch[key] = "";
    else if (typeof item === "string") {
      const pin = parseSha256Pin(item);
      if (pin) patch[key] = pin;
    }
  }
  const allow = own(source, "allowlist");
  if (Array.isArray(allow)) patch.allowlist = limited(allow, MAX_LIST_ENTRIES, hostField);
  const block = own(source, "blocklist");
  if (Array.isArray(block)) patch.blocklist = limited(block, MAX_LIST_ENTRIES, hostField);
  return patch;
}

function licenseToken(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 8192) return null;
  const token = value.trim();
  return LICENSE_TOKEN.test(token) ? token : null;
}

export function parseClientMessage(value: unknown): ClientMessage | null {
  const source = record(value);
  if (!source || !Object.hasOwn(source, "type") || typeof source.type !== "string") return null;
  const type = source.type;

  if (NO_FIELDS.has(type as ClientMessage["type"])) {
    return { type } as ClientMessage;
  }

  switch (type) {
    case "GET_POPUP_STATE": {
      const id = own(source, "tabId");
      if (id === undefined) return { type };
      const parsed = tabId(id);
      return parsed === null ? null : { type, tabId: parsed };
    }
    case "GET_TAB_ANALYSIS": {
      const id = tabId(own(source, "tabId"));
      if (id === null) return null;
      const blocked = own(source, "blocked");
      if (typeof blocked === "string" && BLOCKED.has(blocked)) return { type, tabId: id, blocked };
      return { type, tabId: id };
    }
    case "UPDATE_SETTINGS": {
      const patch = settingsPatch(own(source, "patch"));
      return patch ? { type, patch } : null;
    }
    case "ADD_ALLOWLIST":
    case "REMOVE_ALLOWLIST":
    case "ADD_BLOCKLIST":
    case "REMOVE_BLOCKLIST":
    case "RESUME_SITE": {
      const host = hostField(own(source, "host"));
      return host ? { type, host } : null;
    }
    case "GO_BACK":
    case "CONTINUE_TO_SITE": {
      const id = tabId(own(source, "tabId"));
      return id === null ? null : { type, tabId: id };
    }
    case "ACTIVATE_LICENSE": {
      const token = licenseToken(own(source, "token"));
      return token ? { type, token } : null;
    }
    case "PAGE_CHECK": {
      if (!Array.isArray(own(source, "kinds"))) return null;
      const kinds = [...new Set(limited(own(source, "kinds"), 64, (item) => (typeof item === "string" && isPageSignalKind(item) ? item : null)))];
      const hints = limited(own(source, "hints"), 12, (item) => {
        if (typeof item !== "string") return null;
        const text = item.replace(/\s+/g, " ").trim().slice(0, 160);
        return text.length > 1 ? text : null;
      });
      return hints.length > 0 ? { type, kinds, hints } : { type, kinds };
    }
    case "PAUSE_SITE": {
      const host = hostField(own(source, "host"));
      if (!host) return null;
      const raw = own(source, "minutes");
      const minutes = typeof raw === "number" && Number.isFinite(raw) ? Math.min(120, Math.max(1, Math.trunc(raw))) : 15;
      return { type, host, minutes };
    }
    case "SEARCH_MARK": {
      if (!Array.isArray(own(source, "hrefs"))) return null;
      return { type, hrefs: limited(own(source, "hrefs"), 24, (item) => httpUrl(item, 2000)) };
    }
    case "GET_POSTURE": {
      const refresh = own(source, "refresh");
      return typeof refresh === "boolean" ? { type, refresh } : { type };
    }
    case "OPEN_SETTINGS_PAGE": {
      const url = own(source, "url");
      if (typeof url !== "string" || url.length > 200 || !SETTINGS_URL.test(url)) return null;
      return { type, url };
    }
    default:
      return null;
  }
}

export function isClientMessage(value: unknown): value is ClientMessage {
  return parseClientMessage(value) !== null;
}

function idsOf(prefixes: readonly string[]): Set<string> {
  const ids = new Set<string>();
  for (const prefix of prefixes) {
    const match = /^chrome-extension:\/\/([^/]+)\//.exec(prefix);
    if (match?.[1]) ids.add(match[1]);
  }
  return ids;
}

/** Privileged messages only from our own pages. Page scripts may only report checks and search marks. */
export function senderMaySend(message: ClientMessage, sender: GateSender, ownOriginPrefixes: readonly string[]): boolean {
  const prefixes = ownOriginPrefixes.filter((prefix) => prefix.startsWith("chrome-extension://"));
  const ids = idsOf(prefixes);
  if (ids.size === 0) return false;
  if (sender.id && !ids.has(sender.id)) return false;
  const ownPage = Boolean(sender.url && prefixes.some((prefix) => sender.url?.startsWith(prefix)));
  if (message.type === "PAGE_CHECK" || message.type === "SEARCH_MARK") {
    return sender.hasTab && (sender.url?.startsWith("http://") === true || sender.url?.startsWith("https://") === true);
  }
  return ownPage;
}

/** Checkout page → license activation only. Any other shape, including a second type, is dropped. */
export function parseExternalActivation(
  value: unknown,
  senderUrl: string | undefined,
  allowedOrigins: readonly string[],
): { type: "ACTIVATE_LICENSE"; token: string } | null {
  const parsed = parseClientMessage(value);
  if (!parsed || parsed.type !== "ACTIVATE_LICENSE" || !senderUrl) return null;
  let origin: string;
  try {
    origin = new URL(senderUrl).origin;
  } catch {
    return null;
  }
  if (!allowedOrigins.includes(origin)) return null;
  return parsed;
}
