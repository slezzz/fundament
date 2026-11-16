/**
 * Install docs on user hosting. The 22-page corpus has none of these hosts.
 * A weak command that is already visible on the page is not an unseen lure.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clickFixTier, warnUnseenWeakCommand, weakCommandIsShown } from "@engine/page/clickfix";
import { freeHostingSuffix } from "@engine/url/hosting";

interface Snapshot {
  id: string;
  url: string;
  fetched: string;
  text: string;
  copyButtons: string[];
}

const pages = JSON.parse(
  readFileSync(resolve(__dirname, "../fixtures/page-text/hosted-docs.json"), "utf8"),
) as Snapshot[];

describe("hosted documentation", () => {
  it("does not warn when a hosting-zone doc copies a command the page already shows", () => {
    const hosts = new Set<string>();
    let shown = 0;
    for (const page of pages) {
      expect(page.fetched, page.id).toBe("2026-11-16");
      expect(page.url.startsWith("https://"), page.id).toBe(true);
      const host = new URL(page.url).hostname;
      const userHosted = Boolean(freeHostingSuffix(host));
      if (userHosted) hosts.add(freeHostingSuffix(host) ?? host);
      for (const button of page.copyButtons) {
        const tier = clickFixTier(button);
        expect(tier, `${page.id} must not be a strong lure`).not.toBe("strong");
        if (tier !== "weak") continue;
        const visible = weakCommandIsShown(button, page.text);
        expect(visible, `${page.id} command is not in the excerpt`).toBe(true);
        if (!userHosted) continue;
        shown += 1;
        expect(
          warnUnseenWeakCommand({ popular: false, userHosted: true, commandShown: visible }),
          `${page.id} would warn although the excerpt already shows the command`,
        ).toBe(false);
      }
    }
    expect(pages.length).toBeGreaterThanOrEqual(15);
    expect(shown).toBeGreaterThanOrEqual(15);
    expect(hosts.has("github.io")).toBe(true);
    expect(hosts.has("gitlab.io")).toBe(true);
    expect(hosts.has("netlify.app")).toBe(true);
    expect(hosts.has("vercel.app")).toBe(true);
    expect(hosts.has("pages.dev")).toBe(true);
    expect(hosts.has("gitbook.io")).toBe(true);
    expect(pages.some((page) => page.url.includes(".readthedocs.io/"))).toBe(true);
  });
});
