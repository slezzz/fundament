/**
 * Why a page differs with Fundament. Not for CI.
 * Each host is opened twice with no extension, then with the store build,
 * then with ad and tracker rules off, then with the bridge script removed.
 * Writes measure-output/page-cause.json: host and cause only. No path, no page text.
 *
 *   node scripts/measure-page-cause.mjs
 *
 * FUNDAMENT_MEASURE_MAJESTIC  home pages (default 2000, at most 10 000)
 * FUNDAMENT_MEASURE_LIMIT     stop after this many (0 = the cap)
 */
import { execFile } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assignCause, bareDisagrees, breakageRow, openPage } from "./measure-page-breakage.mjs";
import { sideDifferences } from "./page-cost.mjs";
import { hostnameOnly, loadTargets } from "./measure-page-signals.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AD_RULES = ["trackers-core", "ads-extra"];

function bridgeOffCopy(dist, dest) {
  rmSync(dest, { recursive: true, force: true });
  cpSync(dist, dest, {
    recursive: true,
    filter: (source) => !source.endsWith(".map"),
  });
  const manifestPath = resolve(dest, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.content_scripts = (manifest.content_scripts ?? []).filter(
    (entry) => !Array.isArray(entry.js) || !entry.js.includes("content-bridge.js"),
  );
  writeFileSync(manifestPath, JSON.stringify(manifest));
}

function forceKill(profile) {
  const name = basename(profile).replace(/[^a-z0-9-]/gi, "");
  if (!name.startsWith("fundament-cause-")) return Promise.resolve();
  return new Promise((done) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | Where-Object { $_.CommandLine -like '*${name}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`],
      () => done(),
    );
  });
}

async function setAds(worker, on) {
  await worker.evaluate(async (request) => {
    await chrome.declarativeNetRequest.updateEnabledRulesets(
      request.on
        ? { enableRulesetIds: request.ids }
        : { disableRulesetIds: request.ids },
    );
  }, { on, ids: AD_RULES });
}

const invoked = process.argv[1]?.endsWith("measure-page-cause.mjs");
if (invoked) {
  const dist = resolve(root, "dist");
  const noBridge = resolve(root, "measure-output", "dist-nobridge");
  const executablePath = process.env.FUNDAMENT_E2E_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const cap = Math.max(1, Math.min(10000, Number(process.env.FUNDAMENT_MEASURE_MAJESTIC || 2000) || 2000));
  const limit = Math.max(0, Number(process.env.FUNDAMENT_MEASURE_LIMIT || 0) || 0);
  const targets = loadTargets(root, cap).majestic.slice(0, limit > 0 ? limit : cap);
  const only = new Set((process.env.FUNDAMENT_MEASURE_HOSTS || "").split(",").map((item) => item.trim()).filter(Boolean));
  const selected = only.size > 0 ? targets.filter((target) => only.has(target.host)) : targets;
  const file = resolve(root, "measure-output", "page-cause.json");
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { rows: [] };
  const rows = Array.isArray(previous.rows) ? previous.rows : [];
  const done = new Set(rows.map((row) => row.host));
  bridgeOffCopy(dist, noBridge);
  const { chromium } = await import("@playwright/test");

  async function launch(profile, args) {
    return chromium.launchPersistentContext(profile, {
      executablePath,
      headless: true,
      viewport: { width: 1280, height: 800 },
      args,
    });
  }

  const profiles = {
    bare: mkdtempSync(resolve(tmpdir(), "fundament-cause-bare-")),
    full: mkdtempSync(resolve(tmpdir(), "fundament-cause-full-")),
    noblock: mkdtempSync(resolve(tmpdir(), "fundament-cause-ads-")),
    nobridge: mkdtempSync(resolve(tmpdir(), "fundament-cause-bridge-")),
  };
  const contexts = {
    bare: await launch(profiles.bare, ["--disable-extensions"]),
    full: await launch(profiles.full, [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]),
    noblock: await launch(profiles.noblock, [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]),
    nobridge: await launch(profiles.nobridge, [`--disable-extensions-except=${noBridge}`, `--load-extension=${noBridge}`]),
  };
  const noblockWorker = contexts.noblock.serviceWorkers()[0] ?? (await contexts.noblock.waitForEvent("serviceworker", { timeout: 20000 }));
  await setAds(noblockWorker, false);
  let used = 0;

  async function recycle() {
    for (const context of Object.values(contexts)) await context.close().catch(() => undefined);
    for (const profile of Object.values(profiles)) await forceKill(profile);
    for (const profile of Object.values(profiles)) rmSync(profile, { recursive: true, force: true });
    profiles.bare = mkdtempSync(resolve(tmpdir(), "fundament-cause-bare-"));
    profiles.full = mkdtempSync(resolve(tmpdir(), "fundament-cause-full-"));
    profiles.noblock = mkdtempSync(resolve(tmpdir(), "fundament-cause-ads-"));
    profiles.nobridge = mkdtempSync(resolve(tmpdir(), "fundament-cause-bridge-"));
    contexts.bare = await launch(profiles.bare, ["--disable-extensions"]);
    contexts.full = await launch(profiles.full, [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]);
    contexts.noblock = await launch(profiles.noblock, [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]);
    contexts.nobridge = await launch(profiles.nobridge, [`--disable-extensions-except=${noBridge}`, `--load-extension=${noBridge}`]);
    const worker = contexts.noblock.serviceWorkers()[0] ?? (await contexts.noblock.waitForEvent("serviceworker", { timeout: 20000 }));
    await setAds(worker, false);
    used = 0;
  }

  function tally(list) {
    const causes = {};
    for (const row of list) causes[row.cause] = (causes[row.cause] ?? 0) + 1;
    return { pages: list.length, causes };
  }

  try {
    for (const target of selected) {
      const host = hostnameOnly(target.host);
      if (!host || done.has(host)) continue;
      if (used >= 12) await recycle();
      const pages = {
        bare: await contexts.bare.newPage(),
        full: await contexts.full.newPage(),
        noblock: await contexts.noblock.newPage(),
        nobridge: await contexts.nobridge.newPage(),
      };
      let cause = "unmeasured";
      try {
        const bareA = await openPage(pages.bare, target.url);
        const bareB = await openPage(pages.bare, target.url);
        const [full, noblock, nobridge] = await Promise.all([
          openPage(pages.full, target.url),
          openPage(pages.noblock, target.url),
          openPage(pages.nobridge, target.url),
        ]);
        cause = assignCause({ full, noblock, nobridge, bareA, bareB });
        if (process.env.FUNDAMENT_BREAK_DEBUG === "1") {
          const kinds = (visit) => sideDifferences(visit, bareA).map((difference) => difference.kind).join("+") || breakageRow(visit, bareA).failClass;
          console.log(`debug ${host} full=${kinds(full)} ads=${kinds(noblock)} bridge=${kinds(nobridge)} bare=${bareDisagrees(bareA, bareB)}`);
          console.log(`debug-error ${(full.pageErrors ?? []).join(" || ")}`);
        }
      } catch {
        cause = "unmeasured";
      } finally {
        for (const page of Object.values(pages)) await page.close().catch(() => undefined);
      }
      rows.push({ host, cause });
      done.add(host);
      used += 1;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, `${JSON.stringify({ ...tally(rows), rows }, null, 2)}\n`);
      console.log(`${rows.length} ${host} ${cause}`);
    }
    console.log(`CAUSE_DONE ${JSON.stringify(tally(rows))}`);
  } finally {
    for (const context of Object.values(contexts)) await context.close().catch(() => undefined);
    for (const profile of Object.values(profiles)) {
      await forceKill(profile);
      rmSync(profile, { recursive: true, force: true });
    }
  }
}
