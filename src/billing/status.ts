import { reputationBaseUrl } from "@privacy/remoteConfig";

/** Ask the pay host whether this license was refunded or the subscription ended. Fail open on network errors. */
export async function fetchLicenseRevoked(
  sid: string | undefined,
  sub: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!sid && !sub) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetchImpl(`${reputationBaseUrl()}/v1/license/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sid: sid ?? "", sub: sub ?? "" }),
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { revoked?: unknown };
    return body.revoked === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
