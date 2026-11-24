import { mintLicense } from "../../server/license.mjs";
import { isCheckoutSessionId, licenseExpFromSession, LICENSE_TERM_SECONDS } from "../../server/license-term.mjs";
import { allowPayAttempt, resetPayLimits } from "../../server/pay.mjs";

const PRIV = "MC4CAQAwBQYDK2VwBCIEIGow2bwmfeQU4rx99iwrF5r+u2wdb+JmyC84+3n0t0l3";

function expOf(token: string): number {
  const body = token.split(".")[1] ?? "";
  const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { exp?: number };
  return json.exp ?? 0;
}

describe("one payment, one expiry", () => {
  it("returns the same exp when the same session is read 300 days later", () => {
    process.env.LICENSE_PRIVATE_KEY_PKCS8_B64 = PRIV;
    const created = 1_700_000_000;
    const session = { created, id: `cs_test_${"a".repeat(24)}` };
    const exp = created + LICENSE_TERM_SECONDS;
    const early = licenseExpFromSession(session, created + 10);
    const later = licenseExpFromSession(session, created + 300 * 24 * 60 * 60);
    expect(early).toBe(exp);
    expect(later).toBe(early);
    if (early == null || later == null) throw new Error("expiry moved");
    const first = mintLicense(365, { exp: early, now: created + 10, sid: session.id });
    const second = mintLicense(365, { exp: later, now: created + 300 * 24 * 60 * 60, sid: session.id });
    expect(first).toBeTruthy();
    expect(expOf(second as string)).toBe(expOf(first as string));
    expect(licenseExpFromSession(session, exp)).toBeNull();
    expect(mintLicense(365, { exp, now: exp, sid: session.id })).toBeNull();
  });

  it("accepts only Stripe checkout session ids", () => {
    expect(isCheckoutSessionId(`cs_test_${"a".repeat(24)}`)).toBe(true);
    expect(isCheckoutSessionId(`cs_live_${"b".repeat(24)}`)).toBe(true);
    expect(isCheckoutSessionId("cs_test_short")).toBe(false);
    expect(isCheckoutSessionId("sub_123")).toBe(false);
    expect(isCheckoutSessionId("https://evil.test/cs_test_aaaaaaaaaaaaaaaaaaaaaaaa")).toBe(false);
  });

  it("stops one address from asking for the success page without limit", () => {
    resetPayLimits();
    const now = 1_700_000_000_000;
    for (let i = 0; i < 8; i += 1) expect(allowPayAttempt("203.0.113.5", now + i)).toBe(true);
    expect(allowPayAttempt("203.0.113.5", now + 9)).toBe(false);
    expect(allowPayAttempt("203.0.113.9", now + 9)).toBe(true);
  });
});
