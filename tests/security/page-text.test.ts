/**
 * Legitimate page text. The URL corpus does not see this.
 * A copy button is blocked only the way the bridge blocks it: strong always,
 * weak only when the page text is a paste lure. Prompt injection warns only
 * when the text is hidden; these snapshots are visible. A tech-support warning
 * also needs fullscreen, which none of these pages are.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clickFixTier, looksLikeClickFixCommand, pasteLureContext } from "@engine/page/clickfix";
import { looksLikePromptInjection } from "@engine/page/heuristics";

interface Snapshot {
  id: string;
  url: string;
  fetched: string;
  text: string;
  copyButtons: string[];
  note?: string;
}

const SCAM_TEXT_RE =
  /(virus|trojan|malware|spyware|infected|infiziert|hacked|gehackt|security alert|sicherheitswarnung|windows defender|microsoft (?:support|security)|apple (?:support|security)|your (?:computer|pc|device|mac) (?:is|has been) (?:blocked|locked|infected)|ihr (?:computer|pc|gerät) (?:ist|wurde) (?:gesperrt|blockiert|infiziert)|do not (?:restart|shut down|close)|nicht neu starten)/i;
const SCAM_CALL_RE = /(call|ruf(?:en sie)?|toll[- ]free|helpline|support (?:number|line)|hotline|kostenlos anrufen)/i;
const PHONE_RE = /\+?\d[\d\s().-]{8,16}\d/;

const snapshots = JSON.parse(
  readFileSync(resolve(__dirname, "../fixtures/page-text/snapshots.json"), "utf8"),
) as Snapshot[];

describe("page-text corpus", () => {
  it("does not warn on real install, captcha, update, and support pages", () => {
    const blocked: string[] = [];
    const injection: string[] = [];
    const scamText: string[] = [];
    let buttons = 0;
    for (const page of snapshots) {
      expect(page.url.startsWith("https://"), page.id).toBe(true);
      expect(page.fetched, page.id).toBe("2026-11-16");
      const context = pasteLureContext(page.text);
      for (const button of page.copyButtons) {
        buttons += 1;
        if (looksLikeClickFixCommand(button, context)) {
          blocked.push(`${page.id}: ${clickFixTier(button)} context=${context} ${button.slice(0, 80)}`);
        }
      }
      if (looksLikePromptInjection(page.text)) injection.push(page.id);
      if (SCAM_TEXT_RE.test(page.text) && SCAM_CALL_RE.test(page.text) && PHONE_RE.test(page.text)) {
        scamText.push(page.id);
      }
    }
    expect(snapshots.length).toBeGreaterThanOrEqual(22);
    expect(buttons).toBeGreaterThanOrEqual(20);
    expect(blocked, blocked.join("\n")).toEqual([]);
    expect(injection, injection.join("\n")).toEqual([]);
    expect(scamText, scamText.join("\n")).toEqual([]);
  });

  it("still treats a .lnk mention in the shell-link excerpt as a strong clipboard string", () => {
    const page = snapshots.find((item) => item.id === "win32-shell-links");
    expect(page).toBeTruthy();
    expect(clickFixTier(page!.text)).toBe("strong");
    expect(page!.copyButtons.every((button) => clickFixTier(button) === null)).toBe(true);
  });
});
