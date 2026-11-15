import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hasPublicSuffixRule, publicSuffixOf } from "@engine/domain/psl";
import { parseDomain } from "@engine/domain/parse";
import { falsePositiveReport, missedPhishingIssueUrl, reportHostAllowed, reportIssueRoot } from "@engine/report/githubIssue";
import { parseHttpUrl } from "@engine/url/parse";
import { REPORT_GITHUB_REPO } from "@shared/constants";

const VERSIONS = { engineVersion: "2.0.0", weightsVersion: "2.0.0", extensionVersion: "1.1.0" };

function fromUrl(raw: string, signalKeys: string[]) {
  const parsed = parseHttpUrl(raw);
  const domain = parseDomain(parsed);
  return falsePositiveReport({
    hostname: domain?.hostnameUnicode ?? parsed.hostnameUnicode,
    hostnameAscii: parsed.hostname,
    inPublicSuffixList: domain?.inPublicSuffixList ?? false,
    registrableDomain: domain?.registrableDomain ?? "",
    signalKeys,
    ...VERSIONS,
  });
}

describe("false-alarm report", () => {
  it("opens only the configured repository's new-issue path", () => {
    const secret = "super-secret-token";
    const report = fromUrl(
      `https://user:pass@paypal-login.secure-check.xyz/reset/${secret}?token=${secret}#${secret}`,
      ["imp-keyword", `leak-${secret}`, "not a key"],
    );
    expect(report).not.toBeNull();
    const url = new URL(report!.url);
    expect(`${url.origin}${url.pathname}`).toBe(`https://github.com/${REPORT_GITHUB_REPO}/issues/new`);
    expect(`${url.origin}${url.pathname}`).toBe(reportIssueRoot());
    expect(url.username).toBe("");
    expect(url.password).toBe("");
    expect(url.hash).toBe("");
    expect(url.searchParams.get("template")).toBe("false-positive.yml");
    expect(url.searchParams.get("host")).toBe("paypal-login.secure-check.xyz");
    expect(url.searchParams.get("signals")).toBe("imp-keyword");
    expect(url.searchParams.get("engine")).toBe("2.0.0");
    expect(url.searchParams.get("weights")).toBe("2.0.0");
    expect(url.searchParams.get("extension")).toBe("1.1.0");
    expect(JSON.stringify(report)).not.toContain(secret);
    expect(report!.url).not.toContain("user");
    expect(report!.url).not.toContain("pass");
    expect(report!.url).not.toContain("/reset");
  });

  it("refuses a full address passed in place of a hostname", () => {
    expect(
      falsePositiveReport({
        hostname: "https://user:pass@evil.example/path?token=secret#frag",
        hostnameAscii: "evil.example",
        inPublicSuffixList: true,
        registrableDomain: "evil.example",
        signalKeys: ["imp-keyword"],
        ...VERSIONS,
      }),
    ).toBeNull();
  });

  it("sends the unicode name and the punycode form, and keeps them the same host", () => {
    const report = fromUrl("https://münchen.de/login?token=secret", ["imp-other-tld"]);
    expect(report).not.toBeNull();
    expect(report!.host).toBe("münchen.de");
    expect(report!.hostAscii).toMatch(/^xn--/);
    expect(report!.url).not.toContain("secret");
    expect(report!.url).not.toContain("/login");
    const url = new URL(report!.url);
    expect(`${url.origin}${url.pathname}`).toBe(reportIssueRoot());
    expect(url.searchParams.get("host")).toBe(report!.host);
    expect(url.searchParams.get("host_ascii")).toBe(report!.hostAscii);
  });

  it("has no report link for local names, private addresses, or hosts outside the public suffix list", () => {
    const keys = ["imp-keyword"];
    const blocked = [
      "https://fritz.box/login",
      "https://printer.local/",
      "https://nas.lan/admin",
      "https://localhost/",
      "https://router/",
      "https://127.0.0.1/admin?token=secret",
      "https://10.1.2.3/",
      "https://192.168.0.50/setup",
      "https://172.16.0.1/",
      "https://169.254.1.1/",
      "https://[::1]/",
      "https://8.8.8.8/",
      "https://intranet-host.notarealtld/secret-path",
    ];
    for (const raw of blocked) {
      expect(fromUrl(raw, keys), raw).toBeNull();
    }
    expect(reportHostAllowed("fritz.box", true)).toBe(false);
    expect(reportHostAllowed("10.1.2.3", true)).toBe(false);
    expect(reportHostAllowed("::1", true)).toBe(false);
    expect(reportHostAllowed("intranet-host.notarealtld", false)).toBe(false);
    expect(reportHostAllowed("evil.pages.dev", true, "evil.pages.dev")).toBe(true);
    expect(reportHostAllowed("127.0.0.1.nip.io", true, "nip.io")).toBe(false);
    expect(hasPublicSuffixRule("intranet-host.notarealtld")).toBe(false);
    expect(publicSuffixOf(["intranet-host", "notarealtld"])).toBe("notarealtld");
    expect(hasPublicSuffixRule("paypal-login.secure-check.xyz")).toBe(true);
    expect(hasPublicSuffixRule("evil.pages.dev")).toBe(true);
    expect(hasPublicSuffixRule("127.0.0.1.nip.io")).toBe(true);
    expect(fromUrl("https://127.0.0.1.nip.io/admin?token=secret", ["dns-rebind"]), "rebind").toBeNull();
    expect(fromUrl("https://192.168.1.5.sslip.io/", ["dns-rebind"]), "sslip").toBeNull();
    expect(fromUrl("https://10-0-0-1.localtest.me/setup", ["dns-rebind"]), "localtest").toBeNull();
  });

  it("sorts signal keys and drops anything that is not a catalog key", () => {
    const report = fromUrl("https://evil.pages.dev/", ["brand-content", "imp-keyword", "../passwd", "brand-content"]);
    expect(report!.signals).toEqual(["brand-content", "imp-keyword"]);
  });

  it("opens the missed-phishing form on the same repository with no hostname", () => {
    const url = new URL(missedPhishingIssueUrl());
    expect(`${url.origin}${url.pathname}`).toBe(`https://github.com/${REPORT_GITHUB_REPO}/issues/new`);
    expect(url.searchParams.get("template")).toBe("missed-phish.yml");
    expect([...url.searchParams.keys()]).toEqual(["template"]);
  });

  it("states in both languages that the report is public", () => {
    const en = JSON.parse(readFileSync(resolve("public/_locales/en/messages.json"), "utf8")) as Record<string, { message: string }>;
    const de = JSON.parse(readFileSync(resolve("public/_locales/de/messages.json"), "utf8")) as Record<string, { message: string }>;
    expect(en.warn_reportPublic?.message).toBe("This report is publicly visible.");
    expect(de.warn_reportPublic?.message).toBe("Diese Meldung ist öffentlich sichtbar.");
    expect(de.dash_missedPhishNote?.message).toMatch(/du|Öffnet/);
    expect(de.dash_missedPhishNote?.message).not.toMatch(/\b(Sie|Ihnen|Ihr)\b/);
  });
});
