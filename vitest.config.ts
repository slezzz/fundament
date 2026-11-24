import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
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
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/security/**/*.test.ts"],
  },
});
