import { describe, expect, it } from "vitest";
import { brokenByExtension, browserLaunchOptions, calibrationLoop, sideDifferences, unexplained, withinBudget } from "../../scripts/page-cost.mjs";

describe("page cost budget", () => {
  it("keeps the work under three times the calibration and not a looser multiple", () => {
    expect(withinBudget(29, 10)).toBe(true);
    expect(withinBudget(30, 10)).toBe(false);
    expect(withinBudget(1, 0)).toBe(false);
    const elapsed = calibrationLoop(200_000);
    expect(elapsed).toBeGreaterThan(0);
  });

  it("requires a reason for every difference and counts an extension-only error as breakage", () => {
    const differences = sideDifferences(
      { pageErrors: ["TypeError: x"], consoleErrors: ["broken"], loadMs: 40, failed: false },
      { pageErrors: [], consoleErrors: [], loadMs: 25, failed: false },
    );
    expect(differences.map((difference) => difference.kind)).toEqual(["pageerror", "console", "load"]);
    expect(unexplained(differences, [{ kind: "load", text: "the scripts run in the top frame and in each iframe" }]).map((difference) => difference.kind)).toEqual([
      "pageerror",
      "console",
    ]);
    expect(brokenByExtension(differences).map((difference) => difference.kind)).toEqual(["pageerror", "console"]);
    const upgraded = sideDifferences(
      { pageErrors: [], consoleErrors: ["Failed to load resource: net::ERR_CONNECTION_CLOSED"], loadMs: 30, failed: false },
      { pageErrors: [], consoleErrors: [], loadMs: 30, failed: false },
    );
    expect(upgraded.map((difference) => difference.kind)).toEqual(["resource"]);
    expect(brokenByExtension(upgraded)).toEqual([]);
    const sandbox = sideDifferences(
      {
        pageErrors: [],
        consoleErrors: ["Blocked script execution in 'about:blank' because the document's frame is sandboxed and the 'allow-scripts' permission is not set."],
        loadMs: 10,
        failed: false,
      },
      { pageErrors: [], consoleErrors: [], loadMs: 10, failed: false },
    );
    expect(sandbox.map((difference) => difference.kind)).toEqual(["sandbox"]);
    expect(brokenByExtension(sandbox)).toEqual([]);
    expect(unexplained([{ kind: "load" }], [{ kind: "load", text: "   " }])).toEqual([{ kind: "load" }]);
  });

  it("uses Chromium on Linux when no browser path is set", () => {
    const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    expect(browserLaunchOptions({ env: {}, platform: "linux", exists: () => false })).toEqual({ channel: "chromium" });
    expect(browserLaunchOptions({ env: {}, platform: "linux", exists: () => true })).toEqual({ channel: "chromium" });
    expect(browserLaunchOptions({ env: {}, platform: "win32", exists: (path) => path === edge })).toEqual({ executablePath: edge });
    expect(browserLaunchOptions({ env: {}, platform: "win32", exists: () => false })).toEqual({ channel: "chromium" });
    expect(
      browserLaunchOptions({
        env: { FUNDAMENT_E2E_BROWSER: "/opt/edge" },
        platform: "linux",
        exists: (path) => path === "/opt/edge",
      }),
    ).toEqual({ executablePath: "/opt/edge" });
    expect(() =>
      browserLaunchOptions({
        env: { FUNDAMENT_E2E_BROWSER: "/missing" },
        platform: "linux",
        exists: () => false,
      }),
    ).toThrow(/FUNDAMENT_E2E_BROWSER/);
  });
});
