/**
 * Chrome Web Store screenshots (1280×800) in German and English, taken from the real
 * built extension (dist/). Run after npm run build or npm run pack.
 *
 *   node scripts/store-screenshots.mjs
 *   $env:FUNDAMENT_E2E_BROWSER="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"; node scripts/store-screenshots.mjs
 *
 * Output: store-assets/screenshots/<lang>/01-protected.png, 02-not-encrypted.png, 03-warning.png, 04-dashboard.png
 * Fixture pages are served locally; the phishing-looking host is resolved to 127.0.0.1,
 * so no real phishing site is contacted. The "protected" shot loads a real HTTPS site.
 */
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = process.env.FUNDAMENT_EXTENSION_DIR
  ? resolve(process.env.FUNDAMENT_EXTENSION_DIR)
  : resolve(root, "dist");
const out = resolve(root, "store-assets/screenshots");
const SAFE_SITE = "https://www.wikipedia.org/";

const COPY = {
  de: {
    protected: ["Ruhig, wenn alles stimmt.", "Grün heißt: keine Warnzeichen auf dieser Seite."],
    http: ["Ehrlich, wenn nicht.", "Keine Verschlüsselung? Fundament sagt es dir, bevor du etwas eingibst."],
  },
  en: {
    protected: ["Quiet when everything is fine.", "Green means no warning signs on this page."],
    http: ["Honest when it isn't.", "No encryption? Fundament tells you before you type anything."],
  },
};

const PAGES = {
  "/": `<!doctype html><title>Beispiel-Shop</title><h1>Beispiel-Shop</h1><p>Angebote der Woche.</p>`,
  "/signin": `<!doctype html><title>PayPal: Log in</title><form action="/x"><input type="email"><input type="password"><button>Log in</button></form>`,
  "/login": `<!doctype html><title>Shop – Login</title><h1>Shop</h1><form action="/x"><input type="email"><input type="password"><button>Login</button></form>`,
};

function promo(png, line) {
  const b64 = png.toString("base64");
  return `<!doctype html><html><meta charset="utf-8"><style>
    html,body{margin:0;width:440px;height:280px;background:#f4f1ea;font-family:"Segoe UI",system-ui,sans-serif;color:#1c1a16}
    .wrap{display:flex;align-items:center;height:100%;padding:0 28px;gap:22px;box-sizing:border-box}
    h1{font-size:28px;line-height:1.1;margin:0 0 8px} p{margin:0;font-size:16px;line-height:1.35;color:#6f6a60}
    img{width:118px;border-radius:12px;box-shadow:0 12px 28px rgba(28,26,22,.18);background:#fffcf7}
  </style><div class="wrap"><img src="data:image/png;base64,${b64}"><div><h1>Fundament</h1><p>${line}</p></div></div></html>`;
}

function frame(lang, png, title, subtitle) {
  const b64 = png.toString("base64");
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
    html,body{margin:0;width:1280px;height:800px;background:#f4f1ea;font-family:"Segoe UI",system-ui,sans-serif;color:#1c1a16}
    .wrap{display:flex;align-items:center;justify-content:center;gap:72px;height:100%;padding:0 80px;box-sizing:border-box}
    .text{max-width:520px} h1{font-size:46px;line-height:1.1;margin:0 0 18px;letter-spacing:-0.01em} p{font-size:22px;line-height:1.45;color:#6f6a60;margin:0}
    img{width:380px;border-radius:16px;box-shadow:0 24px 60px rgba(28,26,22,.18),0 2px 8px rgba(28,26,22,.08);background:#fffcf7}
  </style><div class="wrap"><div class="text"><h1>${title}</h1><p>${subtitle}</p></div><img src="data:image/png;base64,${b64}"></div></html>`;
}

async function run(lang) {
  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(PAGES[(req.url ?? "/").split("?")[0]] ?? PAGES["/"]);
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const port = server.address().port;
  const profile = mkdtempSync(join(tmpdir(), "fundament-shots-"));
  const executablePath = process.env.FUNDAMENT_E2E_BROWSER || undefined;
  const context = await chromium.launchPersistentContext(profile, {
    ...(executablePath ? { executablePath } : { channel: "chromium" }),
    headless: true,
    locale: lang === "de" ? "de-DE" : "en-US",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      `--lang=${lang === "de" ? "de-DE" : "en-US"}`,
      "--host-resolver-rules=MAP paypal-login.secure-check.xyz 127.0.0.1, MAP shop-beispiel.de 127.0.0.1",
    ],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const extensionId = new URL(worker.url()).host;
    const ext = (path) => `chrome-extension://${extensionId}/${path}`;
    await new Promise((r) => setTimeout(r, 2500));
    // A fresh profile has not finished onboarding; the popup would show it instead of the status.
    const onboarding = context.pages().find((page) => page.url().includes("onboarding")) ?? (await context.newPage());
    if (!onboarding.url().includes("onboarding")) await onboarding.goto(ext("onboarding.html"));
    await onboarding.evaluate(() => chrome.runtime.sendMessage({ type: "COMPLETE_ONBOARDING" }));
    await onboarding.close();
    const dir = join(out, lang);
    mkdirSync(dir, { recursive: true });

    async function tabIdOf(url) {
      return worker.evaluate(async (target) => (await chrome.tabs.query({})).find((t) => t.url?.startsWith(target))?.id ?? null, url);
    }

    async function popupShot(siteUrl) {
      const site = await context.newPage();
      await site.goto(siteUrl, { waitUntil: "load" }).catch(() => undefined);
      await site.waitForTimeout(2500);
      const tabId = await tabIdOf(siteUrl.replace(/\/$/, ""));
      if (tabId === null) {
        const urls = await worker.evaluate(async () => (await chrome.tabs.query({})).map((t) => t.url));
        throw new Error(`No tab for ${siteUrl}; open tabs: ${urls.join(", ")} (page shows ${site.url()})`);
      }
      const popup = await context.newPage();
      await popup.setViewportSize({ width: 360, height: 600 });
      await popup.goto(ext(`popup.html?tab=${tabId}`));
      await popup.waitForTimeout(1500);
      const shot = await popup.locator("body").screenshot();
      await popup.close();
      await site.close();
      return shot;
    }

    async function framed(name, png, [title, subtitle]) {
      const page = await context.newPage();
      await page.setContent(frame(lang, png, title, subtitle));
      await page.screenshot({ path: join(dir, name) });
      await page.close();
    }

    const protectedShot = await popupShot(SAFE_SITE);
    await framed("01-protected.png", protectedShot, COPY[lang].protected);
    const tile = await context.newPage();
    await tile.setViewportSize({ width: 440, height: 280 });
    await tile.setContent(promo(protectedShot, COPY[lang].protected[0]));
    await tile.screenshot({ path: join(out, `promo-440x280-${lang}.png`) });
    await tile.close();
    await framed("02-not-encrypted.png", await popupShot(`http://shop-beispiel.de:${port}/`), COPY[lang].http);

    const warn = await context.newPage();
    await warn.goto(`http://paypal-login.secure-check.xyz:${port}/signin`).catch(() => undefined);
    // Fundament replaces the navigation, which Playwright reports as aborted: poll the URL instead.
    for (let i = 0; i < 100 && !warn.url().includes("warning.html"); i++) await warn.waitForTimeout(100);
    await warn.waitForTimeout(1200);
    await warn.screenshot({ path: join(dir, "03-warning.png") });
    await warn.close();

    const dash = await context.newPage();
    await dash.goto(ext("options.html"));
    await dash.waitForTimeout(3000);
    // The browser-health block depends on the machine taking the shots; show the protection list instead.
    await dash.locator("section", { has: dash.locator("h2", { hasText: lang === "de" ? "Phishing-Liste" : "Phishing list" }) }).evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24);
    });
    await dash.waitForTimeout(300);
    await dash.screenshot({ path: join(dir, "04-dashboard.png") });
    await dash.close();
    process.stdout.write(`${lang}: ${dir}\n`);
  } finally {
    await context.close();
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
}

readFileSync(resolve(dist, "manifest.json"));
for (const lang of ["de", "en"]) await run(lang);
