import { describe, expect, it } from "vitest";
import { brokenByExtension, calibrationLoop, sideDifferences, unexplained, withinBudget } from "../../scripts/page-cost.mjs";

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
});
