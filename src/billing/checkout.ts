import { reputationBaseUrl } from "@privacy/remoteConfig";
import { paidCheckoutLive } from "./launch";

export function checkoutUrl(): string {
  const fromEnv = import.meta.env.VITE_CHECKOUT_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return `${reputationBaseUrl()}/pay/start`;
}

export function proPriceLabel(): string {
  const fromEnv = import.meta.env.VITE_PRO_PRICE_LABEL;
  return typeof fromEnv === "string" ? fromEnv.trim() : "";
}

export function openCheckout(): void {
  if (!paidCheckoutLive()) return;
  const url = new URL(checkoutUrl());
  url.searchParams.set("ext", chrome.runtime.id);
  void chrome.tabs.create({ url: url.toString() });
}
