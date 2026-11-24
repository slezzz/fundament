# Go live

## Free store, version 1.2.0

This is the package to upload. It is the free product. Pro is not in it.

```powershell
npm.cmd run pack
```

That writes `fundament-store.zip`. Upload it as a draft. Do not list it. Do not turn on automatic publishing. Install that zip, open the popup, the dashboard, onboarding, and a warning, and confirm the pages. Then publish it yourself.

The dashboard answers are in `STORE_DASHBOARD.md`. The listing text is `STORE_LISTING.md`. The privacy pages are `pages/privacy/en.html` and `pages/privacy/de.html`. The live-feed workflow copies them beside `live-feed.json` and does not move that file. Their addresses are `https://<user>.github.io/<repo>/privacy/en.html` and `.../privacy/de.html`.

`npm run build` is the development build. It may still show Pro. The store zip does not.

## Später: Pro

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

1. Product + one-time Price. Not a subscription.
2. `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_MODE=payment`.
3. Webhook endpoint `https://<pay-host>/pay/webhook` for:
   - `checkout.session.completed`
   - `charge.refunded`
   - `charge.dispute.created`
4. `STRIPE_WEBHOOK_SECRET=whsec_…`
5. Tax: Stripe Tax or your own invoices. Set `VITE_PRO_PRICE_LABEL` to the price you charge. Leave it empty until you decide; the paid check fails while it is empty.

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
