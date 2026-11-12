import { foldConfusables, hasMixedScripts, isWholeScriptConfusable, looksLikeHomograph } from "@engine/homograph/detect";

describe("homograph detection", () => {
  it("folds cyrillic lookalikes", () => {
    expect(foldConfusables("раураl")).toContain("p");
  });

  it("flags mixed latin/cyrillic labels", () => {
    expect(hasMixedScripts(["раypal"])).toBe(true);
  });

  it("does not flag ordinary internationalized names", () => {
    expect(looksLikeHomograph(["münchen", "de"], true)).toBe(false);
    expect(looksLikeHomograph(["москва", "ru"], true)).toBe(false);
  });

  it("flags whole-script lookalikes of latin names", () => {
    expect(isWholeScriptConfusable("аррӏе")).toBe(true);
  });

  it("does not flag plain ascii", () => {
    expect(hasMixedScripts(["paypal", "com"])).toBe(false);
  });
});
