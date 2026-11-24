import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { storeConnectableMatches } from "./src/billing/connectable";
import { storeManifest } from "./src/billing/storeManifest";

function chromeMv3(): Plugin {
  let outDir = resolve(import.meta.dirname, "dist");
  return {
    name: "fundament-mv3",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, "");
    },
    load(id) {
      const file = id.split("?")[0]?.replace(/\\/g, "/") ?? "";
      if (process.env.VITE_STORE_PACK === "1") {
        if (file.endsWith("/src/billing/checkout.ts")) {
          return "export function checkoutUrl(){return \"\"}\nexport function proPriceLabel(){return \"\"}\nexport function openCheckout(){}\n";
        }
        if (file.endsWith("/src/billing/status.ts")) {
          return "export async function fetchLicenseRevoked(){return false}\n";
        }
        if (file.endsWith("/src/privacy/httpProvider.ts")) {
          return "export class HttpThreatIntelligence { async checkDomain(){return {listed:false,source:\"none\",available:false}} async checkUrl(){return {listed:false,source:\"none\",available:false}} }\n";
        }
      }
      if (!file.endsWith("/src/content/pageChecks.ts") && !file.endsWith("/src/content/walletBridge.ts")) return null;
      let code = readFileSync(file, "utf8");
      if (process.env.VITE_STORE_PACK === "1") {
        code = code.replace(/\/\* store-omit-start \*\/[\s\S]*?\/\* store-omit-end \*\//g, "");
      }
      const allowMarks = process.env.VITE_STORE_PACK !== "1" && process.env.VITE_FUNDAMENT_MARKS === "1";
      if (allowMarks) return code.includes("store-omit-start") ? code : null;
      code = code.replace(/\/\* mark-start \*\/[\s\S]*?\/\* mark-end \*\//g, "");
      return code;
    },
    generateBundle(_options, bundle) {
      const classic = ["content.js", "content-bridge.js", "content-search.js"];
      if (process.env.VITE_STORE_PACK !== "1") classic.push("content-shield.js");
      for (const file of classic) {
        const chunk = bundle[file];
        if (!chunk || chunk.type !== "chunk") {
          throw new Error(`${file} was not emitted`);
        }
        if (chunk.imports.length > 0 || /^\s*import\s/m.test(chunk.code)) {
          throw new Error(
            `${file} cannot use ES imports. Chrome injects it as a classic script.`,
          );
        }
        if (file === "content.js" || file === "content-search.js") {
          chunk.code = `(function(){\n${chunk.code}\n})();\n`;
        }
      }
      const allowMarks = process.env.VITE_STORE_PACK !== "1" && process.env.VITE_FUNDAMENT_MARKS === "1";
      if (!allowMarks) {
        for (const file of ["content.js", "content-bridge.js"]) {
          const chunk = bundle[file];
          if (chunk && chunk.type === "chunk" && /fundament-bridge|fundament-content/.test(chunk.code)) {
            throw new Error(`${file} still names a page-timeline mark. The store build must not tell the page that Fundament is installed.`);
          }
        }
      }
    },
    closeBundle() {
      const dist = outDir;
      mkdirSync(dist, { recursive: true });
      const manifest = JSON.parse(
        readFileSync(resolve(import.meta.dirname, "src/manifest.json"), "utf8"),
      ) as { externally_connectable?: { matches: string[] } };
      const storePack = process.env.VITE_STORE_PACK === "1";
      const written = storePack
        ? storeManifest(manifest)
        : manifest;
      if (!storePack) {
        const pay = process.env.VITE_PAY_ORIGIN?.trim() ?? "";
        const next = storeConnectableMatches(
          manifest.externally_connectable?.matches ?? [],
          pay,
          false,
        );
        if (next === null) delete written.externally_connectable;
        else if (written.externally_connectable) written.externally_connectable.matches = next;
      }
      writeFileSync(resolve(dist, "manifest.json"), JSON.stringify(written, null, 2));
      cpSync(resolve(import.meta.dirname, "public"), dist, { recursive: true });
      if (storePack) {
        rmSync(resolve(dist, "rules/trackers-extended.json"), { force: true });
        rmSync(resolve(dist, "rules/trackers-plus.json"), { force: true });
        rmSync(resolve(dist, "content-shield.js"), { force: true });
      }
    },
  };
}

const storePack = process.env.VITE_STORE_PACK === "1";
/** Page timeline marks exist only in an explicit measurement build. A store pack never gets them. */
const marks = !storePack && process.env.VITE_FUNDAMENT_MARKS === "1";

export default defineConfig({
  base: "./",
  define: {
    __FUNDAMENT_MARKS__: marks ? "true" : "false",
    ...(storePack
      ? {
          "import.meta.env.VITE_STORE_PACK": JSON.stringify("1"),
          "import.meta.env.VITE_REPUTATION_URL": JSON.stringify(""),
          "import.meta.env.VITE_PAY_ORIGIN": JSON.stringify(""),
        }
      : {
          "import.meta.env.VITE_STORE_PACK": JSON.stringify(""),
        }),
  },
  plugins: [react(), chromeMv3()],
  resolve: {
    alias: {
      "@engine": resolve(import.meta.dirname, "src/engine"),
      "@privacy": resolve(import.meta.dirname, "src/privacy"),
      "@shared": resolve(import.meta.dirname, "src/shared"),
      "@storage": resolve(import.meta.dirname, "src/storage"),
      "@network": resolve(import.meta.dirname, "src/network"),
      "@billing": resolve(import.meta.dirname, "src/billing"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, "popup.html"),
        warning: resolve(import.meta.dirname, "warning.html"),
        onboarding: resolve(import.meta.dirname, "onboarding.html"),
        options: resolve(import.meta.dirname, "options.html"),
        background: resolve(import.meta.dirname, "src/background/index.ts"),
        content: resolve(import.meta.dirname, "src/content/pageChecks.ts"),
        contentBridge: resolve(import.meta.dirname, "src/content/walletBridge.ts"),
        contentSearch: resolve(import.meta.dirname, "src/content/searchMarks.ts"),
        ...(storePack
          ? {}
          : { contentShield: resolve(import.meta.dirname, "src/content/fingerprintShield.ts") }),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js";
          if (chunk.name === "content") return "content.js";
          if (chunk.name === "contentBridge") return "content-bridge.js";
          if (chunk.name === "contentSearch") return "content-search.js";
          if (chunk.name === "contentShield") return "content-shield.js";
          return "assets/[name].js";
        },
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
