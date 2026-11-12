import { parseStats } from "@storage/stats";
import { prunePauses, withPause, withoutPause, pauseUntilFor } from "@storage/pauses";
import { parseSettings } from "@storage/settings";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pauses", () => {
  it("drops expired entries and replaces the same host", () => {
    const now = 1_000_000;
    const first = withPause([], "evil.test", now + 1000, now);
    const second = withPause(first, "evil.test", now + 5000, now);
    expect(second).toHaveLength(1);
    expect(second[0]?.until).toBe(now + 5000);
    expect(prunePauses(second, now + 6000)).toHaveLength(0);
    expect(withoutPause(second, "evil.test", now)).toHaveLength(0);
    expect(pauseUntilFor(second, "evil.test", now)).toBe(now + 5000);
  });
});

describe("lifetime stats", () => {
  it("ignores garbage", () => {
    expect(parseStats(null)).toEqual({ trackers: 0, threats: 0, downloads: 0 });
    expect(parseStats({ trackers: -3, threats: "x" })).toEqual({ trackers: 0, threats: 0, downloads: 0 });
  });
});

describe("new defaults", () => {
  it("turns on link stripping, GPC, and browser hardening", () => {
    const settings = parseSettings({});
    expect(settings.stripTrackingParams).toBe(true);
    expect(settings.globalPrivacyControl).toBe(true);
    expect(settings.hardenBrowser).toBe(true);
    expect(settings.cosmeticFiltering).toBe(false);
    expect(settings.overlayProtection).toBe(true);
    expect(settings.cspReinforce).toBe(false);
    expect(settings.fingerprintShield).toBe(false);
    expect(settings.iocFeeds).toBe(true);
    expect(settings.searchMarks).toBe(true);
    expect(settings.blockNotificationPrompts).toBe(false);
  });
});

describe("popup state", () => {
  it("fills missing lifetime so the popup cannot crash", async () => {
    const { normalizePopupState } = await import("../../src/ui/lib/popupState");
    const normalized = normalizePopupState({
      settings: parseSettings({}),
      analysis: null,
      tabId: null,
      tabTitle: null,
      connectionsChecked: 0,
      trackersBlocked: 0,
      threatsDetected: 0,
      reputationAvailable: false,
      plan: "free",
      entitlements: {
        plan: "free",
        onlineReputation: false,
        plusTrackers: false,
        extendedTrackers: false,
        cosmeticFiltering: false,
        filterPack: false,
        securityLevels: ["standard"],
        maxListEntries: 10,
        maxEvents: 40,
        eventRetentionMs: 1,
      },
    } as never);
    expect(normalized?.lifetime.trackers).toBe(0);
  });
});

describe("static rulesets", () => {
  it("keeps unique rule ids across new lists", () => {
    const files = ["threats-core.json", "tracking-params.json", "privacy-headers.json", "clickjack-headers.json"];
    const ids = new Set<number>();
    for (const file of files) {
      const rules = JSON.parse(readFileSync(resolve("public/rules", file), "utf8")) as { id: number }[];
      for (const rule of rules) {
        expect(ids.has(rule.id)).toBe(false);
        ids.add(rule.id);
      }
    }
  });

  it("avoids DNR regexFilter on tracking-params (Chrome 2KB compile cap)", () => {
    const rules = JSON.parse(readFileSync(resolve("public/rules/tracking-params.json"), "utf8")) as {
      condition?: { regexFilter?: string };
    }[];
    for (const rule of rules) {
      expect(rule.condition?.regexFilter).toBeUndefined();
    }
  });

  it("appends frame-ancestors instead of replacing site CSP", () => {
    const rules = JSON.parse(readFileSync(resolve("public/rules/clickjack-headers.json"), "utf8")) as {
      action?: { responseHeaders?: { header?: string; operation?: string }[] };
    }[];
    const csp = rules[0]?.action?.responseHeaders?.find((h) => h.header === "Content-Security-Policy");
    expect(csp?.operation).toBe("append");
  });
});
