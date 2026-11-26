import { describe, expect, it } from "vitest";
import { usesRemoteIoc, withoutRemoteIoc } from "../../src/background/feeds";

describe("store IOC list", () => {
  it("keeps a typed IOC address out of the store build and keeps the shipped list", () => {
    expect(usesRemoteIoc(true, "https://feeds.example/ioc.json")).toBe(false);
    expect(usesRemoteIoc(false, "https://feeds.example/ioc.json")).toBe(true);
    expect(usesRemoteIoc(false, "  ")).toBe(false);
    const patch = withoutRemoteIoc(true, {
      iocFeeds: true,
      iocFeedUrl: "https://feeds.example/ioc.json",
      iocFeedSha256: "ab".repeat(32),
    });
    expect(patch.iocFeeds).toBe(true);
    expect(patch.iocFeedUrl).toBeUndefined();
    expect(patch.iocFeedSha256).toBeUndefined();
    expect(withoutRemoteIoc(false, { iocFeedUrl: "https://feeds.example/ioc.json" }).iocFeedUrl).toBe(
      "https://feeds.example/ioc.json",
    );
  });
});