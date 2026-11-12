import { scoreExtensionPermissions } from "@engine/audit/extensions";
import type { ExtensionRiskView } from "@shared/types";

export async function listExtensionRisks(): Promise<ExtensionRiskView[]> {
  if (!chrome.management?.getAll) return [];
  const infos = await chrome.management.getAll();
  const selfId = chrome.runtime.id;
  return infos
    .filter((info) => info.type === "extension" && info.id !== selfId)
    .map((info) => {
      const scored = scoreExtensionPermissions(info.permissions ?? [], info.hostPermissions ?? [], info.installType);
      return {
        id: info.id,
        name: info.name,
        enabled: info.enabled,
        installType: info.installType,
        level: scored.level,
        reasons: scored.reasons,
      };
    })
    .sort((a, b) => rank(b.level) - rank(a.level) || a.name.localeCompare(b.name));
}

function rank(level: ExtensionRiskView["level"]): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[level];
}
