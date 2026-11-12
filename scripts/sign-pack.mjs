import { createPrivateKey, createHash, sign } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function parseNetworkHosts(text) {
  const hosts = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const match = /^\|\|([a-z0-9][a-z0-9.-]{0,251})\^/i.exec(line);
    if (match?.[1]) hosts.add(match[1].toLowerCase());
  }
  return [...hosts].sort();
}

function loadPrivateKey() {
  const fromEnv = process.env.LICENSE_PRIVATE_KEY_PKCS8_B64;
  if (fromEnv) {
    return createPrivateKey({ key: Buffer.from(fromEnv, "base64"), format: "der", type: "pkcs8" });
  }
  const file = resolve(dirname(fileURLToPath(import.meta.url)), "../server/.license-private");
  if (!existsSync(file)) {
    throw new Error("Set LICENSE_PRIVATE_KEY_PKCS8_B64 or run: node server/generate-license-keys.mjs");
  }
  return createPrivateKey({ key: Buffer.from(readFileSync(file, "utf8").trim(), "base64"), format: "der", type: "pkcs8" });
}

const input = process.argv[2];
if (!input) {
  process.stderr.write("usage: node scripts/sign-pack.mjs filters/trackers-extended.txt\n");
  process.exit(1);
}

const hosts = parseNetworkHosts(readFileSync(resolve(input), "utf8"));
const sha256 = createHash("sha256").update(hosts.join("\n")).digest("hex");
const key = loadPrivateKey();
const sig = base64Url(sign(null, Buffer.from(sha256, "utf8"), key));
const pack = { v: 1, kind: "dnr-hosts", hosts, sha256, sig };
process.stdout.write(`${JSON.stringify(pack)}\n`);
