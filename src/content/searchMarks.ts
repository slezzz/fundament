/**
 * Classic content script. No imports.
 * Marks risky destinations on search result pages. Never rewrites links.
 */

function isResultsPath(): boolean {
  const host = location.hostname.toLowerCase();
  const path = location.pathname;
  if (host.includes("google.")) {
    return path === "/search" || path.startsWith("/search");
  }
  if (host === "www.bing.com" || host === "bing.com") {
    return path === "/search" || path.startsWith("/search");
  }
  if (host === "duckduckgo.com" || host === "www.duckduckgo.com") {
    return location.search.includes("q=");
  }
  if (host === "search.yahoo.com") {
    return path.startsWith("/search");
  }
  return false;
}

function resultAnchors(): HTMLAnchorElement[] {
  const scopes = ["#rso", "#search", "#b_results", "#links", "[data-testid='result']"];
  for (const scope of scopes) {
    const root = document.querySelector(scope);
    if (root) {
      return Array.from(root.querySelectorAll("a[href]")) as HTMLAnchorElement[];
    }
  }
  return Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
}

function collectHrefs(): string[] {
  const hrefs: string[] = [];
  const seen = new Set<string>();
  for (const anchor of resultAnchors()) {
    if (hrefs.length >= 24) break;
    const href = anchor.href;
    if (!href || href.length > 2000) continue;
    if (!href.startsWith("http://") && !href.startsWith("https://")) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    hrefs.push(href);
  }
  return hrefs;
}

function ensureStyle(): void {
  if (document.getElementById("fundament-serp-style")) return;
  const style = document.createElement("style");
  style.id = "fundament-serp-style";
  style.textContent =
    ".fundament-serp{display:inline-block;margin-left:8px;padding:1px 7px;font-size:11px;font-weight:650;letter-spacing:0.02em;color:#5c2e00;background:#f4e6c8;border:1px solid rgba(92,46,0,0.18);border-radius:4px;vertical-align:middle;font-family:Segoe UI,sans-serif;}";
  (document.head || document.documentElement).appendChild(style);
}

function stamp(href: string, label: string): void {
  const nodes = document.querySelectorAll(`a[href]`);
  for (const node of Array.from(nodes)) {
    const anchor = node as HTMLAnchorElement;
    if (anchor.href !== href) continue;
    if (anchor.dataset.fundamentSerp === "1") continue;
    anchor.dataset.fundamentSerp = "1";
    const mark = document.createElement("span");
    mark.className = "fundament-serp";
    mark.textContent = label;
    mark.title = "Fundament: local check on this result destination";
    anchor.insertAdjacentElement("afterend", mark);
  }
}

let lastKey = "";
let lastMarks: { href: string; label: string }[] = [];
let inFlight = false;

function applyMarks(marks: { href: string; label: string }[]): void {
  ensureStyle();
  for (const mark of marks) {
    if (typeof mark.href === "string" && typeof mark.label === "string") {
      stamp(mark.href, mark.label.slice(0, 80));
    }
  }
}

function run(): void {
  if (!isResultsPath() || document.hidden || inFlight) return;
  void chrome.storage.local.get("settings").then((stored) => {
    const settings = stored.settings as { searchMarks?: boolean; phishingProtection?: boolean } | undefined;
    if (settings?.searchMarks === false) return;
    if (settings?.phishingProtection === false) return;
    const hrefs = collectHrefs();
    if (hrefs.length === 0) return;
    const key = hrefs.join("\n");
    if (key === lastKey) {
      if (lastMarks.length > 0) applyMarks(lastMarks);
      return;
    }
    inFlight = true;
    chrome.runtime.sendMessage({ type: "SEARCH_MARK", hrefs }, (response: { type?: string; marks?: { href: string; label: string }[] } | undefined) => {
      inFlight = false;
      if (chrome.runtime.lastError) return;
      if (response?.type !== "SEARCH_MARKS" || !Array.isArray(response.marks)) return;
      lastKey = key;
      lastMarks = response.marks;
      applyMarks(lastMarks);
    });
  });
}

let timer = 0;
function schedule(): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(run, 500);
}

if (isResultsPath()) {
  const idle = window.requestIdleCallback;
  if (typeof idle === "function") idle(() => run(), { timeout: 1500 });
  else window.setTimeout(run, 200);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule();
  });
}
