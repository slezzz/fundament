/**
 * The first store package is the free product. Pro is not on any of its pages.
 * Builds its own directory so the other end-to-end tests can keep using dist/.
 */
import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const dist = resolve(process.cwd(), "dist-store");

function buildStoreExtension(): void {
  const env = { ...process.env, VITE_STORE_PACK: "1" } as NodeJS.ProcessEnv;
  delete env.VITE_FUNDAMENT_MARKS;
  delete env.VITE_PAY_ORIGIN;
  delete env.VITE_REPUTATION_URL;
  const built = spawnSync("npx", ["vite", "build", "--outDir", "dist-store"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    shell: true,
  });
  if (built.status !== 0) throw new Error(built.stderr || built.stdout || "store build failed");
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function productWords(text: string): string[] {
  const hits: string[] = [];
  if (/(^|[^A-Za-z])Pro(?![a-z])/.test(text)) hits.push("Pro");
  if (/(^|[^A-Za-z])Upgrade(?![a-z])/.test(text)) hits.push("Upgrade");
  return hits;
}

test.describe.configure({ mode: "serial", timeout: 180_000 });

let context: BrowserContext;
let profile = "";
let origin = "";

test.beforeAll(async () => {
  buildStoreExtension();
  const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8")) as {
    externally_connectable?: unknown;
  };
  expect(manifest.externally_connectable).toBeUndefined();
  const forbidden = ["/pay/start", "/v1/license/status", "/v1/reputation", "Pack URL must be https", "fundament-cosmetic"];
  const hits: string[] = [];
  for (const file of walk(dist)) {
    if (!file.endsWith(".js") && !file.endsWith(".json") && !file.endsWith(".html")) continue;
    const text = readFileSync(file, "utf8");
    for (const needle of forbidden) {
      if (text.includes(needle)) hits.push(`${file}: ${needle}`);
    }
  }
  expect(hits).toEqual([]);

  profile = mkdtempSync(join(tmpdir(), "fundament-store-"));
  const executablePath = process.env.FUNDAMENT_E2E_BROWSER || undefined;
  context = await chromium.launchPersistentContext(profile, {
    ...(executablePath ? { executablePath } : { channel: "chromium" }),
    headless: true,
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  });
  const ready = context.serviceWorkers().find((worker) => worker.url().startsWith("chrome-extension://"));
  const worker = ready ?? await context.waitForEvent("serviceworker", {
    timeout: 20_000,
    predicate: (candidate) => candidate.url().startsWith("chrome-extension://"),
  });
  const id = /^chrome-extension:\/\/([^/]+)/.exec(worker.url())?.[1];
  if (!id) throw new Error(`extension worker URL was ${worker.url()}`);
  origin = `chrome-extension://${id}`;
});

test.afterAll(async () => {
  await context?.close();
  if (profile) rmSync(profile, { recursive: true, force: true });
});

async function openExtensionPage(path: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${origin}/${path}`);
  await page.waitForTimeout(400);
  return page;
}

async function expectFree(page: Page, name: string) {
  const text = await page.locator("body").innerText();
  expect(productWords(text), name).toEqual([]);
  await expect(page.locator("textarea"), name).toHaveCount(0);
  await expect(page.getByText(/I already have a license|Lizenzschlüssel/i), name).toHaveCount(0);
}

test("the packed store build has no Pro, upgrade, or license field", async () => {
  const popup = await openExtensionPage("popup.html");
  await expectFree(popup, "popup");
  const settings = popup.getByRole("button", { name: /settings/i });
  if (await settings.count()) {
    await settings.click();
    await expectFree(popup, "popup settings");
  }
  const history = popup.getByRole("button", { name: /history/i });
  if (await history.count()) {
    await history.click();
    await expectFree(popup, "popup history");
  }

  const options = await openExtensionPage("options.html");
  await expectFree(options, "options");
  const onboarding = await openExtensionPage("onboarding.html");
  await expectFree(onboarding, "onboarding");
  for (let step = 0; step < 4; step += 1) {
    const next = onboarding.getByRole("button", { name: /continue|done/i });
    if (!(await next.count())) break;
    await expectFree(onboarding, `onboarding ${step}`);
    await next.click();
  }
  const warning = await openExtensionPage("warning.html");
  await expectFree(warning, "warning");
});
