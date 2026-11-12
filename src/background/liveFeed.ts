import { DROP_AFTER_MS, LIVE_MAX_BYTES, clientSafeHosts, parseLiveFeed, verifyLiveFeed } from "@engine/feeds/live";
import { parseHttpUrl } from "@engine/url/parse";
import { parseDomain } from "@engine/domain/parse";
import { isPublicSuffix } from "@engine/domain/psl";
import { isOfficialAnyBrand } from "@engine/impersonation/detect";

const KEY = "liveFeed";

export interface LiveFeedState {
  version: number;
  generated: string | null;
  hosts: string[];
  appliedAt: number | null;
  lastCheck: number | null;
  error: string | null;
}

export interface LiveFeedView {
  configured: boolean;
  version: number;
  generated: string | null;
  hostCount: number;
  lastCheck: number | null;
  error: string | null;
}

const EMPTY: LiveFeedState = { version: 0, generated: null, hosts: [], appliedAt: null, lastCheck: null, error: null };

/** Build-time configuration. Both must be set for the live feed to run. */
export function liveFeedConfig(): { url: string; publicKey: string } {
  const url = (import.meta.env.VITE_LIVE_FEED_URL ?? "").trim();
  const publicKey = (import.meta.env.VITE_LIVE_FEED_PUBKEY ?? "").trim();
  return { url: /^https:\/\/[^\s@]+$/.test(url) ? url : "", publicKey };
}

export async function loadLiveFeed(): Promise<LiveFeedState> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<LiveFeedState> | undefined;
  const state: LiveFeedState = { ...EMPTY, ...(stored ?? {}) };
  if (!Array.isArray(state.hosts)) state.hosts = [];
  // A list nobody refreshed for a month is no longer trustworthy: domains get cleaned and re-registered.
  if (state.generated && Date.now() - Date.parse(state.generated) > DROP_AFTER_MS) {
    return { ...state, hosts: [], error: "list expired" };
  }
  return state;
}

export function liveFeedView(state: LiveFeedState): LiveFeedView {
  const config = liveFeedConfig();
  return {
    configured: Boolean(config.url && config.publicKey),
    version: state.version,
    generated: state.generated,
    hostCount: state.hosts.length,
    lastCheck: state.lastCheck,
    error: state.error,
  };
}

function protectedHost(isPopular: (registrable: string, hostname?: string) => boolean): (host: string) => boolean {
  return (host) => {
    if (isPublicSuffix(host)) return true;
    try {
      const domain = parseDomain(parseHttpUrl(`https://${host}/`));
      if (!domain) return true;
      return isOfficialAnyBrand(domain) || isPopular(domain.registrableDomain, domain.hostname);
    } catch {
      return true;
    }
  };
}

export async function refreshLiveFeed(isPopular: (registrable: string, hostname?: string) => boolean): Promise<LiveFeedState> {
  const config = liveFeedConfig();
  const state = await loadLiveFeed();
  if (!config.url || !config.publicKey) {
    return state;
  }
  const save = async (next: LiveFeedState): Promise<LiveFeedState> => {
    await chrome.storage.local.set({ [KEY]: next });
    return next;
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const response = await fetch(config.url, { credentials: "omit", cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return save({ ...state, lastCheck: Date.now(), error: `HTTP ${response.status}` });
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > LIVE_MAX_BYTES) return save({ ...state, lastCheck: Date.now(), error: "file too large" });
    const text = await response.text();
    if (text.length > LIVE_MAX_BYTES) return save({ ...state, lastCheck: Date.now(), error: "file too large" });
    const parsed = parseLiveFeed(JSON.parse(text));
    if (!parsed.ok) return save({ ...state, lastCheck: Date.now(), error: parsed.error });
    if (parsed.feed.version === state.version) return save({ ...state, lastCheck: Date.now(), error: null });
    const verified = await verifyLiveFeed(parsed.feed, config.publicKey, { lastVersion: state.version });
    if (!verified.ok) return save({ ...state, lastCheck: Date.now(), error: verified.error });
    const hosts = clientSafeHosts(verified.feed.hosts, protectedHost(isPopular));
    return save({
      version: verified.feed.version,
      generated: verified.feed.generated,
      hosts,
      appliedAt: Date.now(),
      lastCheck: Date.now(),
      error: null,
    });
  } catch (error) {
    return save({ ...state, lastCheck: Date.now(), error: error instanceof Error ? error.message.slice(0, 120) : "fetch failed" });
  }
}
