/**
 * Real-world corpora. These are the numbers Fundament's claims rest on, so they are
 * enforced on every test run.
 *
 * - popular-top10k: Majestic ranks 1–10,000 (inside the shipped popularity list)
 * - longtail-sample: Majestic ranks 100,001–110,000 (outside it: the engine gets no help)
 * - phishing: deterministic sample of the shipped feed, analyzed *as if it were not listed*
 *
 * Each site is checked twice: its home page, and /login with a password form on it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeUrl } from "@engine/analyze";
import { mergeSignals, signalsForPageChecks } from "@engine/page/merge";
import { presentAnalysis } from "@engine/status/present";
import { parsePopularList, popularityCheck } from "@engine/reputation/popular";
import type { AnalysisInput, UrlAnalysis } from "@shared/types";

const root = resolve(__dirname, "../..");
const lines = (file: string): string[] =>
  readFileSync(resolve(root, file), "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

const isPopular = popularityCheck(
  parsePopularList(readFileSync(resolve(root, "public/data/popular-domains.txt"), "utf8")),
  parsePopularList(readFileSync(resolve(root, "public/data/hosted-zones.txt"), "utf8")),
);

const base: Omit<AnalysisInput, "url"> = {
  allowlist: [],
  blocklist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
  isPopular,
};

interface Tally {
  n: number;
  homeWarn: number;
  loginWarn: number;
  loginHigh: number;
  examples: string[];
}

const issue = (a: UrlAnalysis): boolean => presentAnalysis(a, true).tone !== "safe";
const red = (a: UrlAnalysis): boolean => a.band === "high" || a.band === "critical";

async function tally(domains: string[]): Promise<Tally> {
  const t: Tally = { n: domains.length, homeWarn: 0, loginWarn: 0, loginHigh: 0, examples: [] };
  for (const d of domains) {
    const home = await analyzeUrl({ ...base, url: `https://${d}/` });
    const login = mergeSignals(await analyzeUrl({ ...base, url: `https://www.${d}/login` }), signalsForPageChecks(["login-form"]), "standard");
    if (issue(home)) t.homeWarn += 1;
    if (issue(login)) t.loginWarn += 1;
    if (red(login)) t.loginHigh += 1;
    if ((issue(home) || issue(login)) && t.examples.length < 10) {
      t.examples.push(`${d}: ${login.signals.filter((s) => s.severity === "warn" || s.severity === "fail").map((s) => s.id).join(",")}`);
    }
  }
  return t;
}

describe("false positives on real sites", () => {
  it("popular sites (Majestic 1–10,000): no warnings", async () => {
    const t = await tally(lines("tests/fixtures/popular-top10k.txt"));
    expect(t.n).toBeGreaterThan(9000);
    expect(t.homeWarn, t.examples.join("\n")).toBeLessThanOrEqual(t.n * 0.001);
    expect(t.loginWarn, t.examples.join("\n")).toBeLessThanOrEqual(t.n * 0.002);
    expect(t.loginHigh, t.examples.join("\n")).toBe(0);
  }, 300_000);

  it("ordinary sites outside the popularity list (Majestic 100,001–110,000): no warnings", async () => {
    const t = await tally(lines("tests/fixtures/longtail-sample.txt"));
    expect(t.n).toBeGreaterThan(9000);
    expect(t.homeWarn, t.examples.join("\n")).toBeLessThanOrEqual(t.n * 0.001);
    expect(t.loginWarn, t.examples.join("\n")).toBeLessThanOrEqual(t.n * 0.002);
    expect(t.loginHigh, t.examples.join("\n")).toBe(0);
  }, 300_000);
});

describe("detection on real phishing hosts without the feed", () => {
  it("keeps the heuristic floor and never treats a kit as an established site", async () => {
    const feed = lines("filters/feeds/phishing-hosts.txt");
    let seed = 7;
    const next = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const sample = Array.from({ length: 3000 }, () => feed[Math.floor(next() * feed.length)] ?? "");
    let urlWarn = 0;
    let loginWarn = 0;
    let popularHits = 0;
    for (const host of sample) {
      const home = await analyzeUrl({ ...base, url: `https://${host}/` });
      if (home.signals.some((s) => s.id === "popular")) popularHits += 1;
      if (home.signals.some((s) => s.severity === "warn" || s.severity === "fail")) urlWarn += 1;
      const login = mergeSignals(home, signalsForPageChecks(["login-form"]), "standard");
      if (issue(login)) loginWarn += 1;
    }
    // Measured 2026-11-12: URL only 5.8 %, with a login form 34 %. The feed itself blocks 100 % of these.
    expect(urlWarn / sample.length).toBeGreaterThan(0.04);
    expect(loginWarn / sample.length).toBeGreaterThan(0.28);
    expect(popularHits / sample.length).toBeLessThan(0.002);
  }, 300_000);
});
