import type { SecurityEvent } from "@shared/types";
import { FREE_ENTITLEMENTS } from "@billing/entitlements";

function parseEvents(raw: unknown): SecurityEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: SecurityEvent[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.type !== "string" || typeof o.host !== "string") {
      continue;
    }
    if (typeof o.at !== "number") continue;
    events.push({
      id: o.id,
      type: o.type as SecurityEvent["type"],
      host: o.host.slice(0, 253),
      at: o.at,
      score: typeof o.score === "number" ? o.score : undefined,
    });
  }
  return events;
}

export async function loadEvents(
  limits: { maxEvents: number; eventRetentionMs: number } = FREE_ENTITLEMENTS,
): Promise<SecurityEvent[]> {
  const stored = await chrome.storage.local.get("events");
  return prune(parseEvents(stored.events), Date.now(), limits);
}

export async function appendEvent(
  event: Omit<SecurityEvent, "id">,
  limits: { maxEvents: number; eventRetentionMs: number } = FREE_ENTITLEMENTS,
): Promise<void> {
  const events = await loadEvents(limits);
  events.unshift({ ...event, id: crypto.randomUUID() });
  await chrome.storage.local.set({ events: prune(events, Date.now(), limits) });
}

export async function clearEvents(): Promise<void> {
  await chrome.storage.local.set({ events: [] });
}

export function prune(
  events: SecurityEvent[],
  now = Date.now(),
  limits: { maxEvents: number; eventRetentionMs: number } = FREE_ENTITLEMENTS,
): SecurityEvent[] {
  return events.filter((e) => now - e.at < limits.eventRetentionMs).slice(0, limits.maxEvents);
}
