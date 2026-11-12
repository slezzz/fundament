import { scoreExtensionPermissions } from "@engine/audit/extensions";
import { signalsForPageChecks } from "@engine/page/merge";
import { countSuffixInRange, splitSha1 } from "@privacy/hibp";
import { WEIGHTS } from "@engine/risk/weights";

describe("extension permission scoring", () => {
  it("marks debugger as critical", () => {
    const result = scoreExtensionPermissions(["debugger"], []);
    expect(result.level).toBe("critical");
  });

  it("marks wide host access plus scripting as high", () => {
    const result = scoreExtensionPermissions(["scripting"], ["<all_urls>"]);
    expect(result.level).toBe("high");
    expect(result.reasons.some((r) => r.includes("almost every site"))).toBe(true);
  });

  it("stays low with no special APIs", () => {
    expect(scoreExtensionPermissions(["storage"], [])).toEqual({ level: "low", reasons: [] });
  });

  it("raises sideloaded extensions", () => {
    const result = scoreExtensionPermissions(["storage"], [], "sideload");
    expect(result.level).toBe("medium");
    expect(result.reasons.some((r) => r.includes("Chrome Web Store"))).toBe(true);
  });
});

describe("HIBP k-anonymity helpers", () => {
  it("splits SHA-1 into prefix and suffix", () => {
    expect(splitSha1("21BD12DC183F740EE76F27B78EB39C8AD972A757")).toEqual({
      prefix: "21BD1",
      suffix: "2DC183F740EE76F27B78EB39C8AD972A757",
    });
  });

  it("counts a suffix in a padded range body", () => {
    const body = "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n2DC183F740EE76F27B78EB39C8AD972A757:334\r\n";
    expect(countSuffixInRange(body, "2DC183F740EE76F27B78EB39C8AD972A757")).toBe(334);
    expect(countSuffixInRange(body, "DEADBEEF")).toBe(0);
  });
});

describe("overlay page signals", () => {
  it("adds clickjacking weight", () => {
    const signals = signalsForPageChecks(["overlay-clickjack"]);
    expect(signals[0]?.weightApplied).toBe(WEIGHTS.overlayClickjack);
  });

  it("adds seed-form and wallet-http weights", () => {
    const signals = signalsForPageChecks(["seed-form", "wallet-http"]);
    expect(signals.some((s) => s.id === "seed-form" && s.weightApplied === WEIGHTS.seedForm)).toBe(true);
    expect(signals.some((s) => s.id === "wallet-http" && s.weightApplied === WEIGHTS.walletOnHttp)).toBe(true);
  });
});
