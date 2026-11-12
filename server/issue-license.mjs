import { mintLicense } from "./license.mjs";

const days = Number.parseInt(process.argv[2] ?? "365", 10);
process.stdout.write(`${mintLicense(days)}\n`);
