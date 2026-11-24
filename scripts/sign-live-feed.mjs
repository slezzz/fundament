/**
 * Sign an unsigned live-feed.json. No dependencies beyond Node.
 *
 *   FEED_SIGNING_KEY=<pkcs8 base64> node scripts/sign-live-feed.mjs live-feed/live-feed.json
 *
 * The file must already contain format, version, generated, and hosts.
 * This script adds sig and checks it with the public key derived from the same secret.
 */
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FORMAT = "fundament-live-v1";

export function canonical(version, generated, hosts) {
  return `${FORMAT}\n${version}\n${generated}\n${hosts.join("\n")}`;
}

function loadKey() {
  const b64 = (process.env.FEED_SIGNING_KEY ?? "").trim();
  if (!b64) throw new Error("FEED_SIGNING_KEY is not set.");
  return createPrivateKey({ key: Buffer.from(b64, "base64"), format: "der", type: "pkcs8" });
}

function main() {
  const file = resolve(process.argv[2] ?? "live-feed/live-feed.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  if (raw.format !== FORMAT) throw new Error("unexpected feed format");
  if (typeof raw.version !== "number" || typeof raw.generated !== "string" || !Array.isArray(raw.hosts)) {
    throw new Error("unsigned feed is missing version, generated, or hosts");
  }
  const hosts = raw.hosts.map((host) => String(host));
  const payload = Buffer.from(canonical(raw.version, raw.generated, hosts), "utf8");
  const key = loadKey();
  const sig = sign(null, payload, key).toString("base64");
  if (!verify(null, payload, createPublicKey(key), Buffer.from(sig, "base64"))) throw new Error("self-verification failed");
  writeFileSync(file, JSON.stringify({ format: FORMAT, version: raw.version, generated: raw.generated, hosts, sig }));
  process.stdout.write(`signed live feed v${raw.version}: ${hosts.length} hosts\n`);
}

if (process.argv[1]?.endsWith("sign-live-feed.mjs")) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
