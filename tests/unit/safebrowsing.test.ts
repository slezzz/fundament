import { lookupOrigin } from "../../server/safebrowsing.mjs";

describe("Safe Browsing adapter", () => {
  it("returns unavailable when no key and mock is off", async () => {
    const result = await lookupOrigin("https://example.com", "example.com", {
      apiKey: "",
      mock: false,
    });
    expect(result).toEqual({
      listed: false,
      source: "google-safe-browsing",
      available: false,
    });
  });

  it("in mock mode only lists Google’s documented test hosts", async () => {
    const bad = await lookupOrigin(
      "https://testsafebrowsing.appspot.com",
      "testsafebrowsing.appspot.com",
      { apiKey: "", mock: true },
    );
    const ok = await lookupOrigin("https://example.com", "example.com", {
      apiKey: "",
      mock: true,
    });
    expect(bad.available).toBe(true);
    expect(bad.listed).toBe(true);
    expect(ok.listed).toBe(false);
    expect(ok.available).toBe(true);
  });

  it("treats a Google listed match as listed", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ matches: [{ threatType: "MALWARE" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const result = await lookupOrigin("https://evil.test", "evil.test", {
      apiKey: "not-a-real-key",
      mock: false,
      fetchImpl,
    });
    expect(result.listed).toBe(true);
    expect(result.available).toBe(true);
    expect(result.source).toBe("google-safe-browsing");
  });

  it("does not claim a verdict on HTTP errors", async () => {
    const fetchImpl: typeof fetch = async () => new Response("nope", { status: 403 });
    const result = await lookupOrigin("https://example.com", "example.com", {
      apiKey: "not-a-real-key",
      mock: false,
      fetchImpl,
    });
    expect(result.available).toBe(false);
    expect(result.listed).toBe(false);
  });
});
