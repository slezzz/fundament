/** One payment covers this many seconds. The clock starts at Stripe session.created. */
export const LICENSE_TERM_SECONDS = 365 * 24 * 60 * 60;

/**
 * Expiry is session.created + 365 days. Asking again later does not move it.
 * Once `nowSec` has reached that instant, this session mints nothing.
 */
export function licenseExpFromSession(session, nowSec) {
  const created = session?.created;
  if (typeof created !== "number" || !Number.isInteger(created) || created <= 0) return null;
  if (typeof nowSec !== "number" || !Number.isFinite(nowSec)) return null;
  const exp = created + LICENSE_TERM_SECONDS;
  if (nowSec >= exp) return null;
  return exp;
}

/** Stripe Checkout Session ids only. Anything else is not a restore handle. */
export function isCheckoutSessionId(value) {
  return typeof value === "string" && /^cs_(?:live|test)_[A-Za-z0-9]{24,80}$/.test(value);
}
