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

const samples = [
  "https://example.com/",
  "https://www.google.com/",
  "https://github.com/login",
  "https://paypa1.com/login",
  "https://accounts.google.com.evil.example/signin",
  "http://192.168.1.20/",
  "https://bit.ly/abc",
  "https://login.microsoftonline.example/oauth",
  "https://shop.example/checkout",
  "https://cdn.example.net/app.js",
];

describe("navigation budget", () => {
  it("analyzes one hundred pages in under half a second", async () => {
    const started = performance.now();
    for (let i = 0; i < 10; i += 1) {
      for (const url of samples) {
        await analyzeUrl({ ...base, url });
      }
    }
    const elapsed = performance.now() - started;
    expect(elapsed, `100 analyses took ${elapsed.toFixed(1)} ms; bound is 118`).toBeLessThan(118);
  });
});
