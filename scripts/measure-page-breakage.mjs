/**
 * Same page with the extension and without it.
 * Not for CI. Writes measure-output/page-breakage.json (gitignored):
 * host, class, warning bit. No path, no page text.
 *
 *   node scripts/measure-page-breakage.mjs
 *
 * FUNDAMENT_MEASURE_MAJESTIC   home pages (default 2000, at most 10 000)
 * FUNDAMENT_MEASURE_LIMIT      stop after this many (0 = the cap)
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brokenByExtension, sideDifferences } from "./page-cost.mjs";
import { hostnameOnly, loadTargets } from "./measure-page-signals.mjs";

export function netClass(error) {
  const text = String(error && error.message ? error.message : error);
  if (/NAME_NOT_RESOLVED|ERR_NAME/.test(text)) return "dns";
  if (/TIMED_OUT|Timeout/i.test(text)) return "timeout";
  if (/ERR_HTTP|HTTP_RESPONSE/.test(text)) return "http";
  if (/CONNECTION_CLOSED|CONNECTION_RESET|CONNECTION_REFUSED|INTERNET_DISCONNECTED|NETWORK_CHANGED|ERR_FAILED|ERR_CONNECTION/.test(text)) return "network";
  if (/closed|Target page/i.test(text)) return "closed";
  return "other";
}

export function breakageRow(withExt, bare) {
  const left = withExt && typeof withExt === "object" ? withExt : { failed: true, reason: "other" };
  const right = bare && typeof bare === "object" ? bare : { failed: true, reason: "other" };
  if (left.failed && right.failed) {
    return { measured: false, broken: false, warned: false, failClass: left.reason || "other" };
  }
  const differences = sideDifferences(left, right);
  const broken = brokenByExtension(differences);
  const resource = differences.some((difference) => difference.kind === "resource");
  const sandbox = differences.some((difference) => difference.kind === "sandbox");
  let failClass = "ok";
  if (broken.length > 0) failClass = broken.map((difference) => difference.kind).join("+");
  else if (resource) failClass = "resource";
  else if (sandbox) failClass = "sandbox";
  return {
    measured: true,
    broken: broken.length > 0,
    warned: left.warned === true,
    resource,
    sandbox,
    failClass,
  };
}

function readRows(file) {
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed.rows) ? parsed.rows : [];
  } catch {
    return [];
  }
}

export function breakageSummary(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const measured = list.filter((row) => row && row.measured === true);
  const missed = list.filter((row) => row && row.measured !== true);
  const classes = {};
  for (const row of missed) {
    const name = typeof row.failClass === "string" ? row.failClass : "other";
    classes[name] = (classes[name] ?? 0) + 1;
  }
  return {
    pages: list.length,
    measured: measured.length,
    notMeasured: missed.length,
    warnings: measured.filter((row) => row.warned === true).length,
    broken: measured.filter((row) => row.broken === true).length,
    resourceOnly: measured.filter((row) => row.broken !== true && row.resource === true).length,
    sandboxOnly: measured.filter((row) => row.broken !== true && row.resource !== true && row.sandbox === true).length,
    failClasses: classes,
  };
}

async function readWarned(worker, host) {
  return worker.evaluate(async (expected) => {
    const stored = await chrome.storage.session.get(null);
    const same = (left, right) => left === right || right.endsWith(`.${left}`) || left.endsWith(`.${right}`);
    for (const [key, value] of Object.entries(stored)) {
      if (!key.startsWith("tab:") || !value || typeof value !== "object") continue;
      let found = "";
      try {
        found = new URL(value.analysis?.url || value.url || "").hostname.toLowerCase();
      } catch {
        found = "";
      }
      if (!found || !same(String(expected || ""), found)) continue;
      const band = typeof value.analysis?.band === "string" ? value.analysis.band : "";
      if (value.interstitial === true || band === "high" || band === "critical") return true;
    }
    return false;
  }, host);
}

async function openPage(page, url) {
  const pageErrors = [];
  const consoleErrors = [];
  const onError = (error) => {
    const message = String(error && error.message ? error.message : error && error.name ? error.name : "Error");
    const stack = String(error && error.stack ? error.stack : "")
      .split("\n")
      .slice(0, 3)
      .join(" | ");
    pageErrors.push(`${message} :: ${stack}`.replace(/https?:\/\/\S+/g, "[url]").slice(0, 300));
  };
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().replace(/https?:\/\/\S+/g, "[url]").slice(0, 160));
  };
  page.on("pageerror", onError);
  page.on("console", onConsole);
  const started = performance.now();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(700);
    return { failed: false, reason: "ok", pageErrors, consoleErrors, loadMs: performance.now() - started };
  } catch (error) {
    return { failed: true, reason: netClass(error), pageErrors, consoleErrors, loadMs: performance.now() - started };
  } finally {
    page.off("pageerror", onError);
    page.off("console", onConsole);
  }
}

function forceKill(profile) {
  const name = basename(profile).replace(/[^a-z0-9-]/gi, "");
  if (!name.startsWith("fundament-break-")) return Promise.resolve();
  return new Promise((done) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | Where-Object { $_.CommandLine -like '*${name}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`],
      () => done(),
    );
  });
}

const invoked = process.argv[1]?.endsWith("measure-page-breakage.mjs");
if (invoked) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const dist = resolve(root, "dist");
  const executablePath = process.env.FUNDAMENT_E2E_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const cap = Math.max(1, Math.min(10000, Number(process.env.FUNDAMENT_MEASURE_MAJESTIC || 2000) || 2000));
  const limit = Math.max(0, Number(process.env.FUNDAMENT_MEASURE_LIMIT || 0) || 0);
  const targets = loadTargets(root, cap).majestic.slice(0, limit > 0 ? limit : cap);
  const only = new Set((process.env.FUNDAMENT_MEASURE_HOSTS || "").split(",").map((item) => item.trim()).filter(Boolean));
  const selected = only.size > 0 ? targets.filter((target) => only.has(target.host)) : targets;
  const file = resolve(root, "measure-output", "page-breakage.json");
  const rows = readRows(file);
  const done = new Set(rows.map((row) => row.host));
  const { chromium } = await import("@playwright/test");

  async function launch(profile, args) {
    const context = await chromium.launchPersistentContext(profile, {
      executablePath,
      headless: true,
      viewport: { width: 1280, height: 800 },
      args,
    });
    return context;
  }

  let withProfile = mkdtempSync(resolve(tmpdir(), "fundament-break-with-"));
  let bareProfile = mkdtempSync(resolve(tmpdir(), "fundament-break-bare-"));
  let withContext = await launch(withProfile, [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]);
  let bareContext = await launch(bareProfile, ["--disable-extensions"]);
  let worker = withContext.serviceWorkers()[0] ?? (await withContext.waitForEvent("serviceworker", { timeout: 20000 }));
  let used = 0;

  async function recycle() {
    await withContext.close().catch(() => undefined);
    await bareContext.close().catch(() => undefined);
    await forceKill(withProfile);
    await forceKill(bareProfile);
    rmSync(withProfile, { recursive: true, force: true });
    rmSync(bareProfile, { recursive: true, force: true });
    withProfile = mkdtempSync(resolve(tmpdir(), "fundament-break-with-"));
    bareProfile = mkdtempSync(resolve(tmpdir(), "fundament-break-bare-"));
    withContext = await launch(withProfile, [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]);
    bareContext = await launch(bareProfile, ["--disable-extensions"]);
    worker = withContext.serviceWorkers()[0] ?? (await withContext.waitForEvent("serviceworker", { timeout: 20000 }));
    used = 0;
  }

  try {
    for (const target of selected) {
      const host = hostnameOnly(target.host);
      if (!host || done.has(host)) continue;
      if (used >= 20) await recycle();
      const withPage = await withContext.newPage();
      const barePage = await bareContext.newPage();
      let withVisit;
      let bareVisit;
      try {
        [withVisit, bareVisit] = await Promise.all([openPage(withPage, target.url), openPage(barePage, target.url)]);
        if (!withVisit.failed) {
          try {
            withVisit.warned = await readWarned(worker, host);
          } catch {
            withVisit.warned = false;
          }
        }
      } catch (error) {
        withVisit = { failed: true, reason: netClass(error), pageErrors: [], consoleErrors: [], loadMs: 0 };
        bareVisit = { failed: true, reason: netClass(error), pageErrors: [], consoleErrors: [], loadMs: 0 };
      } finally {
        await withPage.close().catch(() => undefined);
        await barePage.close().catch(() => undefined);
      }
      const judged = breakageRow(withVisit, bareVisit);
      rows.push({ host, ...judged });
      done.add(host);
      used += 1;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, `${JSON.stringify({ ...breakageSummary(rows), rows }, null, 2)}\n`);
      const mark = judged.measured ? (judged.broken ? "broken" : judged.warned ? "warn" : "ok") : `skip ${judged.failClass}`;
      if (judged.broken) console.log(JSON.stringify(sideDifferences(withVisit, bareVisit)));
      console.log(`${rows.length} ${host} ${mark}`);
    }
    console.log(JSON.stringify(breakageSummary(rows)));
  } finally {
    await withContext.close().catch(() => undefined);
    await bareContext.close().catch(() => undefined);
    await forceKill(withProfile);
    await forceKill(bareProfile);
    rmSync(withProfile, { recursive: true, force: true });
    rmSync(bareProfile, { recursive: true, force: true });
  }
}
