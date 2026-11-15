/** Public GitHub repo. False-alarm and missed-phish reports open an issue here and nowhere else. */
export const REPORT_GITHUB_REPO = "slezzz/fundament";

export const MAX_URL_LENGTH = 4096;
export const MAX_LABEL_LENGTH = 63;
export const MAX_HOST_LENGTH = 253;
export const MAX_LIST_ENTRIES = 200;
export const EVENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_EVENTS = 200;
export const ANALYSIS_CACHE_TTL_MS = 5 * 60 * 1000;

export const TRACKER_CORE_RULESET_ID = "trackers-core";
export const ADS_EXTRA_RULESET_ID = "ads-extra";
export const TRACKER_EXTENDED_RULESET_ID = "trackers-extended";
export const TRACKER_PLUS_RULESET_ID = "trackers-plus";
export const HTTPS_UPGRADE_RULESET_ID = "https-upgrade";
export const HTTPS_UPGRADE_PAGES_RULESET_ID = "https-upgrade-pages";
export const THREATS_CORE_RULESET_ID = "threats-core";
export const THREATS_FEED_RULESET_ID = "threats-feed";
export const TRACKING_PARAMS_RULESET_ID = "tracking-params";
export const PRIVACY_HEADERS_RULESET_ID = "privacy-headers";
export const CLICKJACK_HEADERS_RULESET_ID = "clickjack-headers";
export const DYNAMIC_RULE_ID_BLOCK_START = 10_000;
export const DYNAMIC_RULE_ID_ALLOW_START = 20_000;
export const DYNAMIC_RULE_ID_PAUSE_START = 30_000;
export const DYNAMIC_RULE_ID_PACK_START = 40_000;
export const DYNAMIC_RULE_ID_IOC_START = 50_000;
export const DYNAMIC_RULE_ID_IOC_PAGE_START = 60_000;
export const DYNAMIC_RULE_ID_BLOCK_PAGE_START = 70_000;
export const DYNAMIC_RULE_ID_LIVE_START = 80_000;
export const SESSION_RULE_ID_BYPASS_START = 1_000;
export const PAUSE_MS_DEFAULT = 15 * 60 * 1000;

export const RULESET_LABELS: Record<string, string> = {
  "trackers-core": "Ads & analytics",
  "ads-extra": "Ad networks",
  "trackers-extended": "Extended trackers",
  "trackers-plus": "Fingerprinting & pixels",
  "https-upgrade": "HTTPS resource upgrades",
  "https-upgrade-pages": "HTTPS page upgrades",
  "threats-core": "Miner / threat hosts",
  "threats-feed": "Phishing feed",
  "tracking-params": "Tracking parameters",
  "privacy-headers": "Privacy headers",
  "clickjack-headers": "Clickjacking headers",
  "_dynamic": "Your lists / pause",
};
