import type { LifetimeStats } from "@shared/types";

export const EMPTY_STATS: LifetimeStats = { trackers: 0, threats: 0, downloads: 0 };

export function parseStats(raw: unknown): LifetimeStats {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_STATS };
  const o = raw as Record<string, unknown>;
  return {
    trackers: asCount(o.trackers),
    threats: asCount(o.threats),
    downloads: asCount(o.downloads),
  };
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export async function loadStats(): Promise<LifetimeStats> {
  try {
    const stored = await chrome.storage.local.get("lifetime");
    return parseStats(stored?.lifetime);
  } catch {
    return { ...EMPTY_STATS };
  }
}

export async function bumpStats(delta: Partial<LifetimeStats>): Promise<LifetimeStats> {
  const current = await loadStats();
  const next: LifetimeStats = {
    trackers: (current?.trackers ?? 0) + (delta.trackers ?? 0),
    threats: (current?.threats ?? 0) + (delta.threats ?? 0),
    downloads: (current?.downloads ?? 0) + (delta.downloads ?? 0),
  };
  await chrome.storage.local.set({ lifetime: next });
  return next;
}
