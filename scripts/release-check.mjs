import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Must match the key printed in .env.example / src/billing/publicKey.ts until keygen. */
const DEV_SPKI = "MCowBQYDK2VwAyEAcxixa2A8fwEmYpLqd9V5xr/eepP5wvq7rQDDDowspxw=";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "src/billing/publicKey.ts"), "utf8");

if (source.includes(DEV_SPKI)) {
  process.stderr.write(
    "release-check: src/billing/publicKey.ts still has the development license key.\nRun npm run license:keygen, paste the public key, then rebuild. See GO_LIVE.md.\n",
  );
  process.exit(1);
}

const pay = (process.env.VITE_PAY_ORIGIN ?? "").trim();
if (pay) {
  try {
    const origin = new URL(pay);
    if (origin.protocol !== "https:") {
      process.stderr.write("release-check: VITE_PAY_ORIGIN must be https for a store build.\n");
      process.exit(1);
    }
  } catch {
    process.stderr.write("release-check: VITE_PAY_ORIGIN is not a valid URL.\n");
    process.exit(1);
  }
} else {
  process.stderr.write(
    "release-check: VITE_PAY_ORIGIN is empty. Set the HTTPS pay host before a paid store zip.\n",
  );
  process.exit(1);
}

process.stdout.write("release-check: license public key is not the dev example; VITE_PAY_ORIGIN is https.\n");
