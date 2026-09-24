// Lean capture: DOM evaluate (no actionability waits) + full-page screenshot + node-side crop.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const OUT = process.env.OUT || 'benchmarks/results/cache-before.png';
const SEL = 'img[src*="cache-same.svg"]';
const browser = await chromium.launch({ timeout: 30000 });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('https://github.com/parnish007/archmark/blob/probe/github-rendering/probes/github/PROBE.md', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
const box = await page.evaluate((s) => {
  const i = document.querySelector(s);
  if (!i) return null;
  const r = i.getBoundingClientRect();
  i.scrollIntoView({ block: 'center' });
  return { x: r.x, y: r.y, w: r.width, h: r.height, complete: i.complete, nw: i.naturalWidth };
}, SEL);
console.log('box', JSON.stringify(box));
await page.waitForTimeout(2500);
const full = PNG.sync.read(await page.screenshot({ timeout: 30000 }));
const sx = Math.max(0, Math.floor(box.x));
const sy = Math.max(0, Math.floor(box.y + (await page.evaluate(() => 0))));
console.log('full', full.width, full.height, 'scrollY?', await page.evaluate(() => window.scrollY));
// NOTE: full-page screenshot includes area below fold; element y is viewport-relative at capture.
// Re-resolve box right before capture:
const b2 = await page.evaluate((s) => { const i = document.querySelector(s); const r = i.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, SEL);
const crop = new PNG({ width: Math.floor(b2.w), height: Math.floor(b2.h) });
PNG.bitblt(full, crop, Math.floor(b2.x), Math.floor(b2.y) + 0, Math.floor(b2.w), Math.floor(b2.h), 0, 0);
writeFileSync(OUT, PNG.sync.write(crop));
console.log('wrote', OUT);
await browser.close();
