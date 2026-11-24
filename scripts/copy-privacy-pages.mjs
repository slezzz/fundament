/** Puts the static privacy pages next to the signed feed. Does not touch live-feed.json. */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = resolve(root, "live-feed", "privacy");
mkdirSync(dest, { recursive: true });
copyFileSync(resolve(root, "pages/privacy/en.html"), resolve(dest, "en.html"));
copyFileSync(resolve(root, "pages/privacy/de.html"), resolve(dest, "de.html"));
