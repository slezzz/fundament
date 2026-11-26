import { defineConfig, devices } from "@playwright/test";

/** Page cost only. One worker, no retry: other tests move the clock. */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/page-cost.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  use: {
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
