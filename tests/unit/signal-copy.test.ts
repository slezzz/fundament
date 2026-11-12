import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { SIGNAL_COPY, SIGNAL_LANGS, localizeSignal, signalCopy } from "@engine/i18n/signals";
import { analyzeUrl } from "@engine/analyze";
import { PAGE_SIGNAL_KINDS } from "@engine/page/kinds";
import { brandContentSignal, mergeSignals, signalsForPageChecks } from "@engine/page/merge";
import type { RiskSignal } from "@shared/types";

const placeholders = (text: string): string[] => [...new Set(text.match(/\$\d/g) ?? [])].sort();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("signal copy catalog", () => {
  it("has every key in every language with the same placeholders", () => {
    for (const [key, entry] of Object.entries(SIGNAL_COPY)) {
      for (const lang of SIGNAL_LANGS) {
        const copy = entry[lang];
        expect(copy, `${key}/${lang}`).toBeDefined();
        expect(copy[0].trim().length, `${key}/${lang} title`).toBeGreaterThan(1);
        expect(copy[1].trim().length, `${key}/${lang} explanation`).toBeGreaterThan(1);
        expect(placeholders(copy[0]), `${key}/${lang} title placeholders`).toEqual(placeholders(entry.en[0]));
        expect(placeholders(copy[1]), `${key}/${lang} explanation placeholders`).toEqual(placeholders(entry.en[1]));
      }
    }
  });

  it("keeps warning copy short enough to read on a warning screen", () => {
    for (const [key, entry] of Object.entries(SIGNAL_COPY)) {
      for (const lang of SIGNAL_LANGS) {
        expect(entry[lang][0].length, `${key}/${lang} title`).toBeLessThanOrEqual(48);
        expect(entry[lang][1].length, `${key}/${lang} explanation`).toBeLessThanOrEqual(200);
      }
    }
  });

  it("has an entry for every catalog key referenced in the source", () => {
    const root = resolve(__dirname, "../../src");
    const used = new Set<string>();
    for (const file of sourceFiles(root)) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/textSignal\(\s*"[a-z0-9-]+",\s*"([a-z0-9-]+)"/g)) used.add(m[1] ?? "");
    }
    for (const reason of ["feed", "ioc", "threat", "user"]) used.add(`blocked-${reason}`);
    for (const id of ["free-hosting", "cloud-hosting"]) used.add(id);
    for (const key of used) expect(SIGNAL_COPY[key], key).toBeDefined();
  });

  it("covers every signal the engine and page checks can emit", async () => {
    const emitted: RiskSignal[] = [];
    const base = { allowlist: [], blocklist: [], phishingProtection: true, threatProtection: true, securityLevel: "standard" as const };
    const urls = [
      "https://example.com/",
      "http://example.com/login",
      "http://192.168.1.1/",
      "https://8.8.8.8/",
      "https://user:pass@example.com/",
      "https://paypal.com.evil.top/a/b/c/login?redirect=https://x.y",
      "https://paypa1.com/",
      "https://paypal.xyz/",
      "https://paypal-login.example.com/",
      "https://evil-paypal.pages.dev/",
      "https://x.azurewebsites.net/",
      "https://amazom.com/",
      "https://xn--pypal-4ve.com/",
      "https://www.xn--mnchen-3ya.de/",
      "https://bit.ly/x",
      "https://a.b.c.d.example.com/",
      "https://example.com:8081/invoice.pdf.exe",
      "http://example.com/setup.exe",
      "https://example.com/%E2%80%AEfile",
      "https://example.com/?__proto__[x]=1",
      "https://verify-human.xyz/captcha",
      "https://update-chrome.xyz/chrome-update",
      "https://paypal-secure.xyz/passkey",
      "https://wallet-claim.xyz/seed-phrase",
      "https://wallet-claim.xyz/airdrop",
      "https://chatgpt-login.xyz/login",
      "https://example.com/;jsessionid=abc123def456",
      "https://example.com/" + "a".repeat(200),
      "https://example.com/%25252525",
      "https://10.0.0.1.nip.io/",
      "https://testsafebrowsing.appspot.com/",
      "not a url",
    ];
    for (const url of urls) {
      const a = await analyzeUrl({ ...base, url, blocklist: ["blocked.example"] });
      emitted.push(...a.signals);
    }
    emitted.push(...(await analyzeUrl({ ...base, url: "https://blocked.example/", blocklist: ["blocked.example"] })).signals);
    emitted.push(...(await analyzeUrl({ ...base, url: "https://netflix.net/", isPopular: () => true })).signals);
    const page = await analyzeUrl({ ...base, url: "https://evil-paypal.pages.dev/" });
    emitted.push(
      ...mergeSignals(page, [...signalsForPageChecks([...PAGE_SIGNAL_KINDS]), brandContentSignal("PayPal", "evil-paypal.pages.dev")], "standard").signals,
    );
    for (const signal of emitted) {
      const key = signal.key ?? signal.id;
      expect(SIGNAL_COPY[key], `${signal.id} → ${key}`).toBeDefined();
      for (const lang of SIGNAL_LANGS) {
        const copy = localizeSignal(signal, lang);
        expect(copy.title, `${key}/${lang}`).not.toMatch(/\$\d/);
        expect(copy.explanation, `${key}/${lang}`).not.toMatch(/\$\d/);
      }
    }
    const kinds = new Set(emitted.map((s) => s.key ?? s.id));
    expect(kinds.size).toBeGreaterThan(55);
  });

  it("fills placeholders in German", () => {
    expect(signalCopy("brand-content", ["PayPal", "evil.example"], "de").title).toBe("Seite gibt sich als PayPal aus");
  });
});
