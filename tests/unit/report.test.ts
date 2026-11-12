import { extraUrlSignals } from "@engine/url/extra";
import { parseHttpUrl } from "@engine/url/parse";
import { analyzeUrl } from "@engine/analyze";
import { formatAnalysisReport } from "@engine/report/format";
import type { AnalysisInput } from "@shared/types";

const base: AnalysisInput = {
  url: "https://example.com/",
  blocklist: [],
  allowlist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
};

describe("forensic report", () => {
  it("is deterministic and names engine plus weights", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://paypa1.com/" });
    const report = formatAnalysisReport(analysis);
    const again = formatAnalysisReport(analysis);
    expect(report).toBe(again);
    expect(report).toContain("FUNDAMENT ANALYSIS");
    expect(report).toContain(`engine=${analysis.engineVersion}`);
    expect(report).toContain("impersonation");
    expect(report).toContain("Not claimed:");
    expect(report).not.toMatch(/token=/);
  });
});

describe("bidi / invisible unicode", () => {
  it("flags an encoded RTL override in the path", () => {
    const parsed = parseHttpUrl("https://example.com/invoice%E2%80%AEexe.pdf");
    expect(extraUrlSignals(parsed).some((s) => s.id === "bidi")).toBe(true);
  });
});
