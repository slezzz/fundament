import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freeZipProblems } from "../../scripts/release-check.mjs";
import { writeDeterministicZip } from "../../scripts/zip-store.mjs";

function zipWith(name: string, text: string): Buffer {
  const dir = mkdtempSync(join(tmpdir(), "fundament-free-"));
  try {
    writeFileSync(join(dir, name), text);
    const dest = join(dir, "out.zip");
    writeDeterministicZip(dir, dest);
    return readFileSync(dest);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("free release zip", () => {
  it("fails when the zip contains a loopback address", () => {
    expect(freeZipProblems(zipWith("settings.js", "return `http://127.0.0.1:8787`"))).toContain("127.0.0.1");
    expect(freeZipProblems(zipWith("settings.js", "http://localhost:8787/pay"))).toContain("localhost");
  });

  it("fails when the zip names a page-timeline mark", () => {
    expect(freeZipProblems(zipWith("content.js", 'performance.measure("fundament-content", {})'))).toContain("measure-mark");
    expect(freeZipProblems(zipWith("content-bridge.js", 'performance.measure("fundament-bridge", {})'))).toContain("measure-mark");
  });

  it("allows the dns-rebind check and a feed host that merely contains the word", () => {
    const rebind = "if(t===`localhost`||t.endsWith(`.localhost`)||t===`localhost.localdomain`)return!0";
    const feed = "808211188ad0ed.localhost.run";
    expect(freeZipProblems(zipWith("dnsRebind.js", `${rebind}\n${feed}`))).toEqual([]);
  });
});
