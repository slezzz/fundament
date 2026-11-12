import type { PauseEntry } from "@shared/types";

function pauseBucket(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

export function prunePauses(entries: PauseEntry[], now = Date.now()): PauseEntry[] {
  return entries.filter((e) => e.until > now && e.host.length > 0 && e.host.length <= 253);
}

export function withPause(entries: PauseEntry[], host: string, until: number, now = Date.now()): PauseEntry[] {
  const next = prunePauses(entries, now).filter((e) => e.host !== host);
  if (until > now) next.push({ host, until });
  return next;
}

export function withoutPause(entries: PauseEntry[], host: string, now = Date.now()): PauseEntry[] {
  return prunePauses(entries, now).filter((e) => e.host !== host);
}

export async function loadPauses(): Promise<PauseEntry[]> {
  try {
    const stored = await pauseBucket().get("pauses");
    if (!Array.isArray(stored.pauses)) return [];
    return prunePauses(stored.pauses as PauseEntry[]);
  } catch {
    return [];
  }
}

export async function savePauses(entries: PauseEntry[]): Promise<PauseEntry[]> {
  const next = prunePauses(entries);
  try {
    await pauseBucket().set({ pauses: next });
  } catch {
    /* ignore */
  }
  return next;
}

export function pauseUntilFor(entries: PauseEntry[], host: string | null, now = Date.now()): number | null {
  if (!host) return null;
  const hit = prunePauses(entries, now).find((e) => e.host === host);
  return hit?.until ?? null;
}
