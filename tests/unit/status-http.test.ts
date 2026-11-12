import { statusFrom } from "../../src/ui/lib/status";
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

beforeEach(() => {
  vi.stubGlobal("navigator", { language: "en-US" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("status in the browser language", () => {
  it("renders the issue in German for a German browser", async () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    const analysis = await analyzeUrl({ ...base, url: "http://example.com/login" });
    const status = statusFrom(analysis, true);
    expect(status.label).toBe("Anmeldung über HTTP");
    expect(status.hint).toContain("Passwort");
  });
});

describe("honest status", () => {
  it("never labels a plain HTTP site as protected or safe", async () => {
    const analysis = await analyzeUrl({ ...base, url: "http://example.com/" });
    expect(analysis.parsed?.protocol).toBe("http:");
    expect(analysis.signals.some((s) => s.id === "https" && s.severity === "warn")).toBe(true);
    expect(analysis.score).toBeGreaterThanOrEqual(20);
    const status = statusFrom(analysis, true);
    expect(status.label).toBe("Not encrypted");
    expect(status.tone).toBe("warn");
    expect(status.hint.toLowerCase()).not.toContain("looks safe");
  });

  it("treats a login page over HTTP as more than a missing padlock", async () => {
    const analysis = await analyzeUrl({ ...base, url: "http://example.com/login" });
    expect(analysis.signals.some((s) => s.id === "login-http")).toBe(true);
    expect(analysis.score).toBeGreaterThanOrEqual(40);
    const status = statusFrom(analysis, true);
    expect(status.label).toBe("Sign-in over HTTP");
    expect(status.tone).not.toBe("safe");
  });

  it("never calls impersonation protected", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://paypa1.com/" });
    const status = statusFrom(analysis, true);
    expect(status.tone).not.toBe("safe");
    expect(status.label.toLowerCase()).not.toBe("protected");
  });

  it("still calls a normal HTTPS site protected", async () => {
    const analysis = await analyzeUrl({ ...base, url: "https://example.com/" });
    const status = statusFrom(analysis, true);
    expect(status.label).toBe("Protected");
    expect(status.tone).toBe("safe");
  });
});
