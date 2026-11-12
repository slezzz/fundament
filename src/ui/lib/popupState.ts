import { parseSettings } from "@storage/settings";
import type { PopupState } from "@shared/types";

export function normalizePopupState(state: PopupState | null | undefined): PopupState | null {
  if (!state || typeof state !== "object") return null;
  return {
    ...state,
    settings: parseSettings(state.settings),
    lifetime: state.lifetime && typeof state.lifetime === "object"
      ? {
          trackers: Number(state.lifetime.trackers) || 0,
          threats: Number(state.lifetime.threats) || 0,
          downloads: Number(state.lifetime.downloads) || 0,
        }
      : { trackers: 0, threats: 0, downloads: 0 },
    pausedUntil: state.pausedUntil ?? null,
    blockedSlices: Array.isArray(state.blockedSlices) ? state.blockedSlices : [],
    filterPack: state.filterPack && typeof state.filterPack === "object"
      ? {
          hostCount: Number(state.filterPack.hostCount) || 0,
          updatedAt: state.filterPack.updatedAt ?? null,
          sha256: typeof state.filterPack.sha256 === "string" ? state.filterPack.sha256 : "",
          error: state.filterPack.error ?? null,
        }
      : { hostCount: 0, updatedAt: null, sha256: "", error: null },
    iocFeed: state.iocFeed && typeof state.iocFeed === "object"
      ? {
          version: Number(state.iocFeed.version) || 0,
          hostCount: Number(state.iocFeed.hostCount) || 0,
          updatedAt: state.iocFeed.updatedAt ?? null,
          sha256: typeof state.iocFeed.sha256 === "string" ? state.iocFeed.sha256 : "",
          error: state.iocFeed.error ?? null,
          canRollback: Boolean(state.iocFeed.canRollback),
        }
      : { version: 0, hostCount: 0, updatedAt: null, sha256: "", error: null, canRollback: false },
    integrity: state.integrity && typeof state.integrity === "object"
      ? {
          ok: state.integrity.ok !== false,
          detail: typeof state.integrity.detail === "string" ? state.integrity.detail : "",
        }
      : { ok: true, detail: "" },
    postureAlerts: Array.isArray(state.postureAlerts)
      ? state.postureAlerts.filter((item) => item && typeof item.title === "string").slice(0, 5)
      : [],
    connectionsChecked: state.connectionsChecked ?? 0,
    trackersBlocked: state.trackersBlocked ?? 0,
    threatsDetected: state.threatsDetected ?? 0,
  };
}
