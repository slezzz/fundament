/**
 * Defensive detection tests against well-known payload *shapes*.
 * These strings are never executed. The suite only checks that the
 * local heuristics name the gadget.
 */
import { looksDomXssSink, looksObfuscatedJs, looksPrototypePollution } from "@engine/page/heuristics";

describe("classic DOM XSS shapes (not executed)", () => {
  it("flags hash-to-sink gadgets used in OWASP DOM XSS examples", () => {
    expect(
      looksDomXssSink("var payload = location.hash.slice(1); document.write(payload)"),
    ).toBe(true);
    expect(
      looksDomXssSink("el.innerHTML = decodeURIComponent(location.search)"),
    ).toBe(true);
  });

  it("does not flag ordinary templating", () => {
    expect(looksDomXssSink("element.textContent = userName")).toBe(false);
  });
});

describe("obfuscation shapes (not executed)", () => {
  it("flags Function constructor plus fromCharCode packing", () => {
    expect(
      looksObfuscatedJs("Function(String.fromCharCode(101,118,97,108)+atob('YQ=='))()"),
    ).toBe(true);
  });
});

describe("prototype pollution shapes (not executed)", () => {
  it("flags __proto__ merge gadgets", () => {
    expect(looksPrototypePollution('parsed.__proto__ = JSON.parse(input)')).toBe(true);
    expect(looksPrototypePollution('target.constructor.prototype = payload')).toBe(true);
  });
});
