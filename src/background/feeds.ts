import {
  feedFetchUrl,
  ingestFeedBytes,
  rollbackSnapshot,
  snapshotFromHosts,
} from "@engine/feeds/ioc";
import { parseSha256Pin } from "@engine/filters/abp";
import { loadIocState, saveIocState, storeIocSnapshot } from "@storage/feeds";
import type { IocFeedStatus } from "@shared/types";
import type { IocState } from "@engine/feeds/ioc";

export function iocStatusFrom(state: IocState): IocFeedStatus {
  return {
    version: state.current?.version ?? 0,
    hostCount: state.current?.hosts.length ?? 0,
    updatedAt: state.current?.appliedAt ?? null,
    sha256: state.current?.sha256 ?? "",
    error: state.error,
    canRollback: Boolean(state.previous),
  };
}

export async function seedShippedIoc(force = false): Promise<IocState> {
  const state = await loadIocState();
  if (!force && state.current && state.current.hosts.length > 0) return state;
  try {
    const response = await fetch(chrome.runtime.getURL("data/ioc-core.json"));
    if (!response.ok) return state;
    const json = (await response.json()) as { version?: number; source?: string; hosts?: string[] };
    const snapshot = await snapshotFromHosts(
      Array.isArray(json.hosts) ? json.hosts : [],
      typeof json.source === "string" ? json.source : "shipped-ioc-core",
      typeof json.version === "number" ? json.version : 1,
    );
    return storeIocSnapshot(snapshot);
  } catch {
    return state;
  }
}

/** A store install applies the bundled IOC file. A typed address is a dev build only. */
export function usesRemoteIoc(storePack: boolean, url: string): boolean {
  return storePack !== true && url.trim().length > 0;
}

export function withoutRemoteIoc<T extends { iocFeedUrl?: string; iocFeedSha256?: string }>(storePack: boolean, patch: T): T {
  if (storePack !== true) return patch;
  const next = { ...patch };
  delete next.iocFeedUrl;
  delete next.iocFeedSha256;
  return next;
}

export async function refreshPinnedIoc(urlRaw: string, pinRaw: string): Promise<IocState> {
  const url = feedFetchUrl(urlRaw);
  if (!url) {
    const state = await loadIocState();
    const next = { ...state, error: "IOC URL must be https without credentials." };
    await saveIocState(next);
    return next;
  }
  const pin = parseSha256Pin(pinRaw);
  if (!pin) {
    const state = await loadIocState();
    const next = { ...state, error: "Save a SHA-256 pin before fetching a remote IOC list." };
    await saveIocState(next);
    return next;
  }
  try {
    const response = await fetch(url, { redirect: "follow", headers: { Accept: "application/json, text/plain" } });
    if (!response.ok) {
      const state = await loadIocState();
      const next = { ...state, error: `IOC server returned ${response.status}.` };
      await saveIocState(next);
      return next;
    }
    const buffer = await response.arrayBuffer();
    const ingested = await ingestFeedBytes(
      buffer,
      response.headers.get("content-type") || "",
      url,
      pin,
      Date.now(),
    );
    if (!ingested.ok) {
      const state = await loadIocState();
      const next = { ...state, error: ingested.error };
      await saveIocState(next);
      return next;
    }
    return storeIocSnapshot(ingested.snapshot);
  } catch {
    const state = await loadIocState();
    const next = { ...state, error: "Could not download the IOC feed." };
    await saveIocState(next);
    return next;
  }
}

export async function rollbackIoc(): Promise<IocState> {
  const rolled = rollbackSnapshot(await loadIocState());
  if (!rolled.ok) {
    const state = await loadIocState();
    const next = { ...state, error: rolled.error };
    await saveIocState(next);
    return next;
  }
  await saveIocState(rolled.state);
  return rolled.state;
}
