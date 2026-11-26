/**
 * What one page costs the extension.
 * The bound is three times a fixed FNV-1a loop, the same rule as the engine budget.
 * The loop runs on the same clock as the work: in the service worker, or in the page.
 *
 *   node scripts/page-cost.mjs
 */
import { createServer } from "node:http";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

export const BUDGET_MULTIPLE = 3;
export const FRAME_COUNT = 20;
export const ELEMENT_COUNT = 3000;
/** Quiet Edge run, 2026-11-23. Five service-worker restarts sat near 750 ms. 38 500 000 steps took about 46 ms. */
export const SW_STEPS = 620_000_000;
/** The same run. The slowest content scan was under 9 ms. 2 000 000 steps took about 2.6 ms. */
export const FRAME_STEPS = 4_500_000;
/** Local Norton deletes Playwright's Chromium. CI has no Edge at this path. */
export const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

/**
 * @param {{ env: { FUNDAMENT_E2E_BROWSER?: string }, platform: string, exists: (path: string) => boolean }} input
 */
export function browserLaunchOptions(input) {
  const chosen = input.env?.FUNDAMENT_E2E_BROWSER;
  if (chosen) {
    if (!input.exists(chosen)) throw new Error(`FUNDAMENT_E2E_BROWSER does not exist: ${chosen}`);
    return { executablePath: chosen };
  }
  if (input.platform === "win32" && input.exists(EDGE_PATH)) return { executablePath: EDGE_PATH };
  return { channel: "chromium" };
}

export function calibrationLoop(steps) {
  const started = performance.now();
  let hash = 2166136261;
  for (let i = 0; i < steps; i += 1) {
    hash = Math.imul(hash ^ i, 16777619);
  }
  const elapsed = performance.now() - started;
  if (hash === 0) throw new Error("calibration collapsed");
  return elapsed;
}

export function median(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) >> 1] ?? 0;
}

export function withinBudget(elapsed, reference) {
  return reference > 0 && elapsed < BUDGET_MULTIPLE * reference;
}

function listed(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

/** Differences of one page opened with the extension and without it. */
export function sideDifferences(withExt, bare) {
  const left = withExt && typeof withExt === "object" ? withExt : {};
  const right = bare && typeof bare === "object" ? bare : {};
  const differences = [];
  const pageErrors = listed(left.pageErrors).filter((item) => !listed(right.pageErrors).includes(item));
  const consoleLines = listed(left.consoleErrors).filter((item) => !listed(right.consoleErrors).includes(item));
  const resource = consoleLines.filter((item) => item.startsWith("Failed to load resource"));
  const sandbox = consoleLines.filter((item) => item.includes("sandboxed") && item.includes("allow-scripts"));
  const consoleErrors = consoleLines.filter((item) => !resource.includes(item) && !sandbox.includes(item));
  if (pageErrors.length > 0) differences.push({ kind: "pageerror", items: pageErrors });
  if (consoleErrors.length > 0) differences.push({ kind: "console", items: consoleErrors });
  if (resource.length > 0) differences.push({ kind: "resource", items: resource });
  if (sandbox.length > 0) differences.push({ kind: "sandbox", items: sandbox });
  const loadDelta = Number(left.loadMs) - Number(right.loadMs);
  if (Number.isFinite(loadDelta) && loadDelta !== 0) differences.push({ kind: "load", deltaMs: loadDelta });
  if (left.failed === true && right.failed !== true) differences.push({ kind: "navigation", items: ["extension"] });
  if (right.failed === true && left.failed !== true) differences.push({ kind: "navigation", items: ["bare"] });
  return differences;
}

export function unexplained(differences, reasons) {
  const covered = new Set(
    (Array.isArray(reasons) ? reasons : [])
      .filter((reason) => reason && typeof reason.text === "string" && reason.text.trim().length > 0)
      .map((reason) => reason.kind),
  );
  return (Array.isArray(differences) ? differences : []).filter((difference) => !covered.has(difference.kind));
}

/** A pageerror, a new console error, or a navigation that dies only with the extension. */
export function brokenByExtension(differences) {
  return (Array.isArray(differences) ? differences : []).filter((difference) => {
    if (difference.kind === "pageerror" || difference.kind === "console") return true;
    return difference.kind === "navigation" && Array.isArray(difference.items) && difference.items.includes("extension");
  });
}

function listen(handler) {
  const server = createServer(handler);
  return new Promise((done) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      done({ server, port: typeof address === "object" && address ? address.port : 0 });
    });
  });
}

function heavyBody() {
  const frame = "&lt;!doctype html&gt;&lt;title&gt;frame&lt;/title&gt;&lt;p&gt;frame&lt;/p&gt;";
  const frames = Array.from({ length: FRAME_COUNT }, () => `<iframe srcdoc="${frame}"></iframe>`).join("");
  return `<!doctype html><title>heavy</title><body>${"<div></div>".repeat(ELEMENT_COUNT)}${frames}</body>`;
}

async function durations(worker, tabId, world, name) {
  const rows = await worker.evaluate(
    async (request) => {
      const results = await chrome.scripting.executeScript({
        target: { tabId: request.tabId, allFrames: true },
        world: request.world,
        func: (entryName) => performance.getEntriesByName(entryName).map((entry) => entry.duration),
        args: [request.name],
      });
      return results.map((row) => (Array.isArray(row.result) ? row.result[0] ?? null : null));
    },
    { tabId, world, name },
  );
  return rows;
}

function firstResult(promises) {
  return new Promise((resolve, reject) => {
    let pending = promises.length;
    let error;
    for (const promise of promises) {
      promise.then(resolve, (reason) => {
        error = reason;
        pending -= 1;
        if (pending === 0) reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  });
}

/**
 * Cold start until the new worker answers.
 * Chromium reuses the CDP target after runtime.reload(), so Playwright emits no
 * serviceworker event and the same Worker object answers the next evaluate.
 * Edge still attaches a new target. Whichever answers first, without the
 * pre-reload marker, is the restarted worker.
 */
async function swRestart(context) {
  const current = context.serviceWorkers()[0];
  if (!current) throw new Error("service worker missing");
  await current.evaluate(() => {
    globalThis.__fundamentBoot = 1;
  });
  const started = performance.now();
  let stop = false;
  const reloadSent = current.evaluate(() => chrome.runtime.reload()).catch(() => undefined);
  const ready = (worker) =>
    worker.evaluate(() => {
      if (globalThis.__fundamentBoot) throw new Error("stale worker");
      return chrome.runtime.getManifest().manifest_version;
    });
  const viaEvent = context.waitForEvent("serviceworker", { timeout: 20000 }).then((worker) => ready(worker).then(() => worker));
  const viaSame = (async () => {
    const deadline = started + 20000;
    while (!stop && performance.now() < deadline) {
      try {
        await ready(current);
        return current;
      } catch (error) {
        if (stop || performance.now() >= deadline) throw error;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    throw new Error("service worker did not answer");
  })();
  try {
    const worker = await firstResult([viaEvent, viaSame]);
    return { ms: performance.now() - started, worker };
  } finally {
    stop = true;
    void reloadSent;
  }
}

/**
 * @param {{ dist: string, swSteps: number, frameSteps: number }} options
 */
export async function measurePageCost(options) {
  const launch = browserLaunchOptions({ env: process.env, platform: process.platform, exists: existsSync });
  const { chromium } = await import("@playwright/test");
  const { server, port } = await listen((req, res) => {
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    const body = path === "/frame" ? "<!doctype html><title>frame</title><p>frame</p>" : heavyBody();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
  const profile = mkdtempSync(resolve(tmpdir(), "fundament-cost-"));
  const bareProfile = mkdtempSync(resolve(tmpdir(), "fundament-cost-bare-"));
  const context = await chromium.launchPersistentContext(profile, {
    ...launch,
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${options.dist}`, `--load-extension=${options.dist}`],
  });
  try {
    let worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker", { timeout: 20000 }));
    await worker.evaluate(() => chrome.runtime.getManifest().manifest_version);
    const swCalibration = [];
    for (let i = 0; i < 5; i += 1) swCalibration.push(await worker.evaluate(calibrationLoop, options.swSteps));
    const swRestarts = [];
    for (let i = 0; i < 5; i += 1) {
      const restarted = await swRestart(context);
      worker = restarted.worker;
      swRestarts.push(restarted.ms);
    }

    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const failedRequests = [];
    page.on("pageerror", (error) => pageErrors.push(String(error.message ?? error).slice(0, 180)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text().replace(/https?:\/\/\S+/g, "[url]").slice(0, 180));
    });
    page.on("requestfailed", (request) => {
      let path = request.url();
      try {
        path = new URL(request.url()).pathname;
      } catch {
        path = "unparsed";
      }
      failedRequests.push(`${request.failure()?.errorText ?? "failed"} ${path}`.slice(0, 180));
    });
    const started = performance.now();
    await page.goto(`http://127.0.0.1:${port}/heavy`, { waitUntil: "load", timeout: 20000 });
    const loadMs = performance.now() - started;
    const tabId = await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((item) => (item.url ?? "").includes("/heavy"));
      return tab?.id ?? -1;
    });
    if (tabId < 0) throw new Error("heavy tab was not found");
    let bridge = [];
    let content = [];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      bridge = await durations(worker, tabId, "MAIN", "fundament-bridge");
      content = await durations(worker, tabId, "ISOLATED", "fundament-content");
      const ready = bridge.filter((value) => typeof value === "number").length;
      const scanned = content.filter((value) => typeof value === "number").length;
      if (ready >= FRAME_COUNT + 1 && scanned >= FRAME_COUNT + 1) break;
      await page.waitForTimeout(200);
    }
    const frameCalibration = [];
    for (let i = 0; i < 5; i += 1) frameCalibration.push(await page.evaluate(calibrationLoop, options.frameSteps));
    await page.close();

    const bare = await chromium.launchPersistentContext(bareProfile, {
      ...launch,
      headless: true,
      viewport: { width: 1280, height: 800 },
      args: ["--disable-extensions"],
    });
    const barePage = await bare.newPage();
    const barePageErrors = [];
    const bareConsole = [];
    barePage.on("pageerror", (error) => barePageErrors.push(String(error.message ?? error).slice(0, 180)));
    barePage.on("console", (message) => {
      if (message.type() === "error") bareConsole.push(message.text().replace(/https?:\/\/\S+/g, "[url]").slice(0, 180));
    });
    const bareStarted = performance.now();
    let bareFailed = false;
    try {
      await barePage.goto(`http://127.0.0.1:${port}/heavy`, { waitUntil: "load", timeout: 20000 });
    } catch {
      bareFailed = true;
    }
    const bareLoadMs = performance.now() - bareStarted;
    await bare.close();

    const withExt = { pageErrors, consoleErrors, loadMs, failed: false };
    const without = { pageErrors: barePageErrors, consoleErrors: bareConsole, loadMs: bareLoadMs, failed: bareFailed };
    return {
      swMs: swRestarts,
      swCalibration,
      bridgeMs: bridge.filter((value) => typeof value === "number"),
      contentMs: content.filter((value) => typeof value === "number"),
      frameCalibration,
      withExt,
      without,
      differences: sideDifferences(withExt, without),
      failedRequests,
    };
  } finally {
    await context.close().catch(() => undefined);
    server.close();
    rmSync(profile, { recursive: true, force: true });
    rmSync(bareProfile, { recursive: true, force: true });
  }
}

const invoked = process.argv[1]?.endsWith("page-cost.mjs");
if (invoked) {
  const root = resolve(import.meta.dirname, "..");
  const result = await measurePageCost({
    dist: resolve(root, "dist"),
    swSteps: Number(process.env.FUNDAMENT_SW_STEPS || SW_STEPS),
    frameSteps: Number(process.env.FUNDAMENT_FRAME_STEPS || FRAME_STEPS),
  });
  const sw = median(result.swMs);
  const swRef = median(result.swCalibration);
  const bridge = Math.max(...result.bridgeMs);
  const content = Math.max(...result.contentMs);
  const frameRef = median(result.frameCalibration);
  console.log(
    JSON.stringify({
      sw,
      swRef,
      swRatio: sw / swRef,
      bridge,
      content,
      frameRef,
      bridgeRatio: bridge / frameRef,
      contentRatio: content / frameRef,
      frames: result.bridgeMs.length,
      scans: result.contentMs.length,
      differences: result.differences,
      failedRequests: result.failedRequests,
      swSamples: result.swMs.map((value) => Number(value.toFixed(1))),
      bridgeSamples: result.bridgeMs.map((value) => Number(value.toFixed(2))),
      contentSamples: result.contentMs.map((value) => Number(value.toFixed(2))),
    }),
  );
}
