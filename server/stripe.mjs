import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe-compatible webhook signature check (no SDK).
 * https://docs.stripe.com/webhooks/signatures
 */
export function parseStripeSignatureHeader(header) {
  if (typeof header !== "string" || header.length > 2000) return null;
  let timestamp = "";
  const v1 = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t" && v) timestamp = v;
    if (k === "v1" && v) v1.push(v);
  }
  if (!/^[0-9]{10,12}$/.test(timestamp) || v1.length === 0) return null;
  return { timestamp, v1 };
}

export function verifyStripeSignature(rawBody, header, secret, nowMs = Date.now()) {
  if (!secret || typeof rawBody !== "string") return false;
  const parsed = parseStripeSignatureHeader(header);
  if (!parsed) return false;
  const ts = Number.parseInt(parsed.timestamp, 10) * 1000;
  if (!Number.isFinite(ts) || Math.abs(nowMs - ts) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret).update(`${parsed.timestamp}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  return parsed.v1.some((sig) => {
    const got = Buffer.from(sig, "utf8");
    return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf);
  });
}

export function emptyBillingState() {
  return { orders: [], revokedSid: [], revokedSub: [], revokedCustomer: [] };
}

function pushUnique(list, value, cap = 8000) {
  if (!value || typeof value !== "string" || value.length > 256) return;
  if (!list.includes(value)) list.push(value);
  if (list.length > cap) list.splice(0, list.length - cap);
}

export function rememberOrder(state, order) {
  const sid = typeof order.sid === "string" ? order.sid : "";
  if (!sid) return state;
  const next = {
    orders: state.orders.filter((o) => o.sid !== sid),
    revokedSid: [...state.revokedSid],
    revokedSub: [...state.revokedSub],
    revokedCustomer: [...state.revokedCustomer],
  };
  next.orders.push({
    sid,
    customer: typeof order.customer === "string" ? order.customer : "",
    sub: typeof order.sub === "string" ? order.sub : "",
    pi: typeof order.pi === "string" ? order.pi : "",
  });
  if (next.orders.length > 8000) next.orders.splice(0, next.orders.length - 8000);
  return next;
}

export function revokeIds(state, { sid, sub, customer }) {
  const next = {
    orders: state.orders,
    revokedSid: [...state.revokedSid],
    revokedSub: [...state.revokedSub],
    revokedCustomer: [...state.revokedCustomer],
  };
  pushUnique(next.revokedSid, sid);
  pushUnique(next.revokedSub, sub);
  pushUnique(next.revokedCustomer, customer);
  return next;
}

export function applyStripeEvent(state, event) {
  const type = event?.type;
  const obj = event?.data?.object ?? {};
  if (type === "checkout.session.completed") {
    return rememberOrder(state, {
      sid: obj.id,
      customer: obj.customer,
      sub: obj.subscription,
      pi: obj.payment_intent,
    });
  }
  if (type === "customer.subscription.deleted") {
    return revokeIds(state, { sub: obj.id, customer: obj.customer });
  }
  if (type === "charge.refunded" || type === "charge.dispute.created") {
    const customer = obj.customer;
    const pi = obj.payment_intent;
    const match = state.orders.find((o) => (pi && o.pi === pi) || (customer && o.customer === customer));
    return revokeIds(state, {
      sid: match?.sid,
      sub: match?.sub,
      customer,
    });
  }
  return state;
}

export function licenseIsRevoked(state, { sid, sub }) {
  if (sid && state.revokedSid.includes(sid)) return true;
  if (sub && state.revokedSub.includes(sub)) return true;
  if (sid) {
    const order = state.orders.find((o) => o.sid === sid);
    if (order?.customer && state.revokedCustomer.includes(order.customer)) return true;
    if (order?.sub && state.revokedSub.includes(order.sub)) return true;
  }
  return false;
}
