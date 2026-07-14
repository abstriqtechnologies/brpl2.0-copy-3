// scripts/build-og-image.mjs
//
// Generates the default OpenGraph image as a static PNG so the app
// doesn't need an edge-runtime `opengraph-image.tsx` convention file
// (which Next.js warns about — "Using edge runtime on a page currently
// disables static generation for that page").
//
// Run via: `node scripts/build-og-image.mjs` (called from `prebuild`).
// Idempotent — re-running produces the same bytes.

import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <text x="50%" y="48%"
        font-family="Inter, system-ui, sans-serif"
        font-size="96"
        font-weight="700"
        text-anchor="middle"
        fill="#ffffff"
        letter-spacing="-2">Brpl</text>
  <text x="50%" y="62%"
        font-family="Inter, system-ui, sans-serif"
        font-size="36"
        font-weight="500"
        text-anchor="middle"
        fill="#ffffff"
        opacity="0.85">Business Real Punjab League</text>
</svg>
`.trim();

const OUT = resolve(process.cwd(), "public", "opengraph-image.png");

async function main() {
    mkdirSync(dirname(OUT), { recursive: true });
    const buf = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(OUT, buf);
    const size = statSync(OUT).size;
    console.log(`[og] wrote ${OUT} (${size} bytes)`);
}

main().catch((e) => {
    console.error("[og] failed:", e);
    process.exit(1);
});