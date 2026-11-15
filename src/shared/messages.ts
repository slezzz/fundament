import type { ExtensionChangeView, ExtensionRiskView, FeedStatusView, PopupState, PostureItem, SecurityEvent, Settings, UrlAnalysis } from "./types";

export type ClientMessage =
  | { type: "GET_POPUP_STATE"; tabId?: number }
  | { type: "GET_TAB_ANALYSIS"; tabId: number; blocked?: string }
  | { type: "UPDATE_SETTINGS"; patch: Partial<Settings> }
  | { type: "GET_HISTORY" }
  | { type: "CLEAR_HISTORY" }
  | { type: "ADD_ALLOWLIST"; host: string }
  | { type: "REMOVE_ALLOWLIST"; host: string }
  | { type: "ADD_BLOCKLIST"; host: string }
  | { type: "REMOVE_BLOCKLIST"; host: string }
  | { type: "GO_BACK"; tabId: number }
  | { type: "CONTINUE_TO_SITE"; tabId: number }
  | { type: "ACTIVATE_LICENSE"; token: string }
  | { type: "DEACTIVATE_LICENSE" }
  | { type: "PAGE_CHECK"; kinds: string[]; hints?: string[] }
  | { type: "PAUSE_SITE"; host: string; minutes: number }
  | { type: "RESUME_SITE"; host: string }
  | { type: "GET_EXTENSION_AUDIT" }
  | { type: "REFRESH_FILTER_PACK" }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "ROLLBACK_IOC_FEED" }
  | { type: "REFRESH_IOC_FEED" }
  | { type: "SEARCH_MARK"; hrefs: string[] }
  | { type: "GET_POSTURE"; refresh?: boolean }
  | { type: "GET_FEED_STATUS" }
  | { type: "REFRESH_LIVE_FEED" }
  | { type: "OPEN_SETTINGS_PAGE"; url: string };

export type ServerMessage =
  | { type: "POPUP_STATE"; state: PopupState }
  | { type: "TAB_ANALYSIS"; analysis: UrlAnalysis | null }
  | { type: "HISTORY"; events: SecurityEvent[] }
  | { type: "SETTINGS"; settings: Settings }
  | { type: "ERROR"; message: string }
  | { type: "OK" }
  | { type: "SEARCH_MARKS"; marks: { href: string; label: string }[] }
  | { type: "EXTENSION_AUDIT"; items: ExtensionRiskView[]; changes: ExtensionChangeView[] }
  | { type: "POSTURE"; items: PostureItem[] }
  | { type: "FEED_STATUS"; status: FeedStatusView };
