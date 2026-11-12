/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REPUTATION_URL?: string;
  readonly VITE_CHECKOUT_URL?: string;
  readonly VITE_PRO_PRICE_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
