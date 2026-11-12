/**
 * One-time: create the Ed25519 key pair that signs the live phishing feed.
 *
 *   node scripts/feed-keygen.mjs
 *
 * - Public key  -> put into .env as VITE_LIVE_FEED_PUBKEY (compiled into the extension)
 * - Private key -> GitHub repository secret FEED_SIGNING_KEY (never commit it).
 *   A local copy is written to .feed-signing-key (gitignored) so you can sign by hand.
 *
 * Losing the private key means no more updates until a release ships a new public key.
 * Leaking it means someone could push a list to all users: rotate immediately.
 */
import { generateKeyPairSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, ".feed-signing-key");
if (existsSync(target) && !process.argv.includes("--force")) {
  process.stderr.write(".feed-signing-key already exists. Pass --force to replace it (old updates stop verifying).\n");
  process.exit(1);
}
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const pub = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const priv = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
writeFileSync(target, `${priv}\n`, { mode: 0o600 });
process.stdout.write(
  [
    "Live feed signing key created.",
    "",
    `VITE_LIVE_FEED_PUBKEY=${pub}`,
    "",
    "1. Add the line above to .env (and to your release build environment).",
    "2. GitHub > Settings > Secrets and variables > Actions > New repository secret:",
    "     Name: FEED_SIGNING_KEY   Value: contents of .feed-signing-key",
    "3. Set VITE_LIVE_FEED_URL to https://<user>.github.io/<repo>/live-feed.json",
    "",
  ].join("\n"),
);
