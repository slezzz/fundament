/**
 * Build and sign the live phishing feed: hosts that are active now but were not in the
 * list shipped with the current release (filters/feeds/phishing-hosts.txt).
 *
 *   FEED_SIGNING_KEY=<pkcs8 base64> node scripts/build-live-feed.mjs [outDir]
 *   node scripts/build-live-feed.mjs live-feed --unsigned
 *
 * The workflow builds with --unsigned in the job that runs npm ci, then signs in a
 * separate job with scripts/sign-live-feed.mjs. A local run without --unsigned still signs.
 * The same safety filter as the shipped list applies (platforms, shorteners, popular
 * domains, official brand hosts are never listed); the extension re-checks on its side.
 */
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectFeedHosts } from "./fetch-threat-feeds.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FORMAT = "fundament-live-v1";
const MAX_HOSTS = 100_000;

export function canonical(version, generated, hosts) {
  return `${FORMAT}\n${version}\n${generated}\n${hosts.join("\n")}`;
}

function versionFromDate(date) {
  const iso = date.toISOString();
  return Number(iso.slice(0, 16).replace(/[-T:]/g, ""));
}

function loadKey() {
  const fromEnv = (process.env.FEED_SIGNING_KEY ?? "").trim();
  const fromFile = existsSync(resolve(root, ".feed-signing-key")) ? readFileSync(resolve(root, ".feed-signing-key"), "utf8").trim() : "";
  const b64 = fromEnv || fromFile;
  if (!b64) throw new Error("FEED_SIGNING_KEY is not set (and no .feed-signing-key). Run node scripts/feed-keygen.mjs first.");
  return createPrivateKey({ key: Buffer.from(b64, "base64"), format: "der", type: "pkcs8" });
}

async function main() {
  const unsigned = process.argv.includes("--unsigned");
  const outArg = process.argv.slice(2).find((arg) => arg !== "--unsigned");
  const outDir = resolve(root, outArg ?? "live-feed");
  const key = unsigned ? null : loadKey();
  const shipped = new Set(
    readFileSync(resolve(root, "filters/feeds/phishing-hosts.txt"), "utf8")
      .split(/\r?\n/)
      .filter(Boolean),
  );
  const { hosts: current } = await collectFeedHosts();
  const fresh = current.filter((h) => !shipped.has(h)).sort();
  if (fresh.length > MAX_HOSTS) {
    throw new Error(`${fresh.length} new hosts since the release: ship a new release instead of a live update.`);
  }
  const now = new Date();
  const version = versionFromDate(now);
  const generated = now.toISOString();
  let sig = "";
  if (key) {
    const payload = Buffer.from(canonical(version, generated, fresh), "utf8");
    sig = sign(null, payload, key).toString("base64");
    if (!verify(null, payload, createPublicKey(key), Buffer.from(sig, "base64"))) throw new Error("self-verification failed");
  }

  mkdirSync(outDir, { recursive: true });
  const body = { format: FORMAT, version, generated, hosts: fresh };
  writeFileSync(resolve(outDir, "live-feed.json"), JSON.stringify(sig ? { ...body, sig } : body));
  writeFileSync(
    resolve(outDir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Fundament live feed</title><p>Signed phishing list update for the Fundament browser extension. Version ${version}, ${fresh.length} hosts, generated ${generated}. Source: Phishing.Database (MIT).</p>\n`,
  );
  process.stdout.write(`live feed v${version}: ${fresh.length} hosts not in the release list\n`);
}

if (process.argv[1]?.endsWith("build-live-feed.mjs")) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
