import type { UrlAnalysis } from "@shared/types";

/**
 * Per-tab state. Chrome stops an idle MV3 service worker after ~30 s, which wipes
 * module memory. chrome.storage.session survives that (but not a browser restart),
 * stays in RAM, and is not readable by content scripts by default.
 */
export interface TabRecord {
  url: string;
  /** URL seen in onBeforeNavigate that has not committed yet (may be DNR-redirected to the warning page). */
  pendingUrl: string;
  analysis: UrlAnalysis | null;
  connections: number;
  trackers: number;
  threats: number;
  interstitial: boolean;
  /** Host the user explicitly continued to from the warning page. */
  continuedHost: string;
  /** Set when a DNR rule (feed / IOC / your blocklist) redirected this tab to the warning page. */
  blockedBy: string;
}

export function emptyTab(url = ""): TabRecord {
  return {
    url,
    pendingUrl: "",
    analysis: null,
    connections: 0,
    trackers: 0,
    threats: 0,
    interstitial: false,
    continuedHost: "",
    blockedBy: "",
  };
}

const memory = new Map<number, TabRecord>();
const key = (tabId: number): string => `tab:${tabId}`;

function session(): chrome.storage.StorageArea | null {
  return typeof chrome !== "undefined" && chrome.storage?.session ? chrome.storage.session : null;
}

export async function getTab(tabId: number): Promise<TabRecord | undefined> {
  const cached = memory.get(tabId);
  if (cached) return cached;
  const area = session();
  if (!area) return undefined;
  try {
    const stored = await area.get(key(tabId));
    const raw = stored[key(tabId)] as Partial<TabRecord> | undefined;
    if (!raw || typeof raw !== "object") return undefined;
    const record: TabRecord = { ...emptyTab(), ...raw };
    memory.set(tabId, record);
    return record;
  } catch {
    return undefined;
  }
}

export async function saveTab(tabId: number, record: TabRecord): Promise<void> {
  memory.set(tabId, record);
  const area = session();
  if (!area) return;
  try {
    await area.set({ [key(tabId)]: record });
  } catch {
    /* quota: keep the in-memory copy */
  }
}

export async function deleteTab(tabId: number): Promise<void> {
  memory.delete(tabId);
  try {
    await session()?.remove(key(tabId));
  } catch {
    /* ignore */
  }
}
