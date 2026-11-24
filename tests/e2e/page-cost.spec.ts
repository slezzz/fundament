/**
 * Service-worker restart and one scan of the bridge and the content script.
 * Runs alone: other Playwright files share the machine and move the clock.
 * The bound is three times a fixed loop on the same clock. Port 5174 must be empty.
 */
import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FRAME_COUNT,
  FRAME_STEPS,
  SW_STEPS,
  brokenByExtension,
  measurePageCost,
  median,
  unexplained,
  withinBudget,
} from "../../scripts/page-cost.mjs";

const reasons = [
  {
    kind: "load",
    text: "The bridge and the content script run in the top frame and in 20 iframes. The gap to a browser without the extension stays inside that work and the clock noise around it.",
  },
  {
    kind: "resource",
    text: "HTTPS upgrade rewrites the HTTP favicon to HTTPS. This server speaks only HTTP, so Chrome reports a closed connection. No page script threw.",
  },
  {
    kind: "sandbox",
    text: "Chrome writes this when a content script is refused by a sandboxed about:blank frame. That frame already disallows scripts. The page did not throw.",
  },
];

function buildMarkedExtension(): string {
  const dist = resolve(process.cwd(), "dist-marks");
  const env = { ...process.env, VITE_FUNDAMENT_MARKS: "1" } as NodeJS.ProcessEnv;
  delete env.VITE_STORE_PACK;
  const built = spawnSync("npx", ["vite", "build", "--outDir", "dist-marks"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    shell: true,
  });
  if (built.status !== 0) {
    throw new Error(built.stderr || built.stdout || "marked build failed");
  }
  const bridge = readFileSync(resolve(dist, "content-bridge.js"), "utf8");
  const content = readFileSync(resolve(dist, "content.js"), "utf8");
  if (!bridge.includes("fundament-bridge") || !content.includes("fundament-content")) {
    throw new Error("the measurement build did not keep its timeline marks");
  }
  return dist;
}

test("a large page stays under three times the calibration", async () => {
  test.setTimeout(180_000);
  const executablePath = process.env.FUNDAMENT_E2E_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  expect(existsSync(executablePath)).toBe(true);
  const result = await measurePageCost({
    executablePath,
    dist: buildMarkedExtension(),
    swSteps: SW_STEPS,
    frameSteps: FRAME_STEPS,
  });
  expect(result.bridgeMs).toHaveLength(FRAME_COUNT + 1);
  expect(result.contentMs).toHaveLength(FRAME_COUNT + 1);
  const swReference = median(result.swCalibration);
  const frameReference = median(result.frameCalibration);
  const sw = median(result.swMs);
  const bridge = Math.max(...result.bridgeMs);
  const content = Math.max(...result.contentMs);
  expect(withinBudget(sw, swReference), `service worker ${sw.toFixed(1)} ms, calibration ${swReference.toFixed(1)} ms`).toBe(true);
  expect(withinBudget(bridge, frameReference), `bridge ${bridge.toFixed(2)} ms, calibration ${frameReference.toFixed(2)} ms`).toBe(true);
  expect(withinBudget(content, frameReference), `content ${content.toFixed(2)} ms, calibration ${frameReference.toFixed(2)} ms`).toBe(true);
  expect(brokenByExtension(result.differences)).toEqual([]);
  expect(unexplained(result.differences, reasons)).toEqual([]);
});
