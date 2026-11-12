# Billing

Chrome cannot take card details inside the extension. Checkout happens in a tab; the extension only stores a signed Pro license.

## What customers pay for

Free keeps the security layer: phishing engine, HTTP honesty, downloads, core ads/analytics, GPC, WebRTC, HIBP.

Pro is extra coverage after payment:

- Extended tracker catalog
- Fingerprinting / social / telemetry blocking
- Cosmetic hiding (opt-in)
- Origin-only Safe Browsing look-ups (opt-in)
- Pinned remote filter packs
- Larger allow/block lists, longer history, Relaxed/Strict

Buying Pro turns the extra network lists on immediately if tracker blocking is on. Reputation and cosmetic stay off until the user enables them.

## Stripe (production)

1. Create a Stripe Price (one-time or subscription).
2. In `.env`:

```
STRIPE_SECRET_KEY=sk_live_…
STRIPE_PRICE_ID=price_…
STRIPE_MODE=payment
PUBLIC_BASE_URL=https://your-pay-host
LICENSE_DAYS=365
VITE_PRO_PRICE_LABEL=€4.99 / month
```

3. Run `node --env-file=.env server/index.mjs` on that host (or put `/pay/*` behind your API).
4. Rebuild the extension so `VITE_REPUTATION_URL` / checkout base matches.
5. Add your pay origin: set `VITE_PAY_ORIGIN=https://pay.yourdomain.tld` and rebuild. The build injects it into `externally_connectable` (Chrome needs an exact host). Keep `127.0.0.1` for local success pages.

## Webhooks (required for refunds)

Point Stripe at `POST /pay/webhook` with `STRIPE_WEBHOOK_SECRET`. Events:

- `checkout.session.completed` — remember session / customer / subscription ids
- `customer.subscription.deleted` — revoke Pro
- `charge.refunded` / `charge.dispute.created` — revoke Pro

The extension polls `/v1/license/status` with those ids (not URLs). Network failure does not silently keep a refunded user forever: it fails open for a few hours, then the next successful check drops Pro.

Full runbook: `GO_LIVE.md`. Terms: `TERMS.md`.

Flow: **Get Pro** → `/pay/start?ext=<extensionId>` → Stripe Checkout → `/pay/success` mints a license → **Activate in Fundament** (`chrome.runtime.sendMessage`). Fallback: copy/paste under Upgrade.

## Local test without Stripe

```
ALLOW_DEMO_CHECKOUT=1
```

`/pay/start` then issues a real signed license with no payment. Never enable that in production.

Optional: set `VITE_CHECKOUT_URL` to a Stripe Payment Link if you do not want the server to create sessions. Success-page auto-activate will not run unless that link returns to `/pay/success`.
