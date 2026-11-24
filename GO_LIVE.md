# Go live

Two tracks. Today is the **free store zip**. Stripe stays off until you say so.

## Today (free Chrome Web Store)

You can submit **1.0.0** without Pay-Host.

```powershell
npm.cmd run pack
```

Upload **`fundament-store.zip`**. Listing copy: `STORE_LISTING.md`.

Still on you (Google will bounce without this):

- Host **HTTPS** privacy + terms pages (paste `PRIVACY.md` / `TERMS.md`).
- Chrome Web Store account, screenshots (popup Protected, HTTP warn, Inspect, warning page).
- EU trader / Impressum if you sell later; for a free listing you still need a privacy URL.

This zip **does not** expose localhost checkout and **does not** accept the example license key.

After packing, `dist/` is a store build. For local Pro testing run `npm run build` again.

Local unpacked development stays `npm run build` (localhost pay + dev license still work).

## Later (Stripe + Pro)

This is the production paid path. Do not skip key rotation.

## 0. Legal shell

- Company or sole trader that can issue invoices (DE: Impressum, Kleinunternehmer or USt).
- Host **HTTPS** pages: privacy policy (`PRIVACY.md`), terms (`TERMS.md`), support email.
- Chrome Web Store: identity verification + EU trader details if you sell to the EU.

## 1. Keys (once)

```powershell
npm.cmd run license:keygen
```

Paste the printed public key into `src/billing/publicKey.ts`. Keep `server/.license-private` off git. Set `LICENSE_PRIVATE_KEY_PKCS8_B64` on the server from that file.

The key in `.env.example` is **dev only**. A store build signed with it is worthless.

## 2. Stripe

1. Product + Price (one-time or subscription).
2. `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_MODE=payment` or `subscription`.
3. Webhook endpoint `https://<pay-host>/pay/webhook` for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `charge.refunded`
   - `charge.dispute.created`
4. `STRIPE_WEBHOOK_SECRET=whsec_…`
5. Tax: Stripe Tax or your own invoices. `VITE_PRO_PRICE_LABEL` e.g. `€4,99 / Monat`.

`ALLOW_DEMO_CHECKOUT` must stay `0` on this host.

## 3. Pay host

Reverse proxy TLS → `node --env-file=.env server/index.mjs` (`FUNDAMENT_LISTEN=127.0.0.1` behind nginx).

```
PUBLIC_BASE_URL=https://pay.yourdomain.tld
VITE_REPUTATION_URL=https://pay.yourdomain.tld
VITE_PAY_ORIGIN=https://pay.yourdomain.tld
```

Rebuild the extension so checkout URL, reputation, and `externally_connectable` pick up the origin.

Webhook events are stored in `server/.billing-state.json` (revokes). The extension asks `/v1/license/status` with Stripe session/subscription ids only — not browsing URLs.

## 4. Store package

```powershell
npm.cmd run release
```

That fails if `src/billing/publicKey.ts` still has the development key, or if `VITE_PAY_ORIGIN` is not HTTPS. Daily `npm run build` still works with the dev key.

Zip **`dist/`**. Listing copy: `STORE_LISTING.md`. Screenshots: `STORE_CHECKLIST.md`.

Paste privacy / permission justifications from those files. Single purpose: safer browsing.

## 5. After review

- Buy once yourself, click **Activate in Fundament**, confirm Pro lists turn on.
- Refund the test charge; within ~6 hours (or restart Chrome) Pro should drop.
- Ship filter-pack URL + pin only after the JSON is on HTTPS with a known SHA-256.

## Live feed signing key

The private key signs the phishing list that GitHub Pages serves. It must not sit in the job that runs `npm ci`. The workflow reads it from the environment `live-feed-signing`.

1. GitHub → the repository → Settings → Environments → New environment.
2. Name it `live-feed-signing`. The workflow file uses that name.
3. Open the environment → Deployment branches and tags → Selected branches → add `main`. A schedule on any other branch then cannot use the key.
4. Do not add required reviewers. The list is built every 6 hours and nobody is there to click Approve. A reviewer rule would stop the updates.
5. Environment secrets → Add secret. Name: `FEED_SIGNING_KEY`. Value: the one line in `.feed-signing-key` (gitignored; keep an offline backup).
6. If an older repository secret with the same name exists, delete it. A repository secret would still be available to the install job.
7. Settings → Pages → Build and deployment → Source: GitHub Actions. The deploy job uses the separate `github-pages` environment that GitHub creates for Pages. Do not put `FEED_SIGNING_KEY` on that environment.

`node scripts/feed-keygen.mjs` prints the matching public key. That line belongs in `.env` as `VITE_LIVE_FEED_PUBKEY` and in the release build. The private key does not.

## Do not

- Commit `.env`, webhook secrets, or the private license key.
- Claim antivirus, 100% phishing, or live EasyList in the worker.
- Enable demo checkout on the public URL.
