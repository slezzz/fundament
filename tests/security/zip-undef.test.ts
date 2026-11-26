import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { storeZipDetection, storeZipExcluded } from "../e2e/store-pack-scope";
import { freeZipProblems } from "../../scripts/release-check.mjs";
import { storeOmitProblems, undefinedNameProblems } from "../../scripts/zip-undef.mjs";
import { writeDeterministicZip } from "../../scripts/zip-store.mjs";

async function zipWith(files: Record<string, string>): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "fundament-undef-"));
  const source = join(dir, "tree");
  try {
    await mkdir(source, { recursive: true });
    for (const [name, text] of Object.entries(files)) {
      const path = join(source, name);
      await mkdir(join(path, ".."), { recursive: true });
      await writeFile(path, text);
    }
    const dest = join(dir, "out.zip");
    writeDeterministicZip(source, dest);
    return await readFile(dest);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("undefined names in a packed zip", () => {
  it("fails on the old cosmetic cut, which called hostAllowed after deleting it", async () => {
    const zip = await zipWith({
      "content.js": "(function(){\nif (hostAllowed([], location.hostname)) return;\n})();\n",
      "content-search.js": "(function(){\n})();\n",
      "content-bridge.js": "(function(){\n})();\n",
      "background.js": "chrome.runtime.onInstalled.addListener(function(){});\n",
    });
    const problems = undefinedNameProblems(zip);
    expect(problems.some((problem) => problem.startsWith("content.js:") && problem.includes("'hostAllowed' is not defined"))).toBe(true);
    expect(freeZipProblems(zip).some((problem) => problem.includes("'hostAllowed' is not defined"))).toBe(true);
  });

  it("accepts the same call when the function is in the script", async () => {
    const zip = await zipWith({
      "content.js": "(function(){\nfunction hostAllowed(){return false}\nif (hostAllowed()) return;\n})();\n",
    });
    expect(undefinedNameProblems(zip)).toEqual([]);
  });

  it("allows the three React typeof probes only in the vendor file that checks them", async () => {
    const probe = "var t = typeof setImmediate === 'function' ? setImmediate : function(){};\n";
    const vendor = await zipWith({ "assets/global.js": probe });
    expect(undefinedNameProblems(vendor)).toEqual([]);
    const script = await zipWith({ "content.js": probe });
    expect(undefinedNameProblems(script).some((problem) => problem.includes("'setImmediate' is not defined"))).toBe(true);
    const bare = await zipWith({ "assets/global.js": "setImmediate(function(){});\n" });
    expect(undefinedNameProblems(bare).some((problem) => problem.includes("'setImmediate' is not defined"))).toBe(true);
  });

  it("reports a store-omit piece that is still in the zip", async () => {
    const zip = await zipWith({
      "content-shield.js": "(function(){})();\n",
      "content.js": 'document.getElementById("fundament-cosmetic");\n',
      "manifest.json": '{ "permissions": ["scripting"], "externally_connectable": {} }\n',
      "rules/trackers-extended.json": "{}\n",
    });
    const problems = storeOmitProblems(zip);
    expect(problems).toContain("content-shield.js");
    expect(problems).toContain("trackers-extended");
    expect(problems).toContain("scripting");
    expect(problems).toContain("externally_connectable");
    expect(problems.some((problem) => problem.includes("cosmetic"))).toBe(true);
  });

  it("keeps the store-zip detection list on the live scenarios and gives every exclusion a reason", () => {
    const source = readFileSync("tests/e2e/live.spec.ts", "utf8");
    for (const title of storeZipDetection) expect(source).toContain(title);
    expect(storeZipExcluded.length).toBeGreaterThan(0);
    for (const item of storeZipExcluded) expect(item.reason.length).toBeGreaterThan(40);
  });
});
