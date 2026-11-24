import { DEV_LICENSE_SPKI_B64, licenseActivationAllowed, paidCheckoutLive } from "@billing/launch";
import { storeConnectableMatches } from "@billing/connectable";

describe("store launch gates", () => {
  it("treats empty pay origin as checkout off", () => {
    expect(paidCheckoutLive()).toBe(false);
  });

  it("allows example-key licenses only outside a store pack", () => {
    expect(licenseActivationAllowed(DEV_LICENSE_SPKI_B64, false)).toBe(true);
    expect(licenseActivationAllowed(DEV_LICENSE_SPKI_B64, true)).toBe(false);
    expect(licenseActivationAllowed("rotated-production-spki", true)).toBe(false);
    expect(licenseActivationAllowed("rotated-production-spki", false)).toBe(true);
  });

  it("gives a store pack no external page, even when a pay origin is set", () => {
    expect(
      storeConnectableMatches(["http://127.0.0.1:8787/*", "http://localhost:8787/*"], "", true),
    ).toBeNull();
    expect(storeConnectableMatches(["http://127.0.0.1:8787/*"], "https://pay.example", true)).toBeNull();
  });

  it("keeps localhost for unpacked builds", () => {
    const next = storeConnectableMatches(["http://127.0.0.1:8787/*"], "", false);
    expect(next).toContain("http://127.0.0.1:8787/*");
  });
});
