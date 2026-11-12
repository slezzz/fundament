export type TrackerCategory =
  | "advertising"
  | "analytics"
  | "fingerprinting"
  | "social"
  | "telemetry"
  | "malicious_tracking";

export interface TrackerEntry {
  domain: string;
  category: TrackerCategory;
}

/** High-volume tracker destinations. Not a complete EasyList replacement. */
export const TRACKER_CATALOG: TrackerEntry[] = [
  { domain: "doubleclick.net", category: "advertising" },
  { domain: "googlesyndication.com", category: "advertising" },
  { domain: "googleadservices.com", category: "advertising" },
  { domain: "adservice.google.com", category: "advertising" },
  { domain: "pagead2.googlesyndication.com", category: "advertising" },
  { domain: "adnxs.com", category: "advertising" },
  { domain: "adsrvr.org", category: "advertising" },
  { domain: "advertising.com", category: "advertising" },
  { domain: "taboola.com", category: "advertising" },
  { domain: "outbrain.com", category: "advertising" },
  { domain: "criteo.com", category: "advertising" },
  { domain: "criteo.net", category: "advertising" },
  { domain: "amazon-adsystem.com", category: "advertising" },
  { domain: "adsafeprotected.com", category: "advertising" },
  { domain: "moatads.com", category: "advertising" },
  { domain: "casalemedia.com", category: "advertising" },
  { domain: "openx.net", category: "advertising" },
  { domain: "pubmatic.com", category: "advertising" },
  { domain: "rubiconproject.com", category: "advertising" },
  { domain: "3lift.com", category: "advertising" },
  { domain: "bidswitch.net", category: "advertising" },
  { domain: "smartadserver.com", category: "advertising" },
  { domain: "google-analytics.com", category: "analytics" },
  { domain: "googletagmanager.com", category: "analytics" },
  { domain: "googletagservices.com", category: "analytics" },
  { domain: "analytics.google.com", category: "analytics" },
  { domain: "stats.g.doubleclick.net", category: "analytics" },
  { domain: "hotjar.com", category: "analytics" },
  { domain: "mixpanel.com", category: "analytics" },
  { domain: "segment.io", category: "analytics" },
  { domain: "segment.com", category: "analytics" },
  { domain: "amplitude.com", category: "analytics" },
  { domain: "fullstory.com", category: "analytics" },
  { domain: "mouseflow.com", category: "analytics" },
  { domain: "clarity.ms", category: "analytics" },
  { domain: "scorecardresearch.com", category: "analytics" },
  { domain: "quantserve.com", category: "analytics" },
  { domain: "newrelic.com", category: "telemetry" },
  { domain: "nr-data.net", category: "telemetry" },
  { domain: "sentry.io", category: "telemetry" },
  { domain: "bugsnag.com", category: "telemetry" },
  { domain: "fingerprint.com", category: "fingerprinting" },
  { domain: "fingerprintjs.com", category: "fingerprinting" },
  { domain: "api.fingerprint.com", category: "fingerprinting" },
  { domain: "cdn.fingerprint.com", category: "fingerprinting" },
  { domain: "perimeterx.net", category: "fingerprinting" },
  { domain: "px-cdn.net", category: "fingerprinting" },
  { domain: "facebook.net", category: "social" },
  { domain: "facebook.com", category: "social" },
  { domain: "connect.facebook.net", category: "social" },
  { domain: "pixel.facebook.com", category: "social" },
  { domain: "analytics.tiktok.com", category: "social" },
  { domain: "ads.linkedin.com", category: "social" },
  { domain: "snap.licdn.com", category: "social" },
  { domain: "platform.twitter.com", category: "social" },
  { domain: "syndication.twitter.com", category: "social" },
  { domain: "ads-twitter.com", category: "social" },
  { domain: "tr.snapchat.com", category: "social" },
  { domain: "sc-static.net", category: "social" },
  { domain: "bat.bing.com", category: "advertising" },
  { domain: "adform.net", category: "advertising" },
  { domain: "mathtag.com", category: "advertising" },
  { domain: "bluekai.com", category: "advertising" },
  { domain: "rlcdn.com", category: "advertising" },
  { domain: "everesttech.net", category: "advertising" },
  { domain: "demdex.net", category: "advertising" },
  { domain: "omtrdc.net", category: "analytics" },
  { domain: "2o7.net", category: "analytics" },
  { domain: "chartbeat.com", category: "analytics" },
  { domain: "parse.ly", category: "analytics" },
  { domain: "parsely.com", category: "analytics" },
];

export function matchTracker(hostname: string): TrackerEntry | undefined {
  const h = hostname.toLowerCase();
  return TRACKER_CATALOG.find((e) => h === e.domain || h.endsWith(`.${e.domain}`));
}
