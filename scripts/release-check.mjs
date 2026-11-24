import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";

/** Must match the key printed in .env.example / src/billing/publicKey.ts until keygen. */
export const DEV_SPKI = "MCowBQYDK2VwAyEAcxixa2A8fwEmYpLqd9V5xr/eepP5wvq7rQDDDowspxw=";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function zipText(bytes) {
  const zip = Buffer.from(bytes);
  const parts = [];
  let offset = 0;
  while (offset + 30 <= zip.length && zip.readUInt32LE(offset) === 0x04034b50) {
    const method = zip.readUInt16LE(offset + 8);
    const compSize = zip.readUInt32LE(offset + 18);
    const nameLen = zip.readUInt16LE(offset + 26);
    const extraLen = zip.readUInt16LE(offset + 28);
    const start = offset + 30 + nameLen + extraLen;
    const data = zip.subarray(start, start + compSize);
    if (method === 0) parts.push(data);
    else if (method === 8) parts.push(inflateRawSync(data));
    offset = start + compSize;
  }
  return Buffer.concat(parts).toString("latin1");
}

/**
 * A free zip must not contain the dev server, and must not contain a page-timeline
 * mark. Those names tell the site that Fundament is installed. The word localhost
 * stays in the DNS-rebind check and in feed hosts such as localhost.run.
 */
export function freeZipProblems(bytes) {
  const text = zipText(bytes);
  const problems = [];
  if (text.includes("127.0.0.1")) problems.push("127.0.0.1");
  if (/https?:\/\/localhost(?::|\/|"|'|$)/.test(text)) problems.push("localhost");
  if (text.includes("fundament-bridge") || text.includes("fundament-content")) problems.push("measure-mark");
  return problems;
}

function paidProblems(source) {
  const problems = [];
  if (source.includes(DEV_SPKI)) {
    problems.push(
      "src/billing/publicKey.ts still has the development license key. Run npm run license:keygen, paste the public key, then rebuild. See GO_LIVE.md.",
    );
  }
  const pay = (process.env.VITE_PAY_ORIGIN ?? "").trim();
  if (!pay) {
    problems.push("VITE_PAY_ORIGIN is empty. Set the HTTPS pay host before a paid store zip.");
  } else {
    try {
      const origin = new URL(pay);
      if (origin.protocol !== "https:") problems.push("VITE_PAY_ORIGIN must be https for a store build.");
    } catch {
      problems.push("VITE_PAY_ORIGIN is not a valid URL.");
    }
  }
  return problems;
}

function freeProblems(source) {
  const problems = [];
  if (!source.includes(DEV_SPKI)) {
    problems.push("free package would activate licenses. The public key is not the development key, and paid checkout is a separate release.");
  }
  if ((process.env.VITE_PAY_ORIGIN ?? "").trim()) problems.push("free package has VITE_PAY_ORIGIN.");
  if ((process.env.VITE_REPUTATION_URL ?? "").trim()) problems.push("free package has a reputation URL.");
  const zipPath = resolve(root, "fundament-store.zip");
  if (!existsSync(zipPath)) {
    problems.push("fundament-store.zip is missing. Run npm run pack first.");
    return problems;
  }
  for (const hit of freeZipProblems(readFileSync(zipPath))) {
    problems.push(`fundament-store.zip contains ${hit}.`);
  }
  return problems;
}

function main() {
  const paid = process.argv.includes("--paid") || process.env.FUNDAMENT_RELEASE === "paid";
  const source = readFileSync(resolve(root, "src/billing/publicKey.ts"), "utf8");
  const problems = paid ? paidProblems(source) : freeProblems(source);
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`release-check: ${problem}\n`);
    process.exit(1);
  }
  process.stdout.write(
    paid
      ? "release-check: paid path. License public key is not the dev example; VITE_PAY_ORIGIN is https.\n"
      : "release-check: free path. No license activation, no pay origin, no reputation URL, no loopback address in the zip.\n",
  );
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) main();
