import { readFileSync } from "node:fs";
import { PLAN_LINES, planLineEffect } from "@billing/planLines";
import { entitlementsFor } from "@billing/entitlements";

describe("Pro screen lines", () => {
  it("gives every line a behavior the store build can measure, and none of them is reputation or a remote pack", () => {
    const screen = readFileSync("src/ui/popup/PlanView.tsx", "utf8");
    expect(entitlementsFor("pro").onlineReputation).toBe(false);
    expect(entitlementsFor("pro").filterPack).toBe(false);
    const messages = readFileSync("public/_locales/en/messages.json", "utf8");
    expect(screen).not.toContain("plan_rep");
    expect(screen).not.toContain("plan_pack");
    expect(screen).not.toContain("plan_comingSoon");
    expect(screen).toContain("PLAN_LINES.filter");
    expect(screen).toContain("t(line.text)");
    for (const line of PLAN_LINES) {
      expect(messages).toContain(`"${line.text}"`);
      if (line.tier === "scaled") expect(screen).toContain(`t("${line.text}")`);
      const free = planLineEffect(line.measure, "free");
      const pro = planLineEffect(line.measure, "pro");
      expect(free).not.toBeUndefined();
      expect(pro).not.toBeUndefined();
      if (line.tier === "pro") expect(pro).not.toEqual(free);
      if (line.tier === "free") expect(free).toBe(true);
    }
  });
});
