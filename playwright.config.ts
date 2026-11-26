import { defineConfig, devices } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "tests/e2e",
  // Page cost has its own one-worker run (`npm run test:perf`). The other files share a machine.
  testIgnore: ["**/page-cost.spec.ts"],
  fullyParallel: false,
  // One retry in CI; a retried pass is still reported as "flaky" in the summary.
  retries: process.env.CI ? 1 : 0,
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
