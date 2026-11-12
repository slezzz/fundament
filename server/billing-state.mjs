import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyStripeEvent, emptyBillingState, licenseIsRevoked } from "./stripe.mjs";

const file = resolve(dirname(fileURLToPath(import.meta.url)), ".billing-state.json");

function load() {
  if (!existsSync(file)) return emptyBillingState();
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    return {
      orders: Array.isArray(raw.orders) ? raw.orders : [],
      revokedSid: Array.isArray(raw.revokedSid) ? raw.revokedSid : [],
      revokedSub: Array.isArray(raw.revokedSub) ? raw.revokedSub : [],
      revokedCustomer: Array.isArray(raw.revokedCustomer) ? raw.revokedCustomer : [],
    };
  } catch {
    return emptyBillingState();
  }
}

function save(state) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state)}\n`, { mode: 0o600 });
}

export function recordStripeEvent(event) {
  const next = applyStripeEvent(load(), event);
  save(next);
  return next;
}

export function checkLicenseRevoked(sid, sub) {
  return licenseIsRevoked(load(), { sid, sub });
}
