import { createPrivateKey, sign } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function loadLicensePrivateKey() {
  const fromEnv = process.env.LICENSE_PRIVATE_KEY_PKCS8_B64;
  if (fromEnv) {
    return createPrivateKey({
      key: Buffer.from(fromEnv, "base64"),
      format: "der",
      type: "pkcs8",
    });
  }
  const file = resolve(dirname(fileURLToPath(import.meta.url)), ".license-private");
  if (!existsSync(file)) {
    throw new Error("Set LICENSE_PRIVATE_KEY_PKCS8_B64 or run: node server/generate-license-keys.mjs");
  }
  return createPrivateKey({
    key: Buffer.from(readFileSync(file, "utf8").trim(), "base64"),
    format: "der",
    type: "pkcs8",
  });
}

export function mintLicense(days = 365, extra = {}) {
  const now = typeof extra.now === "number" ? extra.now : Math.floor(Date.now() / 1000);
  if (typeof extra.exp === "number" && now >= extra.exp) return null;
  const exp = typeof extra.exp === "number" ? extra.exp : Number.isFinite(days) && days > 0 ? now + days * 24 * 60 * 60 : null;
  const payload = {
    v: 1,
    plan: "pro",
    iat: now,
    exp,
  };
  if (typeof extra.sid === "string" && extra.sid.length >= 4 && extra.sid.length <= 200) {
    payload.sid = extra.sid;
  }
  if (typeof extra.sub === "string" && extra.sub.length >= 4 && extra.sub.length <= 200) {
    payload.sub = extra.sub;
  }
  if (typeof extra.ext === "string" && /^[a-z]{32}$/.test(extra.ext)) {
    payload.ext = extra.ext;
  }
  const payloadB64 = base64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = sign(null, Buffer.from(payloadB64), loadLicensePrivateKey());
  return `fundament1.${payloadB64}.${base64Url(signature)}`;
}
