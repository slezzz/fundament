export const DEFAULT_REPUTATION_URL = "http://127.0.0.1:8787";

export function reputationBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_REPUTATION_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, "");
  }
  return DEFAULT_REPUTATION_URL;
}
