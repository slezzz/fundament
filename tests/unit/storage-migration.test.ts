import { describe, expect, it } from "vitest";
import { healStoredSettings, migratedSettings } from "@storage/settings";
import type { Settings } from "@shared/types";

const ON = [
  "threatProtection",
  "trackerBlocking",
  "phishingProtection",
  "httpsUpgrade",
  "pageChecks",
  "downloadProtection",
  "overlayProtection",
  "iocFeeds",
  "searchMarks",
  "liveFeed",
  "localAnalysis",
] as const;

function protectionOn(settings: Settings): void {
  for (const key of ON) expect(settings[key], key).toBe(true);
}

describe("storage migration on update", () => {
  it("turns a 1.0 blob into current settings with protection on", async () => {
    const written: Settings[] = [];
    const healed = await healStoredSettings({
      async get() {
        return { enabled: false, phishing: false, blockTrackers: false, allow: ["com", "bank.example", "*"] };
      },
      async set(settings) {
        written.push(settings);
      },
    });
    protectionOn(healed);
    expect(healed.allowlist).toEqual(["bank.example"]);
    expect(written).toEqual([healed]);
  });

  it("replaces a broken blob with defaults", () => {
    for (const settings of [null, "nope", [], { threatProtection: "false" }]) {
      protectionOn(migratedSettings({ settings }));
    }
    protectionOn(migratedSettings(null));
    protectionOn(migratedSettings([]));
  });

  it("drops a suffix-wide allowlist and an inherited off switch, and keeps a real boolean", async () => {
    const inherited = Object.create({ threatProtection: false, pageChecks: false }) as Record<string, unknown>;
    inherited.phishingProtection = false;
    inherited.allowlist = ["com", "github.io", "co.uk", "*.com", "paypal.com"];
    const healed = await healStoredSettings({
      async get() {
        return { settings: inherited, events: [{ type: "tamper" }] };
      },
      async set() {},
    });
    expect(healed.threatProtection).toBe(true);
    expect(healed.pageChecks).toBe(true);
    expect(healed.phishingProtection).toBe(false);
    expect(healed.allowlist).toEqual(["paypal.com"]);
    expect(healed.liveFeed).toBe(true);
    expect(healed.downloadProtection).toBe(true);
  });
});
