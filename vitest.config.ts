import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
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
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/security/**/*.test.ts"],
  },
});
