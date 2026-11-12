import {
  applySnapshot,
  EMPTY_IOC_STATE,
  type IocSnapshot,
  type IocState,
} from "@engine/feeds/ioc";

export function parseIocState(raw: unknown): IocState {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_IOC_STATE };
  const o = raw as Record<string, unknown>;
  return {
    current: parseSnapshot(o.current),
    previous: parseSnapshot(o.previous),
    error: typeof o.error === "string" ? o.error.slice(0, 300) : null,
  };
}

function parseSnapshot(raw: unknown): IocSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.format !== "fundament-ioc-v1") return null;
  if (typeof o.version !== "number" || typeof o.sha256 !== "string") return null;
  if (!Array.isArray(o.hosts)) return null;
  const hosts = o.hosts.filter((h): h is string => typeof h === "string").slice(0, 2000);
  return {
    version: o.version,
    format: "fundament-ioc-v1",
    source: typeof o.source === "string" ? o.source.slice(0, 200) : "local",
    hosts,
    sha256: o.sha256.toLowerCase().slice(0, 64),
    appliedAt: typeof o.appliedAt === "number" ? o.appliedAt : 0,
  };
}

export async function loadIocState(): Promise<IocState> {
  const stored = await chrome.storage.local.get("iocState");
  return parseIocState(stored.iocState);
}

export async function saveIocState(state: IocState): Promise<void> {
  await chrome.storage.local.set({ iocState: state });
}

export async function storeIocSnapshot(incoming: IocSnapshot): Promise<IocState> {
  const applied = applySnapshot(await loadIocState(), incoming);
  const next = applied.ok ? applied.state : { ...(await loadIocState()), error: applied.error };
  await saveIocState(next);
  return next;
}
