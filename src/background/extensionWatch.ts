import { diffExtensions, snapshotFrom, type ExtensionChange, type ExtensionSnapshot } from "@engine/audit/changes";
import { chromeMessage } from "@shared/chromeI18n";

const SNAPSHOT_KEY = "extSnapshot";
const CHANGES_KEY = "extChanges";
const MAX_CHANGES = 30;

export async function loadExtensionChanges(): Promise<ExtensionChange[]> {
  const stored = await chrome.storage.local.get(CHANGES_KEY);
  const list = stored[CHANGES_KEY];
  return Array.isArray(list) ? (list as ExtensionChange[]) : [];
}

function notify(change: ExtensionChange): void {
  if (!chrome.notifications?.create) return;
  try {
    chrome.notifications.create(`fundament-ext-${change.id}-${change.at}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: chromeMessage("notify_extTitle", "An extension gained new powers"),
      message: chromeMessage(
        "notify_extBody",
        "“$1” updated and can now: $2. If you did not expect this, disable it in chrome://extensions.",
        [change.name.slice(0, 60), change.added.slice(0, 4).join(", ")],
      ),
      priority: 2,
      requireInteraction: change.severity === "critical",
    });
  } catch {
    /* ignore */
  }
}

/**
 * Snapshot every installed extension and diff against the last snapshot.
 * The first run only records a baseline (no alarms for what was already there).
 */
export async function checkExtensions(onChange: (change: ExtensionChange) => Promise<void>): Promise<ExtensionChange[]> {
  if (!chrome.management?.getAll) return [];
  const infos = await chrome.management.getAll();
  const next = snapshotFrom(infos, chrome.runtime.id);
  const stored = await chrome.storage.local.get(SNAPSHOT_KEY);
  const prev = (stored[SNAPSHOT_KEY] as ExtensionSnapshot | undefined) ?? null;
  const changes = diffExtensions(prev, next);
  await chrome.storage.local.set({ [SNAPSHOT_KEY]: next });
  if (changes.length === 0) return [];

  const history = await loadExtensionChanges();
  await chrome.storage.local.set({ [CHANGES_KEY]: [...changes, ...history].slice(0, MAX_CHANGES) });
  for (const change of changes) {
    await onChange(change);
    if (change.kind === "escalated" && change.severity !== "info") notify(change);
  }
  return changes;
}
