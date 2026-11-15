import { describe, expect, it } from "vitest";
import { PAGE_SIGNAL_KINDS } from "@engine/page/kinds";
import { parseClientMessage, parseExternalActivation, senderMaySend, type GateSender } from "@shared/messageGate";
import type { ClientMessage } from "@shared/messages";

const OWN = "a".repeat(32);
const PREFIXES = [`chrome-extension://${OWN}/`];
const TOKEN = "fundament1.eyJ2IjoxfQ.sig";

function webTab(url = "https://evil.example/login?token=secret"): GateSender {
  return { id: OWN, url, hasTab: true };
}

function ownPage(path = "popup.html"): GateSender {
  return { id: OWN, url: `chrome-extension://${OWN}/${path}`, hasTab: path === "warning.html" };
}

describe("message schema", () => {
  const valid: ClientMessage[] = [
    { type: "GET_POPUP_STATE" },
    { type: "GET_POPUP_STATE", tabId: 4 },
    { type: "GET_TAB_ANALYSIS", tabId: 4, blocked: "feed" },
    { type: "UPDATE_SETTINGS", patch: { threatProtection: false } },
    { type: "GET_HISTORY" },
    { type: "CLEAR_HISTORY" },
    { type: "ADD_ALLOWLIST", host: "example.com" },
    { type: "REMOVE_ALLOWLIST", host: "example.com" },
    { type: "ADD_BLOCKLIST", host: "example.com" },
    { type: "REMOVE_BLOCKLIST", host: "example.com" },
    { type: "GO_BACK", tabId: 4 },
    { type: "CONTINUE_TO_SITE", tabId: 4 },
    { type: "ACTIVATE_LICENSE", token: TOKEN },
    { type: "DEACTIVATE_LICENSE" },
    { type: "PAGE_CHECK", kinds: ["login-form"], hints: ["PayPal"] },
    { type: "PAUSE_SITE", host: "example.com", minutes: 15 },
    { type: "RESUME_SITE", host: "example.com" },
    { type: "GET_EXTENSION_AUDIT" },
    { type: "REFRESH_FILTER_PACK" },
    { type: "COMPLETE_ONBOARDING" },
    { type: "ROLLBACK_IOC_FEED" },
    { type: "REFRESH_IOC_FEED" },
    { type: "SEARCH_MARK", hrefs: ["https://example.com/a"] },
    { type: "GET_POSTURE", refresh: true },
    { type: "GET_FEED_STATUS" },
    { type: "REFRESH_LIVE_FEED" },
    { type: "OPEN_SETTINGS_PAGE", url: "chrome://settings/security" },
  ];

  it("accepts every message the extension sends, as a fresh object", () => {
    expect(valid).toHaveLength(27);
    for (const message of valid) {
      expect(parseClientMessage({ ...message, extra: "nope" }), message.type).toEqual(message);
      expect(senderMaySend(message, ownPage(), PREFIXES), message.type).toBe(message.type === "PAGE_CHECK" || message.type === "SEARCH_MARK" ? false : true);
    }
  });

  it("rejects a type inherited from the prototype, arrays, and unknown types", () => {
    expect(parseClientMessage(Object.create({ type: "CLEAR_HISTORY" }))).toBeNull();
    expect(parseClientMessage(["CLEAR_HISTORY"])).toBeNull();
    expect(parseClientMessage(null)).toBeNull();
    expect(parseClientMessage({ type: "DROP_PROTECTION" })).toBeNull();
    expect(parseClientMessage({ type: "GET_HISTORY\u0000" })).toBeNull();
  });

  it("does not copy a license or a prototype payload into a settings patch", () => {
    const patch: Record<string, unknown> = { threatProtection: false, licenseToken: TOKEN, localAnalysis: false };
    Object.defineProperty(patch, "__proto__", { value: { polluted: true }, enumerable: true });
    const parsed = parseClientMessage({ type: "UPDATE_SETTINGS", patch });
    expect(parsed).toEqual({ type: "UPDATE_SETTINGS", patch: { threatProtection: false } });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("caps page-check kinds and drops everything that is not a known kind", () => {
    const parsed = parseClientMessage({
      type: "PAGE_CHECK",
      kinds: ["login-form", "login-form", ...Array.from({ length: 100_000 }, () => "not-a-kind")],
      hints: ["  PayPal  ", "x".repeat(500)],
    });
    expect(parsed).toEqual({ type: "PAGE_CHECK", kinds: ["login-form"], hints: ["PayPal", "x".repeat(160)] });
    expect(PAGE_SIGNAL_KINDS).toContain("login-form");
  });

  it("drops non-http search targets and refuses a settings URL that is not Chrome's", () => {
    expect(parseClientMessage({ type: "SEARCH_MARK", hrefs: ["javascript:alert(1)", "https://example.com/a", "a".repeat(5000)] })).toEqual({
      type: "SEARCH_MARK",
      hrefs: ["https://example.com/a"],
    });
    expect(parseClientMessage({ type: "OPEN_SETTINGS_PAGE", url: "https://evil.example/" })).toBeNull();
    expect(parseClientMessage({ type: "OPEN_SETTINGS_PAGE", url: "chrome://flags" })).toBeNull();
    expect(parseClientMessage({ type: "ADD_ALLOWLIST", host: "https://user:pass@evil.example/path?token=secret" })).toBeNull();
  });

  it("clamps a pause and ignores a blocked-reason that is not one of the four", () => {
    expect(parseClientMessage({ type: "PAUSE_SITE", host: "example.com", minutes: 1e9 })).toEqual({
      type: "PAUSE_SITE",
      host: "example.com",
      minutes: 120,
    });
    expect(parseClientMessage({ type: "GET_TAB_ANALYSIS", tabId: 3, blocked: "javascript:alert(1)" })).toEqual({
      type: "GET_TAB_ANALYSIS",
      tabId: 3,
    });
    expect(parseClientMessage({ type: "GET_TAB_ANALYSIS", tabId: -1 })).toBeNull();
  });
});

describe("message sender", () => {
  const privileged = parseClientMessage({ type: "UPDATE_SETTINGS", patch: { threatProtection: false } });
  const pageCheck = parseClientMessage({ type: "PAGE_CHECK", kinds: ["clickfix-clipboard"] });

  it("refuses privileged messages from a web tab, another extension, or a sender with no page", () => {
    expect(privileged).not.toBeNull();
    expect(senderMaySend(privileged!, webTab(), PREFIXES)).toBe(false);
    expect(senderMaySend(privileged!, { id: "b".repeat(32), url: `chrome-extension://${OWN}/popup.html`, hasTab: false }, PREFIXES)).toBe(false);
    expect(senderMaySend(privileged!, { hasTab: false }, PREFIXES)).toBe(false);
    expect(senderMaySend(privileged!, ownPage("warning.html"), PREFIXES)).toBe(true);
  });

  it("lets a web tab report a page check and nothing else", () => {
    expect(pageCheck).not.toBeNull();
    expect(senderMaySend(pageCheck!, webTab(), PREFIXES)).toBe(true);
    expect(senderMaySend(pageCheck!, ownPage(), PREFIXES)).toBe(false);
    expect(senderMaySend(parseClientMessage({ type: "CLEAR_HISTORY" })!, webTab(), PREFIXES)).toBe(false);
  });
});

describe("external license activation", () => {
  const origins = ["http://127.0.0.1:8787", "https://pay.example"];

  it("accepts only a license token from an allowed checkout origin", () => {
    const message = { type: "ACTIVATE_LICENSE", token: TOKEN, type2: "UPDATE_SETTINGS" };
    expect(parseExternalActivation(message, "http://127.0.0.1:8787/thanks", origins)).toEqual({
      type: "ACTIVATE_LICENSE",
      token: TOKEN,
    });
    expect(parseExternalActivation(message, "https://evil.example/thanks", origins)).toBeNull();
    expect(parseExternalActivation({ type: "UPDATE_SETTINGS", patch: { threatProtection: false } }, "http://127.0.0.1:8787/", origins)).toBeNull();
    expect(parseExternalActivation({ type: "ACTIVATE_LICENSE", token: "not-a-token" }, "http://127.0.0.1:8787/", origins)).toBeNull();
  });
});
