import { chromeMessage } from "@shared/chromeI18n";

export function downloadBlockedNotification(host: string, reason = ""): { title: string; message: string } {
  const safe = host.replace(/[\r\n]/g, "").slice(0, 80) || "download";
  const why = reason.replace(/[\r\n]/g, "").slice(0, 80);
  return {
    title: chromeMessage("notify_downloadTitle", "Fundament stopped a download"),
    message: why
      ? chromeMessage("notify_downloadBodyReason", "A file from $1 was not saved: $2.", [safe, why])
      : chromeMessage(
          "notify_downloadBody",
          "A file from $1 looked like a malware trick (double extension, HTTP program, or listed host). It was not saved.",
          safe,
        ),
  };
}

export function notifyDownloadBlocked(host: string, reason = ""): void {
  if (!chrome.notifications?.create) return;
  const copy = downloadBlockedNotification(host, reason);
  try {
    chrome.notifications.create(`fundament-dl-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: copy.title,
      message: copy.message,
      priority: 1,
    });
  } catch {
    /* older Chrome / missing icon */
  }
}
