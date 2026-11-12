import { HttpThreatIntelligence } from "@privacy/httpProvider";
import { ThreatIntelligenceClient } from "@privacy/threatIntelligence";

describe("HTTP threat intelligence", () => {
  it("posts only the origin and parses a trusted-shape response", async () => {
    const bodies: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      bodies.push(String(init?.body));
      return new Response(
        JSON.stringify({ listed: true, available: true, source: "google-safe-browsing" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    const inner = new HttpThreatIntelligence({
      baseUrl: "http://127.0.0.1:8787",
      fetchImpl,
    });
    const client = new ThreatIntelligenceClient(inner);
    const result = await client.checkUrl("https://evil.test/login?token=secret");
    expect(bodies).toEqual([JSON.stringify({ origin: "https://evil.test" })]);
    expect(result).toEqual({
      listed: true,
      available: true,
      source: "google-safe-browsing",
    });
  });

  it("treats hostile JSON as unavailable", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({ listed: true, available: true, source: "<script>alert(1)</script>" }),
        { status: 200 },
      );
    const provider = new HttpThreatIntelligence({
      baseUrl: "http://127.0.0.1:8787",
      fetchImpl,
    });
    await expect(provider.checkDomain("example.com")).resolves.toEqual({
      listed: false,
      source: "fundament-reputation",
      available: false,
    });
  });

  it("times out without throwing", async () => {
    const fetchImpl: typeof fetch = async (_url, init) => {
      const signal = init?.signal;
      return new Promise((_, reject) => {
        const abort = () => reject(new Error("aborted"));
        if (signal?.aborted) {
          abort();
          return;
        }
        signal?.addEventListener("abort", abort);
      });
    };
    const provider = new HttpThreatIntelligence({
      baseUrl: "http://127.0.0.1:8787",
      fetchImpl,
      timeoutMs: 20,
    });
    await expect(provider.checkDomain("example.com")).resolves.toMatchObject({
      available: false,
      listed: false,
    });
  });
});
