import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freeZipProblems } from "../../scripts/release-check.mjs";
import { insertZipChecksum, writeDeterministicZip } from "../../scripts/zip-store.mjs";

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function centrals(zip: Buffer): { name: string; stamp: number; mode: number }[] {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("no end of central directory");
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  const out: { name: string; stamp: number; mode: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("bad central header");
    const nameLen = zip.readUInt16LE(offset + 28);
    const extraLen = zip.readUInt16LE(offset + 30);
    const commentLen = zip.readUInt16LE(offset + 32);
    const name = zip.subarray(offset + 46, offset + 46 + nameLen).toString("utf8");
    const stamp = zip.readUInt32LE(offset + 12);
    const mode = (zip.readUInt32LE(offset + 38) >>> 16) & 0o7777;
    out.push({ name, stamp, mode });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

describe("reproducible store zip", () => {
  it("packs the same tree twice to the same sha256", async () => {
    const dir = await mkdtemp(join(tmpdir(), "fundament-zip-"));
    const source = join(dir, "tree");
    try {
      await mkdir(join(source, "nested"), { recursive: true });
      await writeFile(join(source, "b.txt"), "second\n");
      await writeFile(join(source, "nested", "a.txt"), "first\n");
      const one = join(dir, "one.zip");
      const two = join(dir, "two.zip");
      await writeDeterministicZip(source, one);
      const later = new Date("2024-06-01T12:00:00Z");
      await utimes(join(source, "b.txt"), later, later);
      await utimes(join(source, "nested"), later, later);
      await writeDeterministicZip(source, two);
      const first = await readFile(one);
      const second = await readFile(two);
      expect(sha256(first)).toBe(sha256(second));
      const entries = centrals(first);
      const names = entries.map((entry) => entry.name);
      expect(names).toEqual([...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
      expect(new Set(entries.map((entry) => entry.stamp))).toEqual(new Set([0x00210000]));
      for (const entry of entries) {
        expect(entry.mode).toBe(entry.name.endsWith("/") ? 0o755 : 0o644);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a zip that names a page-timeline mark", async () => {
    const dir = await mkdtemp(join(tmpdir(), "fundament-mark-"));
    const source = join(dir, "tree");
    try {
      await mkdir(source, { recursive: true });
      await writeFile(join(source, "content.js"), 'performance.measure("fundament-content",{})\n');
      const dest = join(dir, "out.zip");
      writeDeterministicZip(source, dest);
      expect(freeZipProblems(await readFile(dest))).toContain("measure-mark");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("puts the checksum in the release notes and replaces the previous one", () => {
    const hash = "ab".repeat(32);
    const next = insertZipChecksum("# Listing\n", hash);
    expect(next).toContain(`SHA-256 of \`fundament-store.zip\`: \`${hash}\``);
    const other = "cd".repeat(32);
    const replaced = insertZipChecksum(next, other);
    expect(replaced.match(/SHA-256 of `fundament-store\.zip`:/g)).toHaveLength(1);
    expect(replaced).toContain(other);
    expect(replaced).not.toContain(hash);
  });
});
