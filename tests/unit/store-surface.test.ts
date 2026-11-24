import { readFileSync } from "node:fs";
import { storeManifest } from "@billing/storeManifest";

const manifest = JSON.parse(readFileSync("src/manifest.json", "utf8")) as {
  permissions: string[];
  host_permissions: string[];
  externally_connectable?: { matches: string[] };
};
const store = storeManifest(manifest);
const dash = readFileSync("STORE_DASHBOARD.md", "utf8");
const privacy = readFileSync("PRIVACY.md", "utf8");
const en = readFileSync("pages/privacy/en.html", "utf8");
const de = readFileSync("pages/privacy/de.html", "utf8");
const listing = readFileSync("STORE_LISTING.md", "utf8");

describe("free store surface", () => {
  it("lists every store permission in the dashboard and in the privacy pages", () => {
    expect(store.permissions).not.toContain("scripting");
    expect(store.externally_connectable).toBeUndefined();
    for (const permission of store.permissions ?? []) {
      expect(dash).toContain(permission);
      expect(privacy).toContain(permission);
      expect(en).toContain(permission);
      expect(de).toContain(permission);
    }
    for (const host of manifest.host_permissions) {
      expect(dash).toContain(host);
      expect(privacy).toContain(host);
      expect(en).toContain(host);
      expect(de).toContain(host);
    }
  });

  it("publishes the same leave-the-device facts, with no checkout and no scripts", () => {
    expect(en.toLowerCase()).not.toContain("<script");
    expect(de.toLowerCase()).not.toContain("<script");
    for (const fact of ["versionhistory.googleapis.com", "api.pwnedpasswords.com", "6 hours"]) {
      expect(privacy).toContain(fact);
      expect(en).toContain(fact);
    }
    expect(de).toContain("versionhistory.googleapis.com");
    expect(de).toContain("api.pwnedpasswords.com");
    expect(de).toMatch(/\bdu\b/);
    for (const doc of [privacy, en, de, dash]) {
      expect(doc.toLowerCase()).not.toContain("stripe");
      expect(doc).not.toContain("/v1/license");
      expect(doc).not.toContain("/v1/reputation");
      expect(doc).not.toContain("/pay/start");
    }
  });

  it("keeps Pro, a price, and a paid promise out of the listing", () => {
    expect(listing).not.toMatch(/(^|[^A-Za-z])Pro(?![a-z])/);
    expect(listing.toLowerCase()).not.toMatch(/\bpaid\b|\bprice\b|kostenpflichtig|bald/);
  });
});
