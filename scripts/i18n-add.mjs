/**
 * Adds or updates message keys in both locales while keeping the one-line style.
 *   node scripts/i18n-add.mjs path/to/additions.json
 * additions.json: { "key": { "en": "...", "de": "..." } }
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const additions = JSON.parse(readFileSync(process.argv[2], "utf8"));

for (const lang of ["en", "de"]) {
  const file = resolve(root, `public/_locales/${lang}/messages.json`);
  const catalog = JSON.parse(readFileSync(file, "utf8"));
  for (const [key, value] of Object.entries(additions)) {
    const message = value[lang];
    if (typeof message !== "string") throw new Error(`${key}: missing ${lang}`);
    catalog[key] = { ...(catalog[key] ?? {}), message };
  }
  const lines = Object.entries(catalog).map(([key, value]) => {
    const extra = Object.entries(value).filter(([k]) => k !== "message");
    if (extra.length > 0) return `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
    return `  ${JSON.stringify(key)}: { "message": ${JSON.stringify(value.message)} }`;
  });
  writeFileSync(file, `{\n${lines.join(",\n")}\n}\n`);
}
process.stdout.write(`updated ${Object.keys(additions).length} keys\n`);
