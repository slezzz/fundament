import type { PostureItem } from "@shared/types";
import { chromeMessage } from "@shared/chromeI18n";
import { baselineFromReleases, versionVerdict, type ChromeBaseline } from "@engine/posture/version";

/**
 * Browser posture: the things that decide whether Chrome itself is a safe base.
 * An outdated Chrome (unpatched zero-days) or Safe Browsing switched off outweighs
 * anything an extension can add on top, so Fundament says so plainly.
 */

const BASELINE_KEY = "postureChromeBaseline";
/** v1 stored the newest version number (wrong during staged rollouts). */
const LEGACY_KEY = "postureLatestChrome";
const REFRESH_MS = 6 * 60 * 60 * 1000;

interface BaselineCache extends ChromeBaseline {
  platform: string;
  at: number;
}

async function installedChrome(): Promise<{ brand: string; version: string } | null> {
  const uaData = (navigator as Navigator & {
    userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<{ fullVersionList?: { brand: string; version: string }[]; platform?: string }> };
  }).userAgentData;
  try {
    const values = await uaData?.getHighEntropyValues?.(["fullVersionList", "platform"]);
    const list = values?.fullVersionList ?? [];
    const chrome = list.find((b) => b.brand === "Google Chrome");
    if (chrome) return { brand: "Google Chrome", version: chrome.version };
    const chromium = list.find((b) => b.brand === "Chromium");
    if (chromium) return { brand: list.find((b) => !/Not.?A.?Brand|Chromium/i.test(b.brand))?.brand ?? "Chromium", version: chromium.version };
  } catch {
    /* fall through */
  }
  const match = /Chrome\/(\d+\.\d+\.\d+\.\d+)/.exec(navigator.userAgent);
  return match?.[1] ? { brand: "Chromium", version: match[1] } : null;
}

function versionPlatform(): string | null {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return "win64";
  if (/Mac OS X/.test(ua)) return "mac";
  if (/CrOS/.test(ua)) return null;
  if (/Linux/.test(ua)) return "linux";
  return null;
}

/**
 * Public, anonymous Google endpoint: the stable releases Chrome is serving right now,
 * with their rollout fraction. Sends no user data; refreshed every few hours at most.
 */
export async function refreshChromeBaseline(force = false): Promise<BaselineCache | null> {
  const platform = versionPlatform();
  if (!platform) return null;
  const stored = (await chrome.storage.local.get(BASELINE_KEY))[BASELINE_KEY] as BaselineCache | undefined;
  if (!force && stored && stored.platform === platform && Date.now() - stored.at < REFRESH_MS) return stored;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(
      `https://versionhistory.googleapis.com/v1/chrome/platforms/${platform}/channels/stable/versions/all/releases?filter=endtime=none&pageSize=50`,
      { credentials: "omit", cache: "no-store", signal: controller.signal },
    );
    clearTimeout(timer);
    if (!response.ok) return stored ?? null;
    const json = (await response.json()) as {
      releases?: { version?: string; fraction?: number; serving?: { startTime?: string } }[];
    };
    const baseline = baselineFromReleases(
      (json.releases ?? []).map((r) => ({
        version: String(r.version ?? ""),
        fraction: Number(r.fraction ?? 0),
        startTime: String(r.serving?.startTime ?? ""),
      })),
    );
    if (!baseline) return stored ?? null;
    const next: BaselineCache = { ...baseline, platform, at: Date.now() };
    await chrome.storage.local.set({ [BASELINE_KEY]: next });
    await chrome.storage.local.remove(LEGACY_KEY);
    return next;
  } catch {
    return stored ?? null;
  }
}

async function getPref(setting: chrome.types.ChromeSetting | undefined): Promise<boolean | null> {
  if (!setting) return null;
  try {
    const details = await new Promise<{ value?: unknown }>((resolve) => setting.get({}, (d) => resolve(d ?? {})));
    return typeof details.value === "boolean" ? details.value : null;
  } catch {
    return null;
  }
}

export async function readPosture(): Promise<PostureItem[]> {
  const items: PostureItem[] = [];

  const installed = await installedChrome();
  let latest = await refreshChromeBaseline();
  // Never show a stale "needs update": re-check once if the cached answer is older than an hour.
  if (installed && latest && versionVerdict(installed.version, latest) !== "ok" && Date.now() - latest.at > 60 * 60 * 1000) {
    latest = await refreshChromeBaseline(true);
  }
  if (!installed) {
    items.push({
      id: "chrome-version",
      status: "unknown",
      title: chromeMessage("posture_versionUnknown", "Browser version unknown"),
      detail: chromeMessage("posture_versionUnknownBody", "Open your browser's About page and install any pending update."),
      fix: "chrome://settings/help",
    });
  } else if (installed.brand !== "Google Chrome" || !latest) {
    items.push({
      id: "chrome-version",
      status: "unknown",
      title: chromeMessage("posture_versionManual", "$1 $2", [installed.brand, installed.version]),
      detail: chromeMessage(
        "posture_versionManualBody",
        "Fundament cannot compare this browser with the latest release. Check its About page for updates; browser updates fix actively exploited holes.",
      ),
      fix: "chrome://settings/help",
    });
  } else {
    const verdict = versionVerdict(installed.version, latest);
    if (verdict === "ok") {
      items.push({
        id: "chrome-version",
        status: "ok",
        title: chromeMessage("posture_versionOk", "Chrome is up to date ($1)", installed.version),
        detail: chromeMessage("posture_versionOkBody", "Security fixes from the latest stable release are installed."),
      });
    } else if (verdict === "rolling") {
      items.push({
        id: "chrome-version",
        status: "warn",
        title: chromeMessage("posture_versionRolling", "Chrome update on its way ($1 → $2)", [installed.version, latest.version]),
        detail: chromeMessage(
          "posture_versionRollingBody",
          "Google started shipping this update recently. Chrome installs it on its own within a few days; relaunch Chrome when it asks.",
        ),
        fix: "chrome://settings/help",
      });
    } else {
      items.push({
        id: "chrome-version",
        status: "fail",
        title: chromeMessage("posture_versionOld", "Chrome needs an update ($1 → $2)", [installed.version, latest.version]),
        detail: chromeMessage(
          "posture_versionOldBody",
          "This Chrome version no longer gets security fixes that everyone else already has. Open About Chrome; if no update appears, Chrome may be blocked from updating.",
        ),
        fix: "chrome://settings/help",
      });
    }
  }

  const services = chrome.privacy?.services as
    | (typeof chrome.privacy.services & { safeBrowsingEnabled?: chrome.types.ChromeSetting })
    | undefined;
  // Only Google Chrome uses Google Safe Browsing. Edge (SmartScreen), Brave, Opera … report this
  // preference without it meaning anything about their own protection, so say nothing there.
  const safeBrowsing = installed?.brand === "Google Chrome" ? await getPref(services?.safeBrowsingEnabled) : null;
  if (safeBrowsing === false) {
    items.push({
      id: "safe-browsing",
      status: "fail",
      title: chromeMessage("posture_sbOff", "Chrome Safe Browsing is off"),
      detail: chromeMessage(
        "posture_sbOffBody",
        "Google's live list of malware and phishing sites is not protecting you. Fundament is a second layer, not a replacement. Turn on Standard or Enhanced protection.",
      ),
      fix: "chrome://settings/security",
    });
  } else if (safeBrowsing === true) {
    items.push({
      id: "safe-browsing",
      status: "ok",
      title: chromeMessage("posture_sbOn", "Chrome Safe Browsing is on"),
      detail: chromeMessage("posture_sbOnBody", "For the strongest setting choose Enhanced protection in Chrome's security settings."),
      fix: "chrome://settings/security",
    });
  }

  const websites = chrome.privacy?.websites as
    | (typeof chrome.privacy.websites & { thirdPartyCookiesAllowed?: chrome.types.ChromeSetting })
    | undefined;
  const thirdParty = await getPref(websites?.thirdPartyCookiesAllowed);
  if (thirdParty === true) {
    items.push({
      id: "third-party-cookies",
      status: "warn",
      title: chromeMessage("posture_3pcOn", "Third-party cookies are allowed"),
      detail: chromeMessage(
        "posture_3pcOnBody",
        "Trackers embedded on many sites can follow you with their own cookies. Blocking them breaks very few sites.",
      ),
      fix: "chrome://settings/cookies",
    });
  } else if (thirdParty === false) {
    items.push({
      id: "third-party-cookies",
      status: "ok",
      title: chromeMessage("posture_3pcOff", "Third-party cookies are blocked"),
      detail: chromeMessage("posture_3pcOffBody", "Cross-site cookie tracking is off."),
    });
  }

  return items;
}
