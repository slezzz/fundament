/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REPUTATION_URL?: string;
  readonly VITE_CHECKOUT_URL?: string;
  readonly VITE_PRO_PRICE_LABEL?: string;
  /** HTTPS URL of the signed live phishing feed (fundament-live-v1). Empty = off. */
  readonly VITE_LIVE_FEED_URL?: string;
  /** Ed25519 public key (SPKI, base64) that signs the live feed. Empty = off. */
  readonly VITE_LIVE_FEED_PUBKEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
