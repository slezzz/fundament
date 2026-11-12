import { createHmac } from "node:crypto";
import { applyStripeEvent, emptyBillingState, licenseIsRevoked, verifyStripeSignature } from "../../server/stripe.mjs";
import { fetchLicenseRevoked } from "@billing/status";
import { verifyLicense } from "@billing/license";
import { createPrivateKey, sign } from "node:crypto";

describe("Stripe webhook signatures", () => {
  it("accepts a fresh valid v1 signature and rejects a bad one", () => {
    const secret = "whsec_test";
    const body = "{\"id\":\"evt_1\"}";
    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    expect(verifyStripeSignature(body, `t=${t},v1=${v1}`, secret)).toBe(true);
    expect(verifyStripeSignature(body, `t=${t},v1=${"ab".repeat(32)}`, secret)).toBe(false);
  });
});

describe("billing revocation state", () => {
  it("revokes a session after a refund mapped through the order", () => {
    let state = emptyBillingState();
    state = applyStripeEvent(state, {
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", customer: "cus_1", payment_intent: "pi_1", subscription: "sub_1" } },
    });
    expect(licenseIsRevoked(state, { sid: "cs_1", sub: "sub_1" })).toBe(false);
    state = applyStripeEvent(state, {
      type: "charge.refunded",
      data: { object: { customer: "cus_1", payment_intent: "pi_1" } },
    });
    expect(licenseIsRevoked(state, { sid: "cs_1", sub: "sub_1" })).toBe(true);
  });

  it("revokes on subscription deleted", () => {
    let state = emptyBillingState();
    state = applyStripeEvent(state, {
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_x", customer: "cus_x" } },
    });
    expect(licenseIsRevoked(state, { sid: "", sub: "sub_x" })).toBe(true);
  });
});

const PRIV = "MC4CAQAwBQYDK2VwBCIEIGow2bwmfeQU4rx99iwrF5r+u2wdb+JmyC84+3n0t0l3";

function mint(extra: Record<string, unknown>) {
  const payload = {
    v: 1 as const,
    plan: "pro" as const,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const key = createPrivateKey({
    key: Buffer.from(PRIV, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const signature = sign(null, Buffer.from(payloadB64), key);
  const sigB64 = signature.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `fundament1.${payloadB64}.${sigB64}`;
}

describe("license binding", () => {
  it("round-trips sid and ext on a signed token", async () => {
    const token = mint({ sid: "cs_test_1234", ext: "abcdefghijklmnopqrstuvwxyzabcdef" });
    const claims = await verifyLicense(token);
    expect(claims?.sid).toBe("cs_test_1234");
    expect(claims?.ext).toBe("abcdefghijklmnopqrstuvwxyzabcdef");
  });
});

describe("license status client", () => {
  it("treats revoked:true as revoked and network errors as not revoked", async () => {
    const ok = await fetchLicenseRevoked("cs_1", "", async () =>
      new Response(JSON.stringify({ revoked: true }), { status: 200 }),
    );
    expect(ok).toBe(true);
    const down = await fetchLicenseRevoked("cs_1", "", async () => {
      throw new Error("offline");
    });
    expect(down).toBe(false);
  });
});
