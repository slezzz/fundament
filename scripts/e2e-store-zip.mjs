/**
 * Loads the unpacked fundament-store.zip. That file is what would be uploaded.
 * Runs the detection scenarios and the free-page check against it.
 * Page-cost, the dev package shape, and the Pro-only cuts stay off this run
 * (tests/e2e/store-pack-scope.ts).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { storeOmitProblems, undefinedNameProblems, zipEntries } from "./zip-undef.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const packed = spawnSync(npm, ["run", "pack"], { cwd: root, stdio: "inherit", env: process.env, shell: true });
if (packed.status !== 0) process.exit(packed.status ?? 1);

const zipPath = resolve(root, "fundament-store.zip");
const bytes = readFileSync(zipPath);
const names = undefinedNameProblems(bytes);
const cuts = storeOmitProblems(bytes);
if (names.length > 0 || cuts.length > 0) {
  for (const problem of [...names, ...cuts]) process.stderr.write(`e2e-store-zip: ${problem}\n`);
  process.exit(1);
}

const dest = join(tmpdir(), "fundament-store-unpacked");
rmSync(dest, { recursive: true, force: true });
for (const entry of zipEntries(bytes)) {
  if (!entry.body || entry.name.endsWith("/")) continue;
  const path = join(dest, entry.name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, entry.body);
}

const env = { ...process.env, FUNDAMENT_EXTENSION_DIR: dest };
const ran = spawnSync(
  "npx",
  ["playwright", "test", "tests/e2e/live.spec.ts", "tests/e2e/store-free.spec.ts"],
  { cwd: root, stdio: "inherit", env, shell: true },
);
process.exit(ran.status ?? 1);
