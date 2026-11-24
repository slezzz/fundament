# Billing

Not in the 1.2.0 store package. That package is free and does not show Pro. This file is the later update.

Chrome cannot take card details inside the extension. Checkout happens in a tab; the extension only stores a signed Pro license.

## What customers pay for

Free keeps the security layer: phishing engine, HTTP honesty, downloads, core ads/analytics, GPC, WebRTC, HIBP.

Pro is extra coverage after payment:

- Extended tracker catalog
- Fingerprint-shield noise (opt-in)
- Cosmetic hiding (opt-in)
- Larger allow/block lists, longer history, Relaxed/Strict

Buying Pro turns the extra tracker lists on immediately if tracker blocking is on. Cosmetic hiding and the fingerprint shield stay off until the user enables them. Online reputation and remote filter packs are not part of Pro. Safe Browsing v4 is not called.

## Stripe (production)

1. Create a Stripe Price for a one-time payment. Do not create a subscription.
2. In `.env`:

```
STRIPE_SECRET_KEY=sk_live_…
STRIPE_PRICE_ID=price_…
STRIPE_MODE=payment
PUBLIC_BASE_URL=https://your-pay-host
VITE_PRO_PRICE_LABEL=
```

`VITE_PRO_PRICE_LABEL` is the words you want on the Pro screen. This file does not choose a price. `release:check --paid` fails while it is empty, and it fails unless `STRIPE_MODE` is `payment`.

3. Run `node --env-file=.env server/index.mjs` on that host (or put `/pay/*` behind your API).
4. Rebuild the extension so `VITE_REPUTATION_URL` / checkout base matches.
5. Add your pay origin: set `VITE_PAY_ORIGIN=https://pay.yourdomain.tld` and rebuild. The build injects it into `externally_connectable` (Chrome needs an exact host). Keep `127.0.0.1` for local success pages.

## Webhooks (required for refunds)

Point Stripe at `POST /pay/webhook` with `STRIPE_WEBHOOK_SECRET`. Events:

- `checkout.session.completed` — remember the session id
- `charge.refunded` / `charge.dispute.created` — revoke Pro

`customer.subscription.deleted` is still handled, so an old subscription id can turn Pro off. The store checkout does not create subscriptions. The license ends 365 days after Stripe created the checkout session, not 365 days after the success page is opened. The same address restores that same end date. After that date the session mints nothing.

The extension polls `/v1/license/status` with those ids (not URLs). Network failure does not silently keep a refunded user forever: it fails open for a few hours, then the next successful check drops Pro.

Full runbook: `GO_LIVE.md`. Terms: `TERMS.md`.

Flow: **Get Pro** → `/pay/start?ext=<extensionId>` → Stripe Checkout → `/pay/success` mints a license → **Activate in Fundament** (`chrome.runtime.sendMessage`). Fallback: copy/paste under Upgrade.

## Local test without Stripe

```
ALLOW_DEMO_CHECKOUT=1
```

`/pay/start` then issues a real signed license with no payment. Never enable that in production.

Optional: set `VITE_CHECKOUT_URL` to a Stripe Payment Link if you do not want the server to create sessions. Success-page auto-activate will not run unless that link returns to `/pay/success`.
