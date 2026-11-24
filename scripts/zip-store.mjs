/**
 * Zip a directory so two packs of the same bytes share one SHA-256.
 * Timestamps are the ZIP epoch, names are sorted, modes are fixed.
 * No extra fields, so a tool cannot tuck the current time in beside the name.
 */
import { readFileSync, readdirSync, lstatSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

const DOS_TIME = 0;
const DOS_DATE = 0x0021;
const UTF8 = 0x0800;

function entries(sourceDir) {
  const found = [];
  function walk(dir) {
    const names = readdirSync(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const name of names) {
      const abs = join(dir, name);
      const info = lstatSync(abs);
      const rel = relative(sourceDir, abs).split(sep).join("/");
      if (info.isDirectory()) {
        found.push({ name: `${rel}/`, data: null });
        walk(abs);
      } else if (info.isFile()) {
        found.push({ name: rel, data: readFileSync(abs) });
      }
    }
  }
  walk(sourceDir);
  found.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return found;
}

function header(signature, versionMade, entry, name, compressed, offset) {
  const data = entry.data ?? Buffer.alloc(0);
  const method = entry.data ? 8 : 0;
  const crc = entry.data ? crc32(data) : 0;
  const size = signature === 0x04034b50 ? 30 : 46;
  const buf = Buffer.alloc(size);
  let at = 0;
  buf.writeUInt32LE(signature, at);
  at += 4;
  if (versionMade !== null) {
    buf.writeUInt16LE(versionMade, at);
    at += 2;
  }
  buf.writeUInt16LE(20, at);
  at += 2;
  buf.writeUInt16LE(UTF8, at);
  at += 2;
  buf.writeUInt16LE(method, at);
  at += 2;
  buf.writeUInt16LE(DOS_TIME, at);
  at += 2;
  buf.writeUInt16LE(DOS_DATE, at);
  at += 2;
  buf.writeUInt32LE(crc >>> 0, at);
  at += 4;
  buf.writeUInt32LE(compressed.length, at);
  at += 4;
  buf.writeUInt32LE(data.length, at);
  at += 4;
  buf.writeUInt16LE(name.length, at);
  at += 2;
  buf.writeUInt16LE(0, at);
  at += 2;
  if (signature === 0x02014b50) {
    buf.writeUInt16LE(0, at);
    at += 2;
    buf.writeUInt16LE(0, at);
    at += 2;
    buf.writeUInt16LE(0, at);
    at += 2;
    const mode = entry.data ? 0o100644 : 0o040755;
    buf.writeUInt32LE((mode << 16) >>> 0, at);
    at += 4;
    buf.writeUInt32LE(offset, at);
  }
  return buf;
}

export function writeDeterministicZip(sourceDir, destZip) {
  const files = entries(sourceDir);
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of files) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = entry.data ? deflateRawSync(entry.data, { level: 9 }) : Buffer.alloc(0);
    const local = header(0x04034b50, null, entry, name, compressed, offset);
    locals.push(Buffer.concat([local, name, compressed]));
    centrals.push(Buffer.concat([header(0x02014b50, 0x0314, entry, name, compressed, offset), name]));
    offset += local.length + name.length + compressed.length;
  }
  const central = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(offset, 16);
  writeFileSync(destZip, Buffer.concat([...locals, central, eocd]));
}

const CHECKSUM_LINE = /SHA-256 of `fundament-store\.zip`: `[0-9a-f]{64}`\n/;

export function insertZipChecksum(markdown, sha256) {
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error("checksum must be 64 hex characters");
  const line = `SHA-256 of \`fundament-store.zip\`: \`${sha256}\`\n`;
  const section = `## Release notes\n\n${line}`;
  if (markdown.includes("## Release notes")) {
    if (!CHECKSUM_LINE.test(markdown)) throw new Error("release notes are missing the checksum line");
    return markdown.replace(CHECKSUM_LINE, line);
  }
  const gap = markdown.endsWith("\n") || markdown.length === 0 ? "\n" : "\n\n";
  return `${markdown}${gap}${section}`;
}
