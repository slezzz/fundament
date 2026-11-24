export const DEFAULT_REPUTATION_URL = "http://127.0.0.1:8787";

export function reputationBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_REPUTATION_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, "");
  }
  // A store pack has no dev server. The literal stays in this file for unpacked builds.
  if (import.meta.env.VITE_STORE_PACK === "1") return "";
  return DEFAULT_REPUTATION_URL;
}
