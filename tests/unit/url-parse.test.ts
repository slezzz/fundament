import { parseHttpUrl, UrlParseError, looksDoubleEncoded } from "@engine/url/parse";

const input = (url: string) =>
  parseHttpUrl(url);

describe("URL parser", () => {
  it("parses https hosts", () => {
    const parsed = input("https://Example.COM/path?q=1");
    expect(parsed.hostname).toBe("example.com");
    expect(parsed.protocol).toBe("https:");
  });

  it("rejects malformed URLs", () => {
    expect(() => input("not a url")).toThrow(UrlParseError);
  });

  it("rejects non-http schemes", () => {
    expect(() => input("javascript:alert(1)")).toThrow(/Unsupported/);
    expect(() => input("data:text/html,hi")).toThrow(/Unsupported/);
  });

  it("rejects oversized URLs", () => {
    expect(() => input(`https://example.com/${"a".repeat(5000)}`)).toThrow(/maximum length/);
  });

  it("detects IPv4 literals", () => {
    expect(input("http://192.168.1.1/login").isIpLiteral).toBe(true);
  });

  it("detects userinfo", () => {
    expect(input("https://paypal.com:password@evil.example/").hasUserInfo).toBe(true);
  });

  it("detects nested percent-encoding", () => {
    expect(looksDoubleEncoded("https://example.com/%2561")).toBe(true);
  });
});
