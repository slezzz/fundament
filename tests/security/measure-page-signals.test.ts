import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hostnameOnly, hostsMatch, loadTargets, publicRecord, summary } from "../../scripts/measure-page-signals.mjs";

const root = resolve(import.meta.dirname, "../..");

describe("page-signal measurement", () => {
  it("keeps a path, a query, and page text out of the local record", () => {
    const record = publicRecord({
      group: "docs",
      index: 4,
      url: "https://user:secret@example.com/install.sh?token=abc#frag",
      title: "Run this in your terminal",
      text: "curl -fsSL https://example.com/install.sh | sh",
      signals: ["clickfix-url", "not a signal", ""],
      warned: false,
      status: "measured",
      copyClicks: 9,
      copyWarned: false,
    });
    const encoded = JSON.stringify(record);
    expect(record).toEqual({
      group: "docs",
      index: 4,
      host: "example.com",
      signals: ["clickfix-url"],
      warned: false,
      status: "measured",
      copyClicks: 2,
      copyWarned: false,
    });
    expect(encoded).not.toContain("secret");
    expect(encoded).not.toContain("token");
    expect(encoded).not.toContain("install.sh");
    expect(encoded).not.toContain("terminal");
    expect(encoded).not.toContain("curl");
    expect(hostnameOnly("https://docs.example.com/a/b?q=1")).toBe("docs.example.com");
    expect(hostnameOnly("not a host/path")).toBe("");
  });

  it("summarizes counts and hostnames only", () => {
    const report = summary(
      [
        publicRecord({ group: "corpus", index: 0, host: "brew.sh", signals: ["login-form"], warned: false, status: "measured" }),
        publicRecord({
          group: "majestic",
          index: 1,
          url: "https://news.example/story?id=9",
          signals: ["tech-support-scam"],
          warned: true,
          status: "measured",
        }),
        publicRecord({ group: "docs", index: 2, host: "gone.example", status: "not-measured" }),
      ],
      "2026-11-17",
    );
    const encoded = JSON.stringify(report);
    expect(report.measured).toBe(2);
    expect(report.notMeasured).toBe(1);
    expect(report.warnings).toBe(1);
    expect(report.bySignal["tech-support-scam"]).toEqual({ seen: 1, warned: 1 });
    expect(report.bySignal["login-form"]).toEqual({ seen: 1, warned: 0 });
    expect(report.warningHosts).toEqual(["news.example"]);
    expect(encoded).not.toContain("story");
    expect(encoded).not.toContain("?");
    expect(encoded).not.toContain("http");
  });

  it("is not part of CI and does not remap the network", () => {
    const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
    const ignore = readFileSync(resolve(root, ".gitignore"), "utf8");
    const source = readFileSync(resolve(root, "scripts/measure-page-signals.mjs"), "utf8");
    expect(ci).not.toContain("measure-page-signals");
    expect(pkg.scripts.test).not.toContain("measure-page-signals");
    expect(pkg.scripts["test:e2e"]).not.toContain("measure-page-signals");
    expect(ignore).toContain("measure-output/");
    expect(source).not.toContain("host-resolver-rules");
  });

  it("loads the corpus, about 100 doc pages, and 500 home pages", () => {
    const targets = loadTargets(root);
    expect(targets.corpus).toHaveLength(22);
    expect(targets.docs.length).toBeGreaterThanOrEqual(100);
    expect(targets.majestic).toHaveLength(500);
    for (const target of [...targets.corpus, ...targets.docs, ...targets.majestic]) {
      expect(target.url.startsWith("https://"), target.url).toBe(true);
      expect(target.url).not.toContain("?");
      expect(hostnameOnly(target.url)).not.toBe("");
    }
    expect(targets.majestic[0]?.host).toBe("google.com");
    expect(hostsMatch("google.com", "www.google.com")).toBe(true);
    expect(hostsMatch("google.com", "www.google.de")).toBe(false);
    expect(loadTargets(root, 2000).majestic).toHaveLength(2000);
  });
});
