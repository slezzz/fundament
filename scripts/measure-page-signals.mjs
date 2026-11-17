/**
 * Local measurement of page signals on real sites.
 * Loads dist/ in Edge and opens public pages over the real network.
 * Not for CI. Writes measure-output/page-signals.json (gitignored): hostnames,
 * signal names, and counts. Page text and paths stay on the machine.
 *
 *   node scripts/measure-page-signals.mjs
 *
 * FUNDAMENT_E2E_BROWSER  Edge (or Chromium) executable
 * FUNDAMENT_MEASURE_GROUPS  corpus,docs,majestic (default all)
 * FUNDAMENT_MEASURE_LIMIT   max pages per group (default 0 = all)
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SIGNAL_ID = /^[a-z][a-z0-9-]{0,48}$/;
const GROUPS = ["corpus", "docs", "majestic"];
const COPY_LABELS = new Set(["copy", "kopieren", "copy to clipboard", "in die zwischenablage kopieren"]);

export function hostnameOnly(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    if (raw.includes("://") || raw.startsWith("//")) {
      const url = new URL(raw.includes("://") ? raw : `https:${raw}`);
      return cleanHost(url.hostname);
    }
  } catch {
    return "";
  }
  const first = raw.split("/")[0]?.split("?")[0]?.split("#")[0] ?? "";
  return cleanHost(first);
}

function cleanHost(host) {
  const name = String(host).replace(/\.$/, "").toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/.test(name)) return "";
  return name;
}

function cleanSignals(value) {
  if (!Array.isArray(value)) return [];
  const ids = [];
  for (const item of value) {
    const id = typeof item === "string" ? item : item && typeof item.id === "string" ? item.id : "";
    if (SIGNAL_ID.test(id) && !ids.includes(id)) ids.push(id);
  }
  ids.sort();
  return ids;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

export function publicRecord(input) {
  const source = input && typeof input === "object" ? input : {};
  const status = source.status === "measured" ? "measured" : "not-measured";
  const group = GROUPS.includes(source.group) ? source.group : "docs";
  const copyClicks = clamp(source.copyClicks, 0, 2);
  const warned = status === "measured" && source.warned === true;
  return {
    group,
    index: clamp(source.index, 0, 100000),
    host: hostnameOnly(source.host || source.url || ""),
    signals: status === "measured" ? cleanSignals(source.signals) : [],
    warned,
    status,
    copyClicks,
    copyWarned: copyClicks > 0 && source.copyWarned === true && warned,
  };
}

export function summary(records, date) {
  const rows = Array.isArray(records) ? records.map((row) => publicRecord(row)) : [];
  const measured = rows.filter((row) => row.status === "measured");
  const warnings = measured.filter((row) => row.warned);
  const bySignal = {};
  for (const row of measured) {
    for (const id of row.signals) {
      const bucket = bySignal[id] ?? { seen: 0, warned: 0 };
      bucket.seen += 1;
      if (row.warned) bucket.warned += 1;
      bySignal[id] = bucket;
    }
  }
  const hosts = [];
  for (const row of warnings) {
    if (row.host && !hosts.includes(row.host)) hosts.push(row.host);
  }
  hosts.sort();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(date ?? "")) ? String(date) : "";
  return {
    date: day,
    pages: rows.length,
    measured: measured.length,
    notMeasured: rows.length - measured.length,
    warnings: warnings.length,
    bySignal,
    warningHosts: hosts,
  };
}

function urlsFromJson(file) {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) return [];
  const targets = [];
  for (const row of parsed) {
    const url = row && typeof row.url === "string" ? row.url : "";
    const host = hostnameOnly(url);
    if (!host || !url.startsWith("https://") || url.includes("?")) continue;
    targets.push({ host, url });
  }
  return targets;
}

function urlsFromLines(file) {
  if (!existsSync(file)) return [];
  const targets = [];
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const url = raw.trim();
    if (!url || url.startsWith("#")) continue;
    const host = hostnameOnly(url);
    if (!host || !url.startsWith("https://") || url.includes("?")) continue;
    targets.push({ host, url });
  }
  return targets;
}

function uniqueTargets(targets) {
  const seen = new Set();
  const out = [];
  for (const target of targets) {
    if (seen.has(target.url)) continue;
    seen.add(target.url);
    out.push(target);
  }
  return out;
}

export function loadTargets(root) {
  const corpus = urlsFromJson(resolve(root, "tests/fixtures/page-text/snapshots.json"));
  const docs = uniqueTargets([
    ...urlsFromJson(resolve(root, "tests/fixtures/page-text/hosted-docs.json")),
    ...urlsFromLines(resolve(root, "scripts/measure-doc-urls.txt")),
  ]);
  const majestic = [];
  const popular = readFileSync(resolve(root, "public/data/popular-domains.txt"), "utf8");
  for (const raw of popular.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const host = hostnameOnly(line);
    if (!host) continue;
    majestic.push({ host, url: `https://${host}/` });
    if (majestic.length === 500) break;
  }
  return { corpus, docs, majestic };
}

function outputFile(root) {
  return resolve(root, "measure-output", "page-signals.json");
}

function readRows(file) {
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
    return rows.map((row) => publicRecord(row));
  } catch {
    return [];
  }
}

function writeRows(file, rows) {
  const clean = rows.map((row) => publicRecord(row));
  const day = new Date().toISOString().slice(0, 10);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ ...summary(clean, day), rows: clean }, null, 2)}\n`);
}

async function readHits(worker, host) {
  return worker.evaluate(async (expected) => {
    const stored = await chrome.storage.session.get(null);
    const hits = [];
    for (const [key, value] of Object.entries(stored)) {
      if (!key.startsWith("tab:") || !value || typeof value !== "object") continue;
      let found = "";
      try {
        found = new URL(value.analysis?.url || value.url || "").hostname.toLowerCase();
      } catch {
        found = "";
      }
      if (!found || (found !== expected && !found.endsWith(`.${expected}`) && !expected.endsWith(`.${found}`))) continue;
      const signals = [];
      const list = value.analysis?.signals;
      if (Array.isArray(list)) {
        for (const signal of list) {
          if (signal && typeof signal.id === "string") signals.push(signal.id);
        }
      }
      const band = typeof value.analysis?.band === "string" ? value.analysis.band : "";
      hits.push({
        host: found,
        signals,
        warned: value.interstitial === true || band === "high" || band === "critical",
      });
    }
    return hits;
  }, host);
}

async function clickCopy(page) {
  return page
    .evaluate((labels) => {
      const allowed = new Set(labels);
      const nodes = document.querySelectorAll("button, [role='button']");
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        const name = (node.getAttribute("aria-label") || node.innerText || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (!allowed.has(name)) continue;
        node.click();
        return 1;
      }
      return 0;
    }, [...COPY_LABELS])
    .catch(() => 0);
}

function netCode(error) {
  const message = error instanceof Error ? error.message : "";
  const code = /ERR_[A-Z0-9_]+/.exec(message);
  if (code?.[0]) return code[0];
  if (/timeout/i.test(message)) return "timeout";
  if (/closed/i.test(message)) return "closed";
  return "goto";
}

async function pageState(page) {
  let url = "";
  try {
    url = page.url();
  } catch {
    return "closed";
  }
  if (!url || url.startsWith("chrome-error:") || url.startsWith("about:") || url.startsWith("edge:")) return "blocked";
  if (url.includes("warning.html")) return "warning";
  try {
    const blocked = await page.evaluate(() => {
      const text = (document.body?.innerText || "").slice(0, 400).toLowerCase();
      return (
        text.includes("can't be reached") ||
        text.includes("can’t be reached") ||
        text.includes("nicht erreichbar") ||
        text.includes("err_connection") ||
        text.includes("err_name_not_resolved") ||
        (text.includes("norton") && text.includes("blocked"))
      );
    });
    return blocked ? "blocked" : "ok";
  } catch {
    return "closed";
  }
}

async function visit(page, worker, job) {
  const blank = { group: job.group, index: job.index, host: job.host, signals: [], warned: false, status: "not-measured", copyClicks: 0, copyWarned: false };
  try {
    await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch (error) {
    const state = await pageState(page);
    if (state !== "warning") return { row: blank, reason: state === "closed" ? "closed" : netCode(error) };
  }
  const state = await pageState(page);
  if (state === "blocked") return { row: blank, reason: "blocked" };
  if (state === "closed") return { row: blank, reason: "closed" };
  await page.waitForLoadState("load", { timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  let hits = [];
  try {
    hits = await readHits(worker, job.host);
  } catch {
    return { row: blank, reason: "worker" };
  }
  const warnedByPage = state === "warning" || page.url().includes("warning.html");
  if (hits.length === 0 && !warnedByPage) return { row: blank, reason: "no-record" };
  const hit = hits.find((row) => row.warned) ?? hits[0] ?? { signals: [], warned: false };
  let warned = hit.warned === true || warnedByPage;
  let copyClicks = 0;
  let copyWarned = false;
  if (!warned) {
    copyClicks = await clickCopy(page);
    if (copyClicks > 0) {
      await page.waitForTimeout(1000);
      let after = [];
      try {
        after = await readHits(worker, job.host);
      } catch {
        after = [];
      }
      const copied = after.find((row) => row.warned);
      if (copied || page.url().includes("warning.html")) {
        warned = true;
        copyWarned = true;
        if (copied) hit.signals = copied.signals;
      }
    }
  }
  return {
    row: {
      group: job.group,
      index: job.index,
      host: job.host,
      signals: hit.signals,
      warned,
      status: "measured",
      copyClicks,
      copyWarned,
    },
    reason: "ok",
  };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const dist = resolve(root, "dist");
  if (!existsSync(resolve(dist, "manifest.json"))) {
    console.error("dist/ is missing");
    process.exitCode = 1;
    return;
  }
  const executablePath = process.env.FUNDAMENT_E2E_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  if (!existsSync(executablePath)) {
    console.error("browser executable was not found");
    process.exitCode = 1;
    return;
  }
  const selected = new Set((process.env.FUNDAMENT_MEASURE_GROUPS || GROUPS.join(",")).split(",").map((item) => item.trim()));
  const limit = clamp(process.env.FUNDAMENT_MEASURE_LIMIT || "0", 0, 100000);
  const targets = loadTargets(root);
  const jobs = [];
  for (const group of GROUPS) {
    if (!selected.has(group)) continue;
    const list = targets[group];
    const cap = limit > 0 ? Math.min(limit, list.length) : list.length;
    for (let index = 0; index < cap; index += 1) {
      const target = list[index];
      if (!target) continue;
      jobs.push({ group, index, host: target.host, url: target.url });
    }
  }
  const file = outputFile(root);
  const rows = readRows(file).filter((row) => row.status === "measured");
  const done = new Set(rows.map((row) => `${row.group}:${row.index}`));
  const { chromium } = await import("@playwright/test");
  const relaunch = new Set(["closed", "worker", "goto", "timeout", "ERR_INTERNET_DISCONNECTED", "ERR_NETWORK_CHANGED", "ERR_FAILED"]);

  async function openSession() {
    const profile = mkdtempSync(resolve(tmpdir(), "fundament-measure-"));
    const context = await chromium.launchPersistentContext(profile, {
      executablePath,
      headless: true,
      acceptDownloads: true,
      viewport: { width: 1280, height: 800 },
      args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
    });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker", { timeout: 20000 }));
    await worker.evaluate(async () => (await chrome.declarativeNetRequest.getEnabledRulesets()).length);
    return { profile, context, worker, used: 0 };
  }

  function forceKill(profile) {
    const name = basename(profile).replace(/[^a-z0-9-]/gi, "");
    if (!name.startsWith("fundament-measure-")) return Promise.resolve();
    return new Promise((resolvePromise) => {
      execFile(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | Where-Object { $_.CommandLine -like '*${name}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`,
        ],
        () => resolvePromise(),
      );
    });
  }

  async function closeSession(session) {
    const closing = session.context.close().catch(() => undefined);
    await Promise.race([closing, new Promise((resolvePromise) => setTimeout(resolvePromise, 3000))]);
    await forceKill(session.profile);
    rmSync(session.profile, { recursive: true, force: true });
  }

  let session = await openSession();
  let streak = 0;
  try {
    for (const job of jobs) {
      const key = `${job.group}:${job.index}`;
      if (done.has(key)) continue;
      if (session.used >= 15) {
        await closeSession(session);
        session = await openSession();
        streak = 0;
      }
      const blank = { group: job.group, index: job.index, host: job.host, signals: [], warned: false, status: "not-measured", copyClicks: 0, copyWarned: false };
      async function once(current) {
        const page = await current.context.newPage();
        try {
          return await visit(page, current.worker, job);
        } catch {
          return { row: blank, reason: "closed" };
        } finally {
          await page.close().catch(() => undefined);
        }
      }
      const fallback = { row: blank, reason: "timeout" };
      const capped = (current) =>
        new Promise((resolvePromise) => {
          const timer = setTimeout(() => resolvePromise(fallback), 35000);
          once(current).then(
            (value) => {
              clearTimeout(timer);
              resolvePromise(value);
            },
            () => {
              clearTimeout(timer);
              resolvePromise(fallback);
            },
          );
        });
      let outcome = await capped(session);
      if (outcome.reason !== "ok" && (relaunch.has(outcome.reason) || streak >= 2)) {
        await closeSession(session);
        session = await openSession();
        outcome = await capped(session);
        streak = 0;
      }
      session.used += 1;
      if (outcome.reason === "ok") streak = 0;
      else streak += 1;
      const record = publicRecord(outcome.row);
      rows.push(record);
      done.add(key);
      writeRows(file, rows);
      const mark = record.status === "measured" ? (record.warned ? "warn" : "ok") : `skip ${outcome.reason}`;
      console.log(`${job.group} ${job.index + 1} ${record.host || job.host} ${mark}`);
    }
    const report = summary(rows, new Date().toISOString().slice(0, 10));
    console.log(`measured ${report.measured} not-measured ${report.notMeasured} warnings ${report.warnings}`);
  } finally {
    await closeSession(session);
  }
}

const invoked = process.argv[1]?.endsWith("measure-page-signals.mjs");
if (invoked) {
  main().catch(() => {
    console.error("measure failed");
    process.exitCode = 1;
  });
}
