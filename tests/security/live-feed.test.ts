import { createPrivateKey, generateKeyPairSync, sign } from "node:crypto";
import { canonicalLivePayload, clientSafeHosts, parseLiveFeed, verifyLiveFeed } from "@engine/feeds/live";
import { buildDynamicRules } from "@network/dnr";
import { canonical } from "../../scripts/build-live-feed.mjs";
import { keepHost } from "../../scripts/fetch-threat-feeds.mjs";

const pair = generateKeyPairSync("ed25519");
const PUB = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");
const PRIV = pair.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
const other = generateKeyPairSync("ed25519");

const NOW = Date.parse("2026-11-12T12:00:00Z");

function signed(hosts: string[], version = 202611121200, generated = "2026-11-12T11:30:00.000Z", key = PRIV) {
  const privateKey = createPrivateKey({ key: Buffer.from(key, "base64"), format: "der", type: "pkcs8" });
  const sig = sign(null, Buffer.from(canonicalLivePayload(version, generated, hosts), "utf8"), privateKey).toString("base64");
  return { format: "fundament-live-v1", version, generated, hosts, sig };
}

async function check(raw: unknown, lastVersion = 0) {
  const parsed = parseLiveFeed(raw);
  if (!parsed.ok) return parsed;
  return verifyLiveFeed(parsed.feed, PUB, { now: NOW, lastVersion });
}

describe("live feed trust", () => {
  it("uses the same canonical payload in the publisher script and the extension", () => {
    expect(canonical(1, "x", ["a.example", "b.example"])).toBe(canonicalLivePayload(1, "x", ["a.example", "b.example"]));
  });

  it("accepts a correctly signed, fresh, newer list", async () => {
    const result = await check(signed(["evil-login.example", "kit.pages.dev"]), 202611110000);
    expect(result.ok).toBe(true);
  });

  it("rejects a list signed by any other key", async () => {
    const forged = signed(["google.com"], 202611121200, "2026-11-12T11:30:00.000Z", other.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"));
    const result = await check(forged);
    expect(result).toEqual({ ok: false, error: "signature does not match" });
  });

  it("rejects a list whose hosts were changed after signing", async () => {
    const feed = signed(["evil-login.example"]);
    feed.hosts = ["evil-login.example", "paypal.com"].sort();
    expect((await check(feed)).ok).toBe(false);
  });

  it("rejects replaying an older or the same version", async () => {
    expect(await check(signed(["a.example"], 100), 100)).toEqual({ ok: false, error: "not newer than the installed list" });
    expect(await check(signed(["a.example"], 99), 100)).toEqual({ ok: false, error: "not newer than the installed list" });
  });

  it("rejects stale and future-dated lists", async () => {
    expect(await check(signed(["a.example"], 5, "2026-10-01T00:00:00.000Z"))).toEqual({ ok: false, error: "list is too old" });
    expect(await check(signed(["a.example"], 5, "2026-11-20T00:00:00.000Z"))).toEqual({ ok: false, error: "timestamp in the future" });
  });

  it("rejects malformed content before touching the signature", () => {
    expect(parseLiveFeed({ ...signed(["a.example"]), format: "other" }).ok).toBe(false);
    expect(parseLiveFeed({ ...signed(["a.example"]), hosts: ["<script>"] }).ok).toBe(false);
    expect(parseLiveFeed({ ...signed(["b.example", "a.example"]) }).ok).toBe(false);
    expect(parseLiveFeed({ ...signed(["a.example"]), version: 1.5 }).ok).toBe(false);
    expect(parseLiveFeed(null).ok).toBe(false);
  });

  it("never blocks protected hosts even if a valid list contains them", () => {
    const isProtected = (h: string) => ["google.com", "accounts.google.com", "pages.dev"].includes(h);
    expect(clientSafeHosts(["accounts.google.com", "evil.example", "pages.dev"], isProtected)).toEqual(["evil.example"]);
  });

  it("publisher filter drops platforms, shorteners, and brand hosts", () => {
    for (const host of ["bit.ly", "pastebin.com", "sites.google.com", "accounts.google.com", "pages.dev", "github.io"]) {
      expect(keepHost(host), host).toBe(false);
    }
    for (const host of ["paypal-verify.pages.dev", "secure-login-paypal.com", "kit.weebly.com"]) {
      expect(keepHost(host), host).toBe(true);
    }
  });

  it("turns live hosts into warning-page redirects within the dynamic rule budget", () => {
    const hosts = Array.from({ length: 2500 }, (_, i) => `kit${i}.example`);
    const rules = buildDynamicRules([], [], [], [], [], hosts).filter((r) => r.action.redirect?.extensionPath === "/warning.html?blocked=feed");
    expect(rules).toHaveLength(3);
    expect(rules.every((r) => (r.condition.requestDomains ?? []).length <= 1000)).toBe(true);
  });
});
