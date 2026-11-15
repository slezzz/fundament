import { analyzeUrl } from "@engine/analyze";
import { looksLikeHtmlSmugglingName } from "@engine/page/clickfix";
import { freeHostingSuffix } from "@engine/url/hosting";
import type { Settings, UrlAnalysis } from "@shared/types";

/** Files that run code when opened on Windows / macOS / Android. */
export const EXECUTABLE_EXT =
  /\.(exe|scr|bat|cmd|com|pif|cpl|ps1|psm1|vbs|vbe|wsf|wsh|js|jse|hta|msi|msix|msixbundle|appx|appxbundle|appinstaller|msp|mst|jar|dll|reg|lnk|url|scf|iso|img|vhd|vhdx|one|chm|xll|xlam|application|gadget|apk|xapk|dmg|pkg|app|command|sh|run|bin)$/i;
/** Containers that commonly smuggle the above past mail and web filters. */
export const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz|tgz|cab|arj|ace|xz|bz2)$/i;

const extraMalwareHosts = new Set<string>();

if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
  void fetch(chrome.runtime.getURL("data/malware-download-hosts.json"))
    .then((response) => (response.ok ? response.json() : []))
    .then((raw: unknown) => {
      if (!Array.isArray(raw)) return;
      for (const item of raw) {
        if (typeof item === "string" && item.length > 0 && item.length < 254) {
          extraMalwareHosts.add(item.toLowerCase());
        }
      }
    })
    .catch(() => undefined);
}

function basename(path: string): string {
  const trimmed = path.split("?")[0] ?? path;
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] ?? trimmed;
}

export type DownloadVerdict = { block: false } | { block: true; reason: string };

/** Synchronous checks on URL + filename only. */
export function looksDangerousDownload(
  url: string,
  extraHosts: Iterable<string> = extraMalwareHosts,
  filename = "",
): boolean {
  return quickVerdict(url, filename, extraHosts).block;
}

export function quickVerdict(url: string, filename: string, extraHosts: Iterable<string> = extraMalwareHosts): DownloadVerdict {
  const name = basename(filename).toLowerCase();
  const tail = name.slice(-512);
  if (name && looksLikeHtmlSmugglingName(name)) return { block: true, reason: "disguised file type" };
  if (tail && /\.(pdf|jpe?g|png|gif|txt|docx?|xlsx?|pptx?|zip|mp3|mp4)\s*\.(exe|scr|js|bat|cmd|com|ps1|html?|svg|lnk|hta|vbs|msi)$/i.test(tail)) {
    return { block: true, reason: "double extension" };
  }
  if (name && /[‪-‮⁦-⁩]/.test(name.slice(0, 64) + name.slice(-256))) return { block: true, reason: "right-to-left filename trick" };
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "blob:" || parsed.protocol === "data:") return { block: false };
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { block: false };
    const host = parsed.hostname.toLowerCase();
    for (const listed of extraHosts) {
      if (host === listed || host.endsWith(`.${listed}`)) return { block: true, reason: "known malware host" };
    }
    const path = parsed.pathname.toLowerCase();
    const urlName = basename(path);
    if (looksLikeHtmlSmugglingName(urlName)) return { block: true, reason: "disguised file type" };
    if (/\.(pdf|jpg|jpeg|png|gif|txt|doc|docx|zip)\.(exe|scr|js|bat|cmd|com|ps1|html|htm)$/i.test(urlName.slice(-512))) {
      return { block: true, reason: "double extension" };
    }
    const executable = EXECUTABLE_EXT.test(name || urlName);
    if (parsed.protocol === "http:" && executable) return { block: true, reason: "program over unencrypted HTTP" };
    if (executable && freeHostingSuffix(host)) return { block: true, reason: "program from free hosting" };
    return { block: false };
  } catch {
    return { block: false };
  }
}

function risky(analysis: UrlAnalysis | null): boolean {
  if (!analysis) return false;
  return analysis.band === "high" || analysis.band === "critical" || analysis.signals.some((s) => s.severity === "fail");
}

/**
 * Programs and archives inherit the risk of the page that offered them: a fake
 * "browser update" or "captcha" page usually serves its payload over clean HTTPS.
 */
export async function contextVerdict(
  url: string,
  filename: string,
  referrer: string,
  settings: Settings,
  tabAnalysis: UrlAnalysis | null,
  isPopular?: (registrable: string, hostname?: string) => boolean,
): Promise<DownloadVerdict> {
  const name = basename(filename || url).toLowerCase();
  const executable = EXECUTABLE_EXT.test(name);
  const archive = ARCHIVE_EXT.test(name);
  const input = {
    allowlist: settings.allowlist,
    blocklist: settings.blocklist,
    phishingProtection: settings.phishingProtection,
    threatProtection: settings.threatProtection,
    securityLevel: settings.securityLevel,
    isPopular,
  };
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const own = await analyzeUrl({ ...input, url });
    if (!own.allowlisted && risky(own)) return { block: true, reason: "risky download address" };
  }
  if (!executable && !archive) return { block: false };
  if (risky(tabAnalysis)) return { block: true, reason: "program offered by a dangerous page" };
  if (referrer && (referrer.startsWith("http://") || referrer.startsWith("https://"))) {
    const ref = await analyzeUrl({ ...input, url: referrer });
    if (!ref.allowlisted && (risky(ref) || ref.band === "suspicious")) {
      return { block: true, reason: "program offered by a suspicious page" };
    }
  }
  return { block: false };
}

export function attachDownloadProtection(
  settingsOf: () => Promise<Settings>,
  tabAnalysisOf: (url: string) => Promise<UrlAnalysis | null>,
  popularityOf: () => Promise<(registrable: string, hostname?: string) => boolean>,
  onBlocked: (host: string, reason: string) => Promise<void>,
): void {
  // onDeterminingFilename holds the download until we call suggest(): the file is not
  // handed to the user (or auto-opened) before the verdict, unlike onCreated + cancel.
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    let suggested = false;
    const release = (): void => {
      if (suggested) return;
      suggested = true;
      try {
        suggest();
      } catch {
        /* download already gone */
      }
    };
    const url = item.finalUrl || item.url || "";
    const host = (() => {
      try {
        return new URL(url).hostname || "download";
      } catch {
        return "download";
      }
    })();

    const block = async (reason: string): Promise<void> => {
      try {
        await chrome.downloads.cancel(item.id);
      } catch {
        /* ignore */
      }
      release();
      try {
        await chrome.downloads.erase({ id: item.id });
      } catch {
        /* ignore */
      }
      await onBlocked(host, reason);
    };

    void (async () => {
      try {
        const settings = await settingsOf();
        if (!settings.downloadProtection || !settings.threatProtection) {
          release();
          return;
        }
        const quick = quickVerdict(url, item.filename ?? "");
        if (quick.block) {
          await block(quick.reason);
          return;
        }
        const tabAnalysis = item.referrer ? await tabAnalysisOf(item.referrer) : null;
        const context = await contextVerdict(url, item.filename ?? "", item.referrer ?? "", settings, tabAnalysis, await popularityOf());
        if (context.block) {
          await block(context.reason);
          return;
        }
        release();
      } catch {
        release();
      }
    })();
    return true;
  });
}
