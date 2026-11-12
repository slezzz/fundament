import { defineConfig, devices } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  use: {
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  metadata: {
    extensionPath: resolve(root, "dist"),
  },
});
