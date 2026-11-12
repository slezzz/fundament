import { PNG } from "pngjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Rasterize the Fundament stamp on a 16-unit integer grid.
 * Flat color, no gradients, no source bitmap.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/icons");
mkdirSync(outDir, { recursive: true });
mkdirSync(resolve(root, "brand"), { recursive: true });

const INK = { r: 28, g: 26, b: 22, a: 255 };
const PAPER = { r: 244, g: 241, b: 234, a: 255 };
const CLAY = { r: 181, g: 82, b: 63, a: 255 };
const CLEAR = { r: 0, g: 0, b: 0, a: 0 };

function mix(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: Math.round(a.a + (b.a - a.a) * t),
  };
}

function put(png, x, y, c) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = c.r;
  png.data[idx + 1] = c.g;
  png.data[idx + 2] = c.b;
  png.data[idx + 3] = c.a;
}

function roundedRectCoverage(px, py, size, r) {
  const x = px + 0.5;
  const y = py + 0.5;
  if (x < 0 || y < 0 || x > size || y > size) return 0;
  if (x >= r && x <= size - r && y >= 0 && y <= size) return 1;
  if (y >= r && y <= size - r && x >= 0 && x <= size) return 1;
  const cx = x < r ? r : size - r;
  const cy = y < r ? r : size - r;
  const dist = Math.hypot(x - cx, y - cy) - r;
  if (dist <= -0.5) return 1;
  if (dist >= 0.5) return 0;
  return 1 - (dist + 0.5);
}

function fillRect(png, x, y, w, h, color) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.ceil(x + w);
  const y1 = Math.ceil(y + h);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const covX = Math.min(px + 1, x + w) - Math.max(px, x);
      const covY = Math.min(py + 1, y + h) - Math.max(py, y);
      const cov = Math.max(0, covX) * Math.max(0, covY);
      if (cov <= 0) continue;
      const idx = (png.width * py + px) << 2;
      const base = {
        r: png.data[idx] ?? 0,
        g: png.data[idx + 1] ?? 0,
        b: png.data[idx + 2] ?? 0,
        a: png.data[idx + 3] ?? 0,
      };
      put(png, px, py, mix(base, color, Math.min(1, cov)));
    }
  }
}

function drawStamp(size) {
  const png = new PNG({ width: size, height: size });
  const cell = size / 16;
  const radius = 2 * cell;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      put(png, x, y, mix(CLEAR, INK, roundedRectCoverage(x, y, size, radius)));
    }
  }
  fillRect(png, 4 * cell, 3 * cell, 8 * cell, 3 * cell, PAPER);
  fillRect(png, 4 * cell, 3 * cell, 3 * cell, 8 * cell, PAPER);
  fillRect(png, 4 * cell, 7 * cell, 5 * cell, 2 * cell, PAPER);
  fillRect(png, 4 * cell, 12 * cell, 8 * cell, 2 * cell, CLAY);
  return png;
}

const master = drawStamp(512);
writeFileSync(resolve(root, "brand/logo.png"), PNG.sync.write(master));
writeFileSync(resolve(outDir, "icon-256.png"), PNG.sync.write(drawStamp(256)));
for (const size of [16, 32, 48, 128]) {
  writeFileSync(resolve(outDir, `icon-${size}.png`), PNG.sync.write(drawStamp(size)));
}

console.log("Wrote Fundament stamp icons (16-unit grid)");
