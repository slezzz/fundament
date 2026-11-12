import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const stage = resolve(root, ".store-pack");
const zip = resolve(root, "fundament-store.zip");

process.env.VITE_STORE_PACK = "1";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const built = spawnSync(npm, ["run", "build"], { cwd: root, stdio: "inherit", env: process.env, shell: true });
if (built.status !== 0) process.exit(built.status ?? 1);

const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.json"), "utf8"));
const matches = manifest.externally_connectable?.matches ?? [];
if (matches.some((m) => /localhost|127\.0\.0\.1/i.test(m))) {
  process.stderr.write("pack-store: store zip still allows localhost connectable. Refusing.\n");
  process.exit(1);
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    if (name.endsWith(".map")) continue;
    const src = join(from, name);
    const dest = join(to, name);
    if (statSync(src).isDirectory()) copyTree(src, dest);
    else cpSync(src, dest);
  }
}

copyTree(dist, stage);
if (existsSync(zip)) rmSync(zip);

const compressed = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-Command", `Compress-Archive -Force -Path '${stage}\\*' -DestinationPath '${zip}'`],
  { stdio: "inherit" },
);
if (compressed.status !== 0) process.exit(compressed.status ?? 1);

process.stdout.write(`pack-store: wrote ${zip}\n`);
