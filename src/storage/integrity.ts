import { integrityVerdict } from "@engine/integrity/selfCheck";

export interface IntegrityStatus {
  ok: boolean;
  detail: string;
  fingerprint: string;
}

export const EMPTY_INTEGRITY: IntegrityStatus = {
  ok: true,
  detail: "Integrity has not been checked yet.",
  fingerprint: "",
};

export function parseIntegrityStatus(raw: unknown): IntegrityStatus {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_INTEGRITY };
  const o = raw as Record<string, unknown>;
  return {
    ok: o.ok !== false,
    detail: typeof o.detail === "string" ? o.detail.slice(0, 300) : EMPTY_INTEGRITY.detail,
    fingerprint: typeof o.fingerprint === "string" ? o.fingerprint.toLowerCase().slice(0, 64) : "",
  };
}

export async function loadInstallFingerprint(): Promise<string> {
  const stored = await chrome.storage.local.get("installFingerprint");
  return typeof stored.installFingerprint === "string" ? stored.installFingerprint : "";
}

export async function saveInstallFingerprint(fingerprint: string): Promise<void> {
  await chrome.storage.local.set({ installFingerprint: fingerprint });
}

export async function saveIntegrityStatus(status: IntegrityStatus): Promise<void> {
  await chrome.storage.local.set({ integrityStatus: status });
}

export async function loadIntegrityStatus(): Promise<IntegrityStatus> {
  const stored = await chrome.storage.local.get("integrityStatus");
  return parseIntegrityStatus(stored.integrityStatus);
}

export function statusFromFingerprint(expected: string, actual: string): IntegrityStatus {
  const verdict = integrityVerdict(expected || null, actual);
  return { ok: verdict.ok, detail: verdict.reason, fingerprint: actual };
}
