export type RiskBand = "safe" | "low" | "suspicious" | "high" | "critical";

export type SignalSeverity = "info" | "ok" | "warn" | "fail" | "unavailable";

export interface RiskSignal {
  id: string;
  /** Points added toward 0–100. Zero for informational / unavailable. */
  weightApplied: number;
  severity: SignalSeverity;
  /** English copy (logs, reports). The UI renders `key` + `args` in the browser language. */
  title: string;
  explanation: string;
  /** Catalog key in src/engine/i18n/signals.ts; defaults to `id`. */
  key?: string;
  args?: string[];
}

export interface ParsedUrl {
  href: string;
  protocol: "http:" | "https:" | "other";
  hostname: string;
  hostnameUnicode: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  isIpLiteral: boolean;
  isIpv6: boolean;
  hasUserInfo: boolean;
}

export interface ParsedDomain {
  hostname: string;
  hostnameUnicode: string;
  labels: string[];
  labelsUnicode: string[];
  registrableDomain: string;
  publicSuffix: string;
  subdomain: string;
  tld: string;
  containsPunycode: boolean;
}

export interface AnalysisInput {
  url: string;
  /** User blocklist hosts (registrable or hostname). */
  blocklist: string[];
  allowlist: string[];
  phishingProtection: boolean;
  threatProtection: boolean;
  securityLevel: SecurityLevel;
  /** Registrable domain is in the shipped popularity list (negative evidence for name-based impersonation only). */
  isPopular?: (registrableDomain: string, hostname?: string) => boolean;
}

export type SecurityLevel = "relaxed" | "standard" | "strict";

export interface UrlAnalysis {
  url: string;
  parsed: ParsedUrl | null;
  domain: ParsedDomain | null;
  parseError: string | null;
  signals: RiskSignal[];
  score: number;
  band: RiskBand;
  engineVersion: string;
  weightsVersion: string;
  reputationAvailable: boolean;
  trackerHits: number;
  allowlisted: boolean;
  blocklisted: boolean;
  analyzedAt: number;
}

export type SecurityEventType =
  | "site_safe"
  | "site_suspicious"
  | "threat_blocked"
  | "tracker_blocked"
  | "user_continued"
  | "user_went_back"
  | "download_blocked"
  | "extension_installed"
  | "integrity_alert"
  | "feed_updated"
  | "feed_rolled_back"
  | "page_blocked"
  | "page_threat"
  | "extension_changed";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  host: string;
  at: number;
  score?: number;
}

export interface Settings {
  threatProtection: boolean;
  trackerBlocking: boolean;
  phishingProtection: boolean;
  localAnalysis: boolean;
  telemetry: boolean;
  /** Opt-in: send origin (never path/query) to the reputation service. */
  onlineReputation: boolean;
  httpsUpgrade: boolean;
  httpsUpgradePages: boolean;
  pageChecks: boolean;
  downloadProtection: boolean;
  /** Strip known ad/click IDs from page URLs (utm, fbclid, gclid, …). */
  stripTrackingParams: boolean;
  /** Send Global Privacy Control / DNT on requests. */
  globalPrivacyControl: boolean;
  /** Tighten WebRTC, prefetch, and hyperlink auditing via chrome.privacy. */
  hardenBrowser: boolean;
  cosmeticFiltering: boolean;
  overlayProtection: boolean;
  filterPackUrl: string;
  filterPackSha256: string;
  /** Opt-in: set X-Frame-Options SAMEORIGIN on main frames. Breaks legitimate embeds. */
  cspReinforce: boolean;
  /** Opt-in: add noise to canvas reads. Detection still runs with page checks. */
  fingerprintShield: boolean;
  /** Apply shipped IOC hosts and optional pinned feed. */
  iocFeeds: boolean;
  /** Optional HTTPS IOC list (JSON or hosts file). Fetch only with a SHA-256 pin. */
  iocFeedUrl: string;
  iocFeedSha256: string;
  /** Daily signed update of the phishing list (newer than the release). */
  liveFeed: boolean;
  /** Mark risky destinations on Google/Bing/DDG result pages. */
  searchMarks: boolean;
  /** Block sites from prompting for notification permission. */
  blockNotificationPrompts: boolean;
  securityLevel: SecurityLevel;
  allowlist: string[];
  blocklist: string[];
  onboardingComplete: boolean;
  licenseToken: string;
}

export interface BlockedSlice {
  rulesetId: string;
  count: number;
}

export interface ExtensionRiskView {
  id: string;
  name: string;
  enabled: boolean;
  installType: string;
  level: "low" | "medium" | "high" | "critical";
  reasons: string[];
}

export interface PostureItem {
  id: string;
  status: "ok" | "warn" | "fail" | "unknown";
  title: string;
  detail: string;
  /** chrome:// settings page that fixes it (opened via chrome.tabs.create). */
  fix?: string;
}

export interface FeedStatusView {
  /** Hosts in the phishing ruleset shipped with this release. */
  shippedHosts: number;
  live: {
    configured: boolean;
    version: number;
    generated: string | null;
    hostCount: number;
    lastCheck: number | null;
    error: string | null;
  };
}

export interface ExtensionChangeView {
  id: string;
  name: string;
  kind: "installed" | "escalated" | "updated";
  fromVersion?: string;
  toVersion: string;
  added: string[];
  severity: "info" | "warn" | "critical";
  at: number;
}

export interface LifetimeStats {
  trackers: number;
  threats: number;
  downloads: number;
}

export interface PauseEntry {
  host: string;
  until: number;
}

export type PlanId = "free" | "pro";

export interface Entitlements {
  plan: PlanId;
  onlineReputation: boolean;
  plusTrackers: boolean;
  extendedTrackers: boolean;
  cosmeticFiltering: boolean;
  filterPack: boolean;
  securityLevels: SecurityLevel[];
  maxListEntries: number;
  maxEvents: number;
  eventRetentionMs: number;
}

export interface FilterPackStatus {
  hostCount: number;
  updatedAt: number | null;
  sha256: string;
  error: string | null;
}

export interface IocFeedStatus {
  version: number;
  hostCount: number;
  updatedAt: number | null;
  sha256: string;
  error: string | null;
  canRollback: boolean;
}

export interface IntegrityStatusView {
  ok: boolean;
  detail: string;
}

export interface PopupState {
  settings: Settings;
  analysis: UrlAnalysis | null;
  tabId: number | null;
  tabTitle: string | null;
  connectionsChecked: number;
  trackersBlocked: number;
  threatsDetected: number;
  reputationAvailable: boolean;
  plan: PlanId;
  entitlements: Entitlements;
  lifetime: LifetimeStats;
  pausedUntil: number | null;
  blockedSlices: BlockedSlice[];
  filterPack: FilterPackStatus;
  iocFeed: IocFeedStatus;
  integrity: IntegrityStatusView;
  /** Posture items that need attention (warn/fail only). */
  postureAlerts: PostureItem[];
}

export interface ThreatResult {
  listed: boolean;
  source: string;
  available: boolean;
}

export interface DomainResult {
  listed: boolean;
  source: string;
  available: boolean;
}

export interface ThreatIntelligenceProvider {
  checkUrl(url: string): Promise<ThreatResult>;
  checkDomain(domain: string): Promise<DomainResult>;
}
