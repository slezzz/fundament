import { parseOrigin, domainToHttpsOrigin } from "../../server/validate.mjs";

describe("reputation origin validation", () => {
  it("accepts a clean origin", () => {
    expect(parseOrigin("https://example.com")).toBe("https://example.com");
    expect(parseOrigin("https://example.com/")).toBe("https://example.com");
  });

  it("rejects path, query, userinfo, and non-http", () => {
    expect(parseOrigin("https://example.com/login?token=1")).toBeNull();
    expect(parseOrigin("https://user:pass@example.com")).toBeNull();
    expect(parseOrigin("javascript:alert(1)")).toBeNull();
    expect(parseOrigin("https://example.com/?q=1")).toBeNull();
  });

  it("builds https origin from a domain", () => {
    expect(domainToHttpsOrigin("Example.COM")).toBe("https://example.com");
    expect(domainToHttpsOrigin("example.com/phish")).toBeNull();
  });
});
