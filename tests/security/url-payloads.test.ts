import { analyzeUrl } from "@engine/analyze";
import { parseHttpUrl, UrlParseError } from "@engine/url/parse";
import type { AnalysisInput } from "@shared/types";

const base: AnalysisInput = {
  url: "https://example.com/",
  blocklist: [],
  allowlist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
};

describe("malicious and malformed URLs", () => {
  const payloads = [
    "javascript:alert(document.cookie)",
    "data:text/html,<script>alert(1)</script>",
    "https://example.com/<script>alert(1)</script>",
    "https://example.com/?q=<img src=x onerror=alert(1)>",
    "https://127.0.0.1/%2e%2e%2f",
    "https://example.com/" + "a".repeat(4000),
    "https://xn--80ak6aa92e.com/",
    "https://example.com/login?redirect=https://evil.test",
    "http://169.254.169.254/latest/meta-data/",
    "https://example.com@evil.test/",
  ];

  it("never throws on hostile strings besides hard parse failures", async () => {
    for (const url of payloads) {
      await expect(analyzeUrl({ ...base, url })).resolves.toBeTruthy();
    }
  });

  it("does not execute or echo HTML from query strings into signal ids", async () => {
    const result = await analyzeUrl({
      ...base,
      url: "https://example.com/?q=<script>alert(1)</script>",
    });
    for (const signal of result.signals) {
      expect(signal.id).not.toMatch(/[<>]/);
    }
  });

  it("rejects encoded javascript scheme", () => {
    expect(() => parseHttpUrl("javascript:alert(1)")).toThrow(UrlParseError);
  });
});
