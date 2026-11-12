import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { storeConnectableMatches } from "./src/billing/connectable";

function chromeMv3(): Plugin {
  return {
    name: "fundament-mv3",
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, "");
    },
    generateBundle(_options, bundle) {
      for (const file of ["content.js", "content-bridge.js", "content-search.js", "content-shield.js"]) {
        const chunk = bundle[file];
        if (!chunk || chunk.type !== "chunk") {
          throw new Error(`${file} was not emitted`);
        }
        if (chunk.imports.length > 0 || /^\s*import\s/m.test(chunk.code)) {
          throw new Error(
            `${file} cannot use ES imports. Chrome injects it as a classic script.`,
          );
        }
      }
    },
    closeBundle() {
      const dist = resolve(__dirname, "dist");
      mkdirSync(dist, { recursive: true });
      const manifest = JSON.parse(
        readFileSync(resolve(__dirname, "src/manifest.json"), "utf8"),
      ) as { externally_connectable?: { matches: string[] } };
      const storePack = process.env.VITE_STORE_PACK === "1";
      const pay = process.env.VITE_PAY_ORIGIN?.trim() ?? "";
      const next = storeConnectableMatches(
        manifest.externally_connectable?.matches ?? [],
        pay,
        storePack,
      );
      if (next === null) {
        delete manifest.externally_connectable;
      } else if (manifest.externally_connectable) {
        manifest.externally_connectable.matches = next;
      }
      writeFileSync(resolve(dist, "manifest.json"), JSON.stringify(manifest, null, 2));
      cpSync(resolve(__dirname, "public"), dist, { recursive: true });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), chromeMv3()],
  resolve: {
    alias: {
      "@engine": resolve(__dirname, "src/engine"),
      "@privacy": resolve(__dirname, "src/privacy"),
      "@shared": resolve(__dirname, "src/shared"),
      "@storage": resolve(__dirname, "src/storage"),
      "@network": resolve(__dirname, "src/network"),
      "@billing": resolve(__dirname, "src/billing"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        warning: resolve(__dirname, "warning.html"),
        onboarding: resolve(__dirname, "onboarding.html"),
        options: resolve(__dirname, "options.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/pageChecks.ts"),
        contentBridge: resolve(__dirname, "src/content/walletBridge.ts"),
        contentSearch: resolve(__dirname, "src/content/searchMarks.ts"),
        contentShield: resolve(__dirname, "src/content/fingerprintShield.ts"),
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
