import { createPrivateKey, sign } from "node:crypto";
import { verifyLicense } from "@billing/license";
import { applyEntitlements } from "@billing/apply";
import { entitlementsFor } from "@billing/entitlements";
import { DEFAULT_SETTINGS } from "@storage/settings";

const PRIV =
  "MC4CAQAwBQYDK2VwBCIEIGow2bwmfeQU4rx99iwrF5r+u2wdb+JmyC84+3n0t0l3";

function mint(exp: number | null): string {
  const payload = {
    v: 1 as const,
    plan: "pro" as const,
    iat: Math.floor(Date.now() / 1000),
    exp,
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

describe("license", () => {
  it("accepts a signed Pro token", async () => {
    const token = mint(Math.floor(Date.now() / 1000) + 3600);
    const claims = await verifyLicense(token);
    expect(claims?.plan).toBe("pro");
  });

  it("rejects garbage and expired tokens", async () => {
    expect(await verifyLicense("nope")).toBeNull();
    const expired = mint(Math.floor(Date.now() / 1000) - 10);
    expect(await verifyLicense(expired)).toBeNull();
  });
});

describe("entitlements", () => {
  it("keeps local protection on Free and strips Pro-only settings", () => {
    const next = applyEntitlements(
      {
        ...DEFAULT_SETTINGS,
        onlineReputation: true,
        cosmeticFiltering: true,
        filterPackUrl: "https://example.com/pack.json",
        securityLevel: "strict",
        allowlist: Array.from({ length: 20 }, (_, i) => `h${i}.test`),
      },
      entitlementsFor("free"),
    );
    expect(next.threatProtection).toBe(true);
    expect(next.onlineReputation).toBe(false);
    expect(next.cosmeticFiltering).toBe(false);
    expect(next.filterPackUrl).toBe("");
    expect(next.securityLevel).toBe("standard");
    expect(next.allowlist).toHaveLength(10);
  });
});
