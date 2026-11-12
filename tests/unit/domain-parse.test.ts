import { parseHttpUrl } from "@engine/url/parse";
import { parseDomain } from "@engine/domain/parse";
import { registrableDomainOf, splitHostname } from "@engine/domain/psl";

describe("domain parser", () => {
  it("computes eTLD+1 for co.uk", () => {
    expect(registrableDomainOf(splitHostname("login.paypal.co.uk"))).toBe("paypal.co.uk");
  });

  it("treats github.io as a multi-part suffix", () => {
    expect(registrableDomainOf(splitHostname("alice.github.io"))).toBe("alice.github.io");
  });

  it("parses unicode via punycode hostname", () => {
    const parsed = parseHttpUrl("https://xn--pple-43d.com/");
    const domain = parseDomain(parsed);
    expect(domain?.containsPunycode).toBe(true);
    expect(domain?.labels[0]?.startsWith("xn--")).toBe(true);
  });

  it("returns null for IP literals", () => {
    expect(parseDomain(parseHttpUrl("http://10.0.0.1/"))).toBeNull();
  });
});
