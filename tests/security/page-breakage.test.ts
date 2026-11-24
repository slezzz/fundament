import { describe, expect, it } from "vitest";
import { breakageRow, breakageSummary, netClass } from "../../scripts/measure-page-breakage.mjs";

describe("page breakage classes", () => {
  it("does not count a dead name as a page the extension broke", () => {
    const row = breakageRow(
      { failed: true, reason: "dns", pageErrors: [], consoleErrors: [], loadMs: 0 },
      { failed: true, reason: "dns", pageErrors: [], consoleErrors: [], loadMs: 0 },
    );
    expect(row).toMatchObject({ measured: false, broken: false, failClass: "dns" });
    expect(netClass(new Error("net::ERR_NAME_NOT_RESOLVED"))).toBe("dns");
  });

  it("counts a script error that appears only with the extension", () => {
    const row = breakageRow(
      { failed: false, warned: true, pageErrors: ["TypeError"], consoleErrors: [], loadMs: 20 },
      { failed: false, pageErrors: [], consoleErrors: [], loadMs: 18 },
    );
    expect(row.broken).toBe(true);
    expect(row.warned).toBe(true);
    const summary = breakageSummary([
      row,
      breakageRow(
        { failed: true, reason: "timeout", pageErrors: [], consoleErrors: [], loadMs: 0 },
        { failed: true, reason: "timeout", pageErrors: [], consoleErrors: [], loadMs: 0 },
      ),
    ]);
    expect(summary).toMatchObject({ pages: 2, measured: 1, notMeasured: 1, warnings: 1, broken: 1, failClasses: { timeout: 1 } });
  });
});
