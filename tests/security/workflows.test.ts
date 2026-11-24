import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const dir = resolve(root, ".github/workflows");

function workflows(): { name: string; text: string }[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".yml"))
    .map((name) => ({ name, text: readFileSync(resolve(dir, name), "utf8") }));
}

function jobs(text: string): { name: string; body: string }[] {
  const start = text.indexOf("\njobs:\n");
  if (start < 0) return [];
  const body = text.slice(start + "\njobs:\n".length);
  const parts = body.split(/\n(?= {2}[A-Za-z0-9_-]+:\n)/);
  return parts
    .map((part) => {
      const name = /^ {2}([A-Za-z0-9_-]+):/.exec(part)?.[1] ?? "";
      return { name, body: part };
    })
    .filter((job) => job.name.length > 0);
}

describe("workflow supply chain", () => {
  it("pins every action to a full commit and names the version", () => {
    const bad: string[] = [];
    for (const workflow of workflows()) {
      for (const match of workflow.text.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)(?:\s+#\s*(\S+))?/gm)) {
        const uses = match[1] ?? "";
        const note = match[2] ?? "";
        if (!/@[0-9a-f]{40}$/.test(uses) || !/^v\d+\.\d+\.\d+$/.test(note)) bad.push(`${workflow.name}: ${uses} ${note}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("sets a permissions block on every workflow", () => {
    const bad = workflows().filter((workflow) => !/^permissions:/m.test(workflow.text)).map((workflow) => workflow.name);
    expect(bad).toEqual([]);
  });

  it("signs the live feed with node:crypto only", () => {
    const text = readFileSync(resolve(root, "scripts/sign-live-feed.mjs"), "utf8");
    const imports = [...text.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1] ?? "");
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.every((name) => name.startsWith("node:"))).toBe(true);
  });

  it("does not give a secret to a job that runs npm ci", () => {
    const bad: string[] = [];
    for (const workflow of workflows()) {
      for (const job of jobs(workflow.text)) {
        if (/\bnpm ci\b/.test(job.body) && /secrets\./.test(job.body)) bad.push(`${workflow.name}: ${job.name}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
