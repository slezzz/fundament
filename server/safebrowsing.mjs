const LOOKUP = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
];

/** Google’s public Safe Browsing test hosts — used only when MOCK_SAFE_BROWSING=1. */
const MOCK_LISTED = new Set([
  "testsafebrowsing.appspot.com",
  "malware.testing.google.test",
  "phishing.testing.google.test",
]);

/**
 * @param {string} origin
 * @param {string} hostname
 * @param {{ apiKey: string; mock: boolean; fetchImpl?: typeof fetch }} opts
 */
export async function lookupOrigin(origin, hostname, opts) {
  if (opts.mock && !opts.apiKey) {
    const listed = MOCK_LISTED.has(hostname) || [...MOCK_LISTED].some((h) => hostname.endsWith(`.${h}`));
    return {
      listed,
      source: "google-safe-browsing-mock",
      available: true,
    };
  }

  if (!opts.apiKey) {
    return { listed: false, source: "google-safe-browsing", available: false };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${LOOKUP}?key=${encodeURIComponent(opts.apiKey)}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client: { clientId: "fundament", clientVersion: "0.1.0" },
      threatInfo: {
        threatTypes: THREAT_TYPES,
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url: `${origin}/` }],
      },
    }),
    signal: AbortSignal.timeout(2500),
  });

  if (!response.ok) {
    return { listed: false, source: "google-safe-browsing", available: false };
  }

  const body = await response.json();
  const matches = Array.isArray(body?.matches) ? body.matches : [];
  return {
    listed: matches.length > 0,
    source: "google-safe-browsing",
    available: true,
  };
}
