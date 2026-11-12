import { analyzeRedirectShape } from "@engine/redirect/analyze";
import { parseHttpUrl } from "@engine/url/parse";
import { matchTracker } from "@engine/tracker/catalog";
import { hostMatchesList } from "@engine/reputation/local";
import { bandForScore, clampScore } from "@engine/risk/score";

describe("redirect analysis", () => {
  it("finds nested destinations", () => {
    const parsed = parseHttpUrl("https://example.com/out?url=https://evil.test/login");
    expect(analyzeRedirectShape(parsed).nestedUrl).toContain("evil.test");
  });

  it("finds chained redirect keys", () => {
    const parsed = parseHttpUrl("https://example.com/?redirect=1&next=2");
    expect(analyzeRedirectShape(parsed).chainedParams).toBe(true);
  });
});

describe("tracker matching", () => {
  it("matches analytics hosts", () => {
    expect(matchTracker("www.google-analytics.com")?.category).toBe("analytics");
  });

  it("does not match unrelated hosts", () => {
    expect(matchTracker("example.com")).toBeUndefined();
  });
});

describe("allowlist / blocklist", () => {
  it("matches hosts and subdomains", () => {
    expect(hostMatchesList("a.evil.test", ["evil.test"])).toBe(true);
    expect(hostMatchesList("paypal.com", ["evil.test"])).toBe(false);
  });
});

describe("risk bands", () => {
  it("clamps and maps bands", () => {
    expect(clampScore(140)).toBe(100);
    expect(bandForScore(0)).toBe("safe");
    expect(bandForScore(25)).toBe("low");
    expect(bandForScore(50)).toBe("suspicious");
    expect(bandForScore(70)).toBe("high");
    expect(bandForScore(90)).toBe("critical");
  });
});
