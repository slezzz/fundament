import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assignCause, bareDisagrees, breakageRow, breakageSummary, netClass } from "../../scripts/measure-page-breakage.mjs";

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

  it("names blocking, the bridge, or noise before it names a rate", () => {
    const clean = { failed: false, pageErrors: [], consoleErrors: [], loadMs: 20 };
    const threw = { failed: false, pageErrors: ["TypeError"], consoleErrors: [], loadMs: 20 };
    expect(assignCause({ full: threw, noblock: clean, nobridge: threw, bareA: clean, bareB: clean })).toBe("blocking");
    expect(assignCause({ full: threw, noblock: threw, nobridge: clean, bareA: clean, bareB: clean })).toBe("bridge");
    expect(assignCause({ full: threw, noblock: threw, nobridge: threw, bareA: clean, bareB: clean })).toBe("other");
    expect(assignCause({ full: clean, noblock: clean, nobridge: clean, bareA: clean, bareB: clean })).toBe("ok");
    expect(bareDisagrees(threw, clean)).toBe(true);
    expect(assignCause({ full: threw, noblock: clean, nobridge: clean, bareA: threw, bareB: clean })).toBe("noise");
    expect(assignCause({ full: { failed: true, reason: "dns" }, bareA: { failed: true, reason: "dns" } })).toBe("unmeasured");
  });

  it("keeps the allowlist check when the store build cuts out cosmetic hiding", () => {
    const source = readFileSync("src/content/pageChecks.ts", "utf8");
    const omitted = source.match(/\/\* store-omit-start \*\/[\s\S]*?\/\* store-omit-end \*\//g) ?? [];
    expect(omitted.length).toBeGreaterThan(0);
    for (const block of omitted) expect(block).not.toContain("function hostAllowed");
    expect(source).toContain("function hostAllowed");
    expect(source).toContain("if (hostAllowed(allow, location.hostname)) return;");
  });
});
