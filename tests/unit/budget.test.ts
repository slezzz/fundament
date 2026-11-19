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

/** Fixed FNV-1a loop. Sized on 2026-11-19 so five runs sat next to the 39.2 ms analysis median. */
const CALIBRATION_STEPS = 38_500_000;

function calibrationMs(): number {
  const started = performance.now();
  let hash = 2166136261;
  for (let i = 0; i < CALIBRATION_STEPS; i += 1) {
    hash = Math.imul(hash ^ i, 16777619);
  }
  const elapsed = performance.now() - started;
  if (hash === 0) throw new Error("calibration collapsed");
  return elapsed;
}

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) >> 1] ?? 0;
}

describe("navigation budget", () => {
  it("keeps one hundred analyses under three times the calibration", async () => {
    const reference = median([calibrationMs(), calibrationMs(), calibrationMs(), calibrationMs(), calibrationMs()]);
    const started = performance.now();
    for (let i = 0; i < 10; i += 1) {
      for (const url of samples) {
        await analyzeUrl({ ...base, url });
      }
    }
    const elapsed = performance.now() - started;
    const bound = 3 * reference;
    expect(
      elapsed,
      `100 analyses took ${elapsed.toFixed(1)} ms; calibration median ${reference.toFixed(1)} ms; bound ${bound.toFixed(1)} ms`,
    ).toBeLessThan(bound);
  });
});
