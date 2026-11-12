import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canonicalHostPayload,
  hostsToDnrRules,
  parseHostPack,
  parseHttpsUrl,
  parseNetworkHosts,
  parseSha256Pin,
  sha256Hex,
} from "@engine/filters/abp";
import { verifyHostPack } from "@network/pack";
import { t } from "../../src/ui/lib/i18n";
import { looksDangerousDownload } from "../../src/background/downloads";

describe("ABP host compiler", () => {
  it("keeps ||host^ and drops cosmetic and exceptions", () => {
    const hosts = parseNetworkHosts(`
! comment
||ads.example^
example.com##.ad
@@||good.example^
||also.example^$third-party
`);
    expect(hosts).toEqual(["ads.example", "also.example"]);
  });

  it("chunks hosts into DNR rules", () => {
    const hosts = Array.from({ length: 41 }, (_, i) => `t${i}.example`);
    const rules = hostsToDnrRules(hosts, 40_000);
    expect(rules).toHaveLength(2);
    expect(rules[0]?.id).toBe(40_000);
    expect(rules[0]?.condition.requestDomains).toHaveLength(40);
    expect(rules[1]?.condition.requestDomains).toHaveLength(1);
  });
});

describe("pinned host pack", () => {
  it("rejects http URLs and short pins", () => {
    expect(parseHttpsUrl("http://evil.test/pack.json")).toBeNull();
    expect(parseSha256Pin("abc")).toBeNull();
  });

  it("accepts a pack only when the hash matches the hosts", async () => {
    const hosts = ["a.example", "b.example"];
    const sha256 = await sha256Hex(canonicalHostPayload(hosts));
    const pack = parseHostPack({ v: 1, kind: "dnr-hosts", hosts, sha256 });
    expect(pack).not.toBeNull();
    const ok = await verifyHostPack(pack!, sha256);
    expect(ok.ok).toBe(true);
    const bad = await verifyHostPack(pack!, "aa".repeat(32));
    expect(bad.ok).toBe(false);
  });
});

describe("i18n fallback", () => {
  it("returns English when chrome.i18n is missing", () => {
    expect(t("popup_inspect")).toBe("Inspect verdict");
  });
});

describe("download host list", () => {
  it("blocks listed malware download hosts", () => {
    expect(looksDangerousDownload("https://malware-download.test/file.bin", ["malware-download.test"])).toBe(true);
    expect(looksDangerousDownload("https://example.com/file.bin", ["malware-download.test"])).toBe(false);
  });
});

describe("shipped ads-extra list", () => {
  it("is ads-networks only so Pro extended trackers stay gated", () => {
    const ads = parseNetworkHosts(readFileSync(resolve("filters/ads-networks.txt"), "utf8"));
    const extra = parseNetworkHosts(readFileSync(resolve("filters/trackers-extended.txt"), "utf8"));
    expect(ads.length).toBeGreaterThan(200);
    const onlyPro = extra.filter((h) => !ads.includes(h));
    expect(onlyPro.length).toBeGreaterThan(50);
    const rules = hostsToDnrRules(ads, 1);
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
