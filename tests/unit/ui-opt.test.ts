import { mapPool } from "@engine/search/pool";
import { partitionSignals } from "../../src/ui/lib/signals";

describe("mapPool", () => {
  it("keeps order with a small worker cap", async () => {
    const seen: number[] = [];
    const result = await mapPool([3, 1, 2], 2, async (n) => {
      seen.push(n);
      await Promise.resolve();
      return n * 10;
    });
    expect(result).toEqual([30, 10, 20]);
    expect(seen).toHaveLength(3);
  });
});

describe("partitionSignals", () => {
  it("puts fail and warn first", () => {
    const { issues, rest } = partitionSignals([
      { id: "a", title: "ok", explanation: "", severity: "ok", weightApplied: 0 },
      { id: "b", title: "bad", explanation: "", severity: "fail", weightApplied: 8 },
      { id: "c", title: "hmm", explanation: "", severity: "warn", weightApplied: 2 },
    ]);
    expect(issues.map((s) => s.id)).toEqual(["b", "c"]);
    expect(rest.map((s) => s.id)).toEqual(["a"]);
  });
});
