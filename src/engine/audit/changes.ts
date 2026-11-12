/**
 * Extension supply-chain watch. A trusted extension that suddenly asks for more
 * (all-site access, cookies, debugger, …) after an update is the signature of a
 * hijacked developer account or a sold extension. Chrome auto-updates silently,
 * so Fundament diffs what each extension can do between snapshots.
 */
export interface ExtensionSnapshotEntry {
  name: string;
  version: string;
  permissions: string[];
  hostPermissions: string[];
  installType: string;
  enabled: boolean;
}

export type ExtensionSnapshot = Record<string, ExtensionSnapshotEntry>;

export interface ExtensionChange {
  id: string;
  name: string;
  kind: "installed" | "escalated" | "updated";
  fromVersion?: string;
  toVersion: string;
  added: string[];
  severity: "info" | "warn" | "critical";
  at: number;
}

const CRITICAL = new Set(["debugger", "nativeMessaging", "proxy", "webRequestBlocking", "userScripts", "cookies", "clipboardRead"]);
const SENSITIVE = new Set([
  "webRequest",
  "history",
  "management",
  "privacy",
  "tabCapture",
  "desktopCapture",
  "scripting",
  "declarativeNetRequestWithHostAccess",
  "downloads",
  "webNavigation",
  "tabs",
  "identity",
  "geolocation",
]);
const WIDE_HOSTS = ["<all_urls>", "*://*/*", "http://*/*", "https://*/*"];

function isWide(host: string): boolean {
  return WIDE_HOSTS.includes(host) || host.startsWith("*://*/") || host === "file:///*";
}

export function severityOfAdded(added: string[]): ExtensionChange["severity"] {
  if (added.some((p) => CRITICAL.has(p) || WIDE_HOSTS.includes(p))) return "critical";
  if (added.some((p) => SENSITIVE.has(p) || isWide(p) || p.includes("*"))) return "warn";
  return added.length > 0 ? "warn" : "info";
}

export function diffExtensions(prev: ExtensionSnapshot | null, next: ExtensionSnapshot, now = Date.now()): ExtensionChange[] {
  if (!prev) return [];
  const changes: ExtensionChange[] = [];
  for (const [id, cur] of Object.entries(next)) {
    const old = prev[id];
    if (!old) {
      const wide = [...cur.permissions.filter((p) => CRITICAL.has(p) || SENSITIVE.has(p)), ...cur.hostPermissions.filter((h) => WIDE_HOSTS.includes(h))];
      changes.push({
        id,
        name: cur.name,
        kind: "installed",
        toVersion: cur.version,
        added: wide,
        severity: wide.some((p) => CRITICAL.has(p)) || cur.installType === "sideload" ? "warn" : "info",
        at: now,
      });
      continue;
    }
    const added = [
      ...cur.permissions.filter((p) => !old.permissions.includes(p)),
      ...cur.hostPermissions.filter((h) => !old.hostPermissions.includes(h)),
    ];
    if (added.length > 0) {
      changes.push({
        id,
        name: cur.name,
        kind: "escalated",
        fromVersion: old.version,
        toVersion: cur.version,
        added,
        severity: severityOfAdded(added),
        at: now,
      });
    } else if (old.version !== cur.version) {
      changes.push({ id, name: cur.name, kind: "updated", fromVersion: old.version, toVersion: cur.version, added: [], severity: "info", at: now });
    }
  }
  return changes;
}

export function snapshotFrom(infos: chrome.management.ExtensionInfo[], selfId: string): ExtensionSnapshot {
  const out: ExtensionSnapshot = {};
  for (const info of infos) {
    if (info.type !== "extension" || info.id === selfId) continue;
    out[info.id] = {
      name: info.name.slice(0, 120),
      version: info.version,
      permissions: [...(info.permissions ?? [])].sort(),
      hostPermissions: [...(info.hostPermissions ?? [])].sort(),
      installType: info.installType,
      enabled: info.enabled,
    };
  }
  return out;
}
