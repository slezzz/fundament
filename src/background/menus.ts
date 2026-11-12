import { parseDomain } from "@engine/domain/parse";
import { parseHttpUrl } from "@engine/url/parse";
import { chromeMessage } from "@shared/chromeI18n";

export function siteKeyFromUrl(url: string): string | null {
  try {
    const parsed = parseHttpUrl(url);
    return parseDomain(parsed)?.registrableDomain ?? parsed.hostname;
  } catch {
    return null;
  }
}

export function contextMenuItems(): { id: string; title: string }[] {
  return [
    { id: "fundament-allow", title: chromeMessage("menu_allow", "Fundament: allow this site") },
    { id: "fundament-block", title: chromeMessage("menu_block", "Fundament: block this site") },
    { id: "fundament-pause", title: chromeMessage("menu_pause", "Fundament: page broken? Pause 15 min") },
  ];
}

function siteKeyFromTab(tab?: chrome.tabs.Tab): string | null {
  const url = tab?.url;
  if (!url) return null;
  return siteKeyFromUrl(url);
}

export function attachContextMenus(handlers: {
  allow: (host: string) => Promise<void>;
  block: (host: string) => Promise<void>;
  pause: (host: string) => Promise<void>;
}): void {
  function createMenus(): void {
    chrome.contextMenus.removeAll(() => {
      for (const item of contextMenuItems()) {
        chrome.contextMenus.create({
          id: item.id,
          title: item.title,
          contexts: ["page", "action"],
        });
      }
    });
  }

  chrome.runtime.onInstalled.addListener(createMenus);
  chrome.runtime.onStartup.addListener(createMenus);

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const host = siteKeyFromTab(tab);
    if (!host) return;
    void (async () => {
      if (info.menuItemId === "fundament-allow") await handlers.allow(host);
      if (info.menuItemId === "fundament-block") await handlers.block(host);
      if (info.menuItemId === "fundament-pause") await handlers.pause(host);
    })();
  });
}
