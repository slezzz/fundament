import type { DomainResult } from "@shared/types";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

interface CacheEntry {
  origin: string;
  until: number;
  result: DomainResult;
}

export async function readReputationCache(now = Date.now()): Promise<Map<string, CacheEntry>> {
  const stored = await chrome.storage.local.get("reputationCache");
  const map = new Map<string, CacheEntry>();
  if (!Array.isArray(stored.reputationCache)) return map;
  for (const item of stored.reputationCache) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.origin !== "string" || typeof o.until !== "number") continue;
    if (o.until <= now) continue;
    const result = o.result as DomainResult | undefined;
    if (!result || typeof result.listed !== "boolean" || typeof result.available !== "boolean") continue;
    map.set(o.origin, { origin: o.origin, until: o.until, result });
  }
  return map;
}

export async function writeReputationCache(entries: Map<string, CacheEntry>): Promise<void> {
  const list = [...entries.values()]
    .sort((a, b) => b.until - a.until)
    .slice(0, MAX_ENTRIES);
  await chrome.storage.local.set({ reputationCache: list });
}

export { CACHE_TTL_MS };
