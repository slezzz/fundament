import { levenshtein, normalizeToken, similarToBrandToken } from "@engine/impersonation/normalize";
import { detectImpersonation } from "@engine/impersonation/detect";
import { parseHttpUrl } from "@engine/url/parse";
import { parseDomain } from "@engine/domain/parse";

function domain(url: string) {
  const parsed = parseHttpUrl(url);
  const d = parseDomain(parsed);
  if (!d) throw new Error("expected domain");
  return d;
}

describe("brand similarity", () => {
  it("normalizes leetspeak", () => {
    expect(normalizeToken("paypa1")).toBe("paypal");
    expect(normalizeToken("micros0ft")).toBe("microsoft");
  });

  it("uses a small levenshtein distance", () => {
    expect(levenshtein("paypal", "paypal")).toBe(0);
    expect(levenshtein("paypal", "paypai")).toBe(1);
  });

  it("matches similar tokens", () => {
    expect(similarToBrandToken("paypa1", "paypal")).toBe(true);
  });

  it("detects paypal lookalike registrable domains", () => {
    const hit = detectImpersonation(domain("https://paypa1.com/login"));
    expect(hit?.brand.id).toBe("paypal");
    expect(hit?.reason).toBe("confusable");
  });

  it("detects brand-in-subdomain on another registrable domain", () => {
    const hit = detectImpersonation(domain("https://paypal-security.example.com/"));
    expect(hit?.brand.id).toBe("paypal");
  });

  it("detects secure-google on a foreign domain", () => {
    const hit = detectImpersonation(domain("https://secure-google.example.com/"));
    expect(hit?.brand.id).toBe("google");
  });

  it("does not flag official paypal.com", () => {
    expect(detectImpersonation(domain("https://www.paypal.com/signin"))).toBeNull();
  });

  it("does not flag official chatgpt.com or claude.ai", () => {
    expect(detectImpersonation(domain("https://chatgpt.com/auth/login"))).toBeNull();
    expect(detectImpersonation(domain("https://claude.ai/login"))).toBeNull();
  });

  it("detects ChatGPT and MetaMask lookalikes", () => {
    expect(detectImpersonation(domain("https://chatgpt-login.xyz/signin"))?.brand.id).toBe("openai");
    expect(detectImpersonation(domain("https://metamask-airdrop.xyz/claim"))?.brand.id).toBe("metamask");
  });
});
