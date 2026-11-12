import { extraUrlSignals } from "@engine/url/extra";
import { parseHttpUrl } from "@engine/url/parse";
import { analyzeUrl } from "@engine/analyze";
import { presentAnalysis } from "@engine/status/present";
import { looksDangerousDownload } from "../../src/background/downloads";
import type { AnalysisInput } from "@shared/types";

const base: AnalysisInput = {
  url: "https://example.com/",
  blocklist: [],
  allowlist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
};

describe("extra URL signals", () => {
  it("flags unusual ports", () => {
    const parsed = parseHttpUrl("https://example.com:4444/");
    expect(extraUrlSignals(parsed).some((s) => s.id === "port")).toBe(true);
  });

  it("flags a disguised executable path", () => {
    const parsed = parseHttpUrl("https://example.com/invoice.pdf.exe");
    expect(extraUrlSignals(parsed).some((s) => s.id === "double-ext")).toBe(true);
  });

  it("never labels an unusual port as protected", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://example.com:4444/" });
    const status = presentAnalysis(analysis, true);
    expect(status.tone).not.toBe("safe");
    expect(status.label).toBe("Unusual port");
  });
});

describe("AI and crypto URL traps", () => {
  it("does not treat official ChatGPT login as bait", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://chatgpt.com/auth/login" });
    expect(analysis.signals.some((s) => s.id === "impersonation" && s.severity === "warn")).toBe(false);
  });

  it("flags a ChatGPT clone login", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://chatgpt-login.xyz/signin" });
    expect(analysis.signals.some((s) => s.id === "impersonation" && s.severity === "warn")).toBe(true);
    expect(analysis.signals.some((s) => s.id === "ai-credential-url" || s.id === "login")).toBe(true);
    expect(presentAnalysis(analysis, true).tone).not.toBe("safe");
  });

  it("flags airdrop bait on a cheap TLD", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://random-claim.xyz/airdrop/connect-wallet" });
    expect(analysis.signals.some((s) => s.id === "crypto-claim-url")).toBe(true);
  });

  it("flags seed-phrase paths", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://wallet-help.example/seed-phrase" });
    expect(analysis.signals.some((s) => s.id === "crypto-secret-url")).toBe(true);
  });

  it("does not flag Uniswap swap as drain bait", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://app.uniswap.org/swap" });
    expect(analysis.signals.some((s) => s.id === "crypto-claim-url")).toBe(false);
    expect(analysis.signals.some((s) => s.id === "impersonation" && s.severity === "warn")).toBe(false);
  });
});

describe("download heuristics", () => {
  it("blocks programs over HTTP and double extensions", () => {
    expect(looksDangerousDownload("http://evil.test/setup.exe")).toBe(true);
    expect(looksDangerousDownload("https://evil.test/photo.jpg.exe")).toBe(true);
    expect(looksDangerousDownload("https://example.com/report.pdf")).toBe(false);
    expect(looksDangerousDownload("http://evil.test/payload.iso")).toBe(true);
  });
});
