#!/usr/bin/env node
// Generates PWA icon PNGs from the existing SVG app icons.
// Run with: node scripts/generate-pwa-icons.mjs
// Output: public/pwa-192.png, public/pwa-512.png, public/pwa-maskable-512.png,
//         public/apple-touch-icon.png

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "..", "public");

const lightSvg = await readFile(resolve(publicDir, "app-icon-light.svg"));

async function rasterise(size, output, { padding = 0 } = {}) {
  // Render the SVG at the target size. For maskable icons we shrink the
  // artwork into the safe zone (~80% per the spec) so the system mask
  // can't crop our content.
  const inner = Math.round(size * (1 - padding * 2));
  const innerBuf = await sharp(lightSvg, { density: 384 })
    .resize(inner, inner, { fit: "contain" })
    .png()
    .toBuffer();

  const pad = Math.round((size - inner) / 2);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      // Match the SVG background so the icon reads as a solid tile in
      // the launcher. Apple's adaptive-icon masks expect opaque pixels.
      background: { r: 0xfa, g: 0xf8, b: 0xf5, alpha: 1 },
    },
  })
    .composite([{ input: innerBuf, top: pad, left: pad }])
    .png()
    .toFile(resolve(publicDir, output));
  console.log(`wrote public/${output}`);
}

await rasterise(192, "pwa-192.png");
await rasterise(512, "pwa-512.png");
// Maskable icons: 20% padding leaves a generous safe zone.
await rasterise(512, "pwa-maskable-512.png", { padding: 0.1 });
await rasterise(180, "apple-touch-icon.png");
