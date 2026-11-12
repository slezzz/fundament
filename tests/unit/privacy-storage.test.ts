import { parseSettings, DEFAULT_SETTINGS } from "@storage/settings";
import { prune } from "@storage/events";
import { originOnly } from "@privacy/sanitize";
import { ThreatIntelligenceClient } from "@privacy/threatIntelligence";
import type { ThreatIntelligenceProvider } from "@shared/types";

describe("settings parser", () => {
  it("returns defaults for garbage", () => {
    expect(parseSettings(null).threatProtection).toBe(true);
    expect(parseSettings({ telemetry: "yes" }).telemetry).toBe(false);
  });

  it("defaults online reputation to off", () => {
    expect(parseSettings({}).onlineReputation).toBe(false);
  });

  it("never disables local analysis", () => {
    expect(parseSettings({ localAnalysis: false }).localAnalysis).toBe(true);
  });

  it("caps and cleans host lists", () => {
    const parsed = parseSettings({
      ...DEFAULT_SETTINGS,
      allowlist: ["https://Evil.EXAMPLE/phish?x=1", "", 12],
    });
    expect(parsed.allowlist).toEqual(["evil.example"]);
  });
});

describe("event prune", () => {
  it("drops old events", () => {
    const old = { id: "1", type: "site_safe" as const, host: "a.test", at: 0 };
    expect(prune([old], Date.now())).toHaveLength(0);
  });
});

describe("privacy sanitizer", () => {
  it("strips path, query, and userinfo", () => {
    expect(originOnly("https://user:pass@example.com/login?token=abc#x")).toBe("https://example.com");
  });

  it("rejects javascript URLs", () => {
    expect(originOnly("javascript:alert(1)")).toBeNull();
  });
});

describe("threat intelligence client", () => {
  it("only forwards origins to the inner provider", async () => {
    const seen: string[] = [];
    const inner: ThreatIntelligenceProvider = {
      async checkUrl(url) {
        seen.push(url);
        return { listed: false, source: "test", available: true };
      },
      async checkDomain() {
        return { listed: false, source: "test", available: true };
      },
    };
    const client = new ThreatIntelligenceClient(inner);
    await client.checkUrl("https://example.com/reset?email=ada@example.com&token=secret");
    expect(seen).toEqual(["https://example.com"]);
  });
});
