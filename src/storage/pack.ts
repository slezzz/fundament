import type { FilterPackStatus } from "@shared/types";

export const EMPTY_PACK_STATUS: FilterPackStatus = {
  hostCount: 0,
  updatedAt: null,
  sha256: "",
  error: null,
};

export function parsePackStatus(raw: unknown): FilterPackStatus {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_PACK_STATUS };
  const o = raw as Record<string, unknown>;
  return {
    hostCount: typeof o.hostCount === "number" && o.hostCount >= 0 ? Math.min(o.hostCount, 5000) : 0,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : null,
    sha256: typeof o.sha256 === "string" ? o.sha256.toLowerCase().slice(0, 64) : "",
    error: typeof o.error === "string" ? o.error.slice(0, 300) : null,
  };
}

export async function loadPackHosts(): Promise<string[]> {
  const stored = await chrome.storage.local.get("filterPackHosts");
  if (!Array.isArray(stored.filterPackHosts)) return [];
  return stored.filterPackHosts.filter((h): h is string => typeof h === "string").slice(0, 5000);
}

export async function loadPackStatus(): Promise<FilterPackStatus> {
  const stored = await chrome.storage.local.get("filterPackStatus");
  return parsePackStatus(stored.filterPackStatus);
}

export async function savePack(hosts: string[], sha256: string): Promise<void> {
  await chrome.storage.local.set({
    filterPackHosts: hosts,
    filterPackStatus: {
      hostCount: hosts.length,
      updatedAt: Date.now(),
      sha256,
      error: null,
    } satisfies FilterPackStatus,
  });
}

export async function savePackError(message: string): Promise<void> {
  const current = await loadPackStatus();
  await chrome.storage.local.set({
    filterPackStatus: { ...current, error: message },
  });
}

export async function clearPack(): Promise<void> {
  await chrome.storage.local.set({
    filterPackHosts: [],
    filterPackStatus: { ...EMPTY_PACK_STATUS },
  });
}
