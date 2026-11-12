import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const pub = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const priv = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");

writeFileSync(resolve(root, "server/.license-private"), priv, { mode: 0o600 });
process.stdout.write(`Public key (put in src/billing/publicKey.ts):\n${pub}\n`);
process.stdout.write(`Private key written to server/.license-private (gitignored).\n`);
