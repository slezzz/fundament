import { analyzeUrl } from "@engine/analyze";
import { isSearchEngineHost, searchHitLabel, unwrapSearchDestination } from "@engine/search/unwrap";
import { parseSettings } from "@storage/settings";
import type { AnalysisInput } from "@shared/types";

const base: AnalysisInput = {
  url: "https://example.com/",
  blocklist: [],
  allowlist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
};

describe("search unwrap", () => {
  it("unwraps Google /url?q= destinations", () => {
    expect(
      unwrapSearchDestination("https://www.google.com/url?q=https://paypa1.com/login&sa=U"),
    ).toBe("https://paypa1.com/login");
  });

  it("does not treat googleapis as a search host", () => {
    expect(isSearchEngineHost("googleapis.com")).toBe(false);
    expect(isSearchEngineHost("www.google.de")).toBe(true);
  });

  it("returns null for un-unwrappable click trackers", () => {
    expect(unwrapSearchDestination("https://www.google.com/aclk?sa=L&ai=abc")).toBeNull();
  });
});

describe("search hit labels", () => {
  it("labels impersonation destinations", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://paypa1.com/" });
    expect(searchHitLabel(analysis.signals, analysis.score)).toBeTruthy();
    expect(analysis.signals.some((s) => s.id === "impersonation")).toBe(true);
  });

  it("does not mark a normal destination", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://example.com/" });
    expect(searchHitLabel(analysis.signals, analysis.score)).toBeNull();
  });
});

describe("search / notification settings", () => {
  it("defaults search marks on and notification blocking off", () => {
    const settings = parseSettings({});
    expect(settings.searchMarks).toBe(true);
    expect(settings.blockNotificationPrompts).toBe(false);
  });
});
