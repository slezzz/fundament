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
      const dist = resolve(import.meta.dirname, "dist");
      mkdirSync(dist, { recursive: true });
      const manifest = JSON.parse(
        readFileSync(resolve(import.meta.dirname, "src/manifest.json"), "utf8"),
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
      cpSync(resolve(import.meta.dirname, "public"), dist, { recursive: true });
    },
  };
}

const storePack = process.env.VITE_STORE_PACK === "1";

export default defineConfig({
  base: "./",
  define: storePack
    ? {
        "import.meta.env.VITE_STORE_PACK": JSON.stringify("1"),
        "import.meta.env.VITE_REPUTATION_URL": JSON.stringify(""),
        "import.meta.env.VITE_PAY_ORIGIN": JSON.stringify(""),
      }
    : {
        "import.meta.env.VITE_STORE_PACK": JSON.stringify(""),
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
        contentShield: resolve(import.meta.dirname, "src/content/fingerprintShield.ts"),
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
