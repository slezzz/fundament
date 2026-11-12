import { analyzeUrl } from "@engine/analyze";
import type { AnalysisInput } from "@shared/types";

const base: AnalysisInput = {
  url: "https://example.com/",
  blocklist: [],
  allowlist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
};

describe("risk scoring", () => {
  it("keeps a normal site in the safe band", async () => {
    const result = await analyzeUrl({ ...base, url: "https://example.com/" });
    expect(result.score).toBeLessThan(20);
    expect(result.band).toBe("safe");
  });

  it("combines impersonation and login heuristics", async () => {
    const result = await analyzeUrl({
      ...base,
      url: "https://paypa1.com/signin",
    });
    expect(result.signals.some((s) => s.id === "impersonation")).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(25);
  });

  it("scores known test malware hosts as critical", async () => {
    const result = await analyzeUrl({
      ...base,
      url: "https://testsafebrowsing.appspot.com/s/malware.html",
    });
    expect(result.signals.some((s) => s.id === "known-malicious")).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(["high", "critical"]).toContain(result.band);
  });

  it("zeroes score on allowlist", async () => {
    const result = await analyzeUrl({
      ...base,
      url: "https://paypa1.com/signin",
      allowlist: ["paypa1.com"],
    });
    expect(result.allowlisted).toBe(true);
    expect(result.score).toBe(0);
    expect(result.band).toBe("safe");
  });

  it("applies user blocklist weight", async () => {
    const result = await analyzeUrl({
      ...base,
      url: "https://blocked.example/",
      blocklist: ["blocked.example"],
    });
    expect(result.blocklisted).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it("marks reputation as unavailable without a live provider", async () => {
    const result = await analyzeUrl(base);
    expect(result.reputationAvailable).toBe(false);
    expect(result.signals.some((s) => s.id === "remote-reputation" && s.severity === "unavailable")).toBe(
      true,
    );
  });

  it("does not claim domain age or certificates", async () => {
    const result = await analyzeUrl(base);
    expect(result.signals.find((s) => s.id === "domain-age")?.severity).toBe("unavailable");
    expect(result.signals.find((s) => s.id === "certificate")?.severity).toBe("unavailable");
  });

  it("flags prototype pollution gadgets in the query string", async () => {
    const result = await analyzeUrl({ ...base, url: "https://example.com/?__proto__[polluted]=1" });
    expect(result.signals.some((s) => s.id === "url-prototype")).toBe(true);
  });
});
