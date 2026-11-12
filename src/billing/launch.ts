/** Published example key from .env.example. Must not accept licenses signed with it in a store zip. */
export const DEV_LICENSE_SPKI_B64 =
  "MCowBQYDK2VwAyEAcxixa2A8fwEmYpLqd9V5xr/eepP5wvq7rQDDDowspxw=";

export function isStorePack(): boolean {
  return import.meta.env.VITE_STORE_PACK === "1";
}

export function paidCheckoutLive(): boolean {
  const pay = (import.meta.env.VITE_PAY_ORIGIN ?? "").trim();
  if (!pay) return false;
  try {
    const origin = new URL(pay);
    return origin.protocol === "https:" && !origin.username && !origin.password;
  } catch {
    return false;
  }
}

export function licenseActivationAllowed(
  publicKeySpki: string,
  storePack = isStorePack(),
): boolean {
  if (publicKeySpki !== DEV_LICENSE_SPKI_B64) return true;
  return !storePack;
}
