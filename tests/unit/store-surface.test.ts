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

  it("does not offer a telemetry switch on the store pages", () => {
    const popup = readFileSync("src/ui/popup/App.tsx", "utf8");
    const telemetry = popup.indexOf('t("toggle_telemetry")');
    const guard = popup.lastIndexOf("isStorePack()", telemetry);
    expect(telemetry).toBeGreaterThan(0);
    expect(guard).toBeGreaterThan(0);
    expect(popup.slice(guard, telemetry)).toContain("? null");
    expect(en).not.toContain("turning it on");
    expect(de).not.toContain("Einschalten");
  });

  it("drops the unused reputation line and keeps the plan badge off the store popup", () => {
    const enMessages = readFileSync("public/_locales/en/messages.json", "utf8");
    const deMessages = readFileSync("public/_locales/de/messages.json", "utf8");
    expect(enMessages).not.toContain("Online reputation unavailable");
    expect(deMessages).not.toContain("Online-Reputation nicht verfügbar");
    const popup = readFileSync("src/ui/popup/App.tsx", "utf8");
    const badge = popup.indexOf('t("popup_planFree")');
    const guard = popup.lastIndexOf("isStorePack()", badge);
    expect(badge).toBeGreaterThan(0);
    expect(popup.slice(guard, badge)).toContain("? null");
  });

  it("names the public GitHub issues page as the contact", () => {
    const url = "https://github.com/slezzz/fundament/issues";
    expect(privacy).toContain(url);
    expect(en).toContain(url);
    expect(de).toContain(url);
    expect(de).toMatch(/\bdu\b/);
  });

  it("fills the store privacy form: every data type, the three certifications, and the policy address", () => {
    for (const kind of [
      "Personally identifiable information",
      "Health information",
      "Financial and payment information",
      "Authentication information",
      "Personal communications",
      "Location",
      "Web history",
      "User activity",
      "Website content",
    ]) {
      expect(dash).toContain(kind);
    }
    expect(dash).toContain("I do not sell or transfer user data to third parties, outside of the approved use cases.");
    expect(dash).toContain("I do not use or transfer user data for purposes that are unrelated to my item's single purpose.");
    expect(dash).toContain("I do not use or transfer user data to determine creditworthiness or for lending purposes.");
    expect(dash).toContain("https://slezzz.github.io/fundament/privacy/en.html");
    expect(dash).toContain("https://www.wikipedia.org/");
  });
});
