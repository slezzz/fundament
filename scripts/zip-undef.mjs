/**
 * The packed store zip is what Chrome runs. A name the minifier left behind
 * throws before the scan, and the typecheck of the source does not see it.
 * Content scripts are classic scripts. The worker and the page bundles are modules.
 */
import { Linter } from "eslint";
import globals from "globals";
import { inflateRawSync } from "node:zlib";

const linter = new Linter({ configType: "flat" });

const runtimeGlobals = {
  ...globals.browser,
  ...globals.webextensions,
  ...globals.serviceworker,
};

/**
 * React checks these with typeof and then uses the name. That is a feature
 * test in the vendor bundle, not a call we wrote. The exception is only those
 * three names, and only in an assets file that contains the typeof check.
 * A content script does not get it.
 */
const REACT_TYPEOF_NAMES = ["setImmediate", "MSApp", "__REACT_DEVTOOLS_GLOBAL_HOOK__"];

const CONTENT_SCRIPTS = new Set(["content.js", "content-search.js", "content-bridge.js"]);

export function zipEntries(bytes) {
  const zip = Buffer.from(bytes);
  const entries = [];
  let offset = 0;
  while (offset + 30 <= zip.length && zip.readUInt32LE(offset) === 0x04034b50) {
    const method = zip.readUInt16LE(offset + 8);
    const compSize = zip.readUInt32LE(offset + 18);
    const nameLen = zip.readUInt16LE(offset + 26);
    const extraLen = zip.readUInt16LE(offset + 28);
    const name = zip.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const start = offset + 30 + nameLen + extraLen;
    const data = zip.subarray(start, start + compSize);
    const body = name.endsWith("/") ? null : method === 0 ? Buffer.from(data) : inflateRawSync(data);
    entries.push({ name, body });
    offset = start + compSize;
  }
  return entries;
}

function isModule(name) {
  return name === "background.js" || (name.startsWith("assets/") && name.endsWith(".js"));
}

function reactGlobals(name, code) {
  if (!name.startsWith("assets/") || !name.endsWith(".js")) return {};
  const extra = {};
  for (const ident of REACT_TYPEOF_NAMES) {
    if (code.includes(`typeof ${ident}`)) extra[ident] = "readonly";
  }
  return extra;
}

export function undefinedNameProblems(bytes) {
  const problems = [];
  for (const entry of zipEntries(bytes)) {
    if (!entry.body) continue;
    const script = CONTENT_SCRIPTS.has(entry.name);
    const module = isModule(entry.name);
    if (!script && !module) continue;
    const code = entry.body.toString("utf8");
    const messages = linter.verify(
      code,
      [
        {
          languageOptions: {
            ecmaVersion: 2022,
            sourceType: script ? "script" : "module",
            globals: { ...runtimeGlobals, ...reactGlobals(entry.name, code) },
          },
          rules: { "no-undef": "error" },
        },
      ],
      { filename: entry.name },
    );
    for (const message of messages) {
      if (message.ruleId === "no-undef") problems.push(`${entry.name}: ${message.message}`);
    }
  }
  return problems;
}

/** Cuts the store pack makes. A hit means the uploaded zip still contains a piece that was supposed to stay out. */
export function storeOmitProblems(bytes) {
  const problems = [];
  const entries = zipEntries(bytes);
  const names = new Set(entries.map((entry) => entry.name));
  if (names.has("content-shield.js")) problems.push("content-shield.js");
  if (names.has("rules/trackers-extended.json")) problems.push("trackers-extended");
  if (names.has("rules/trackers-plus.json")) problems.push("trackers-plus");
  const manifest = entries.find((entry) => entry.name === "manifest.json");
  if (manifest?.body) {
    const text = manifest.body.toString("utf8");
    if (text.includes("externally_connectable")) problems.push("externally_connectable");
    if (/"scripting"/.test(text)) problems.push("scripting");
  }
  for (const entry of entries) {
    if (!entry.body || !entry.name.endsWith(".js")) continue;
    const text = entry.body.toString("utf8");
    if (text.includes("fundament-cosmetic")) problems.push(`${entry.name}: cosmetic`);
    if (text.includes("fundament-bridge") || text.includes("fundament-content")) problems.push(`${entry.name}: measure-mark`);
  }
  return problems;
}
