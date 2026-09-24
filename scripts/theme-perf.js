// Theme + perf harness (local + GitHub where applicable).
// Theme: THEME.md preview under light/dark colorScheme — record selected asset + screenshots.
// Perf: rAF frame-delta distributions on local animation files (honest wall-clock sampling).
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const THEME_URL = 'https://github.com/parnish007/archmark/blob/probe/github-rendering/probes/github/THEME.md';
const theme = { date: new Date().toISOString(), schemes: {} };
for (const scheme of ['light', 'dark']) {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
  await page.goto(THEME_URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const pic = page.locator('picture').first();
  const info = await pic.evaluate((el) => {
    const img = el.querySelector('img');
    const src = el.querySelector('source');
    return { imgSrc: img?.currentSrc ?? img?.src ?? null, sourceMedia: src?.media ?? null, sourceSrcset: src?.srcset ?? null };
  }).catch((e) => ({ error: String(e).slice(0, 120) }));
  mkdirSync('benchmarks/results', { recursive: true });
  await page.screenshot({ path: `benchmarks/results/theme-${scheme}.png` });
  theme.schemes[scheme] = info;
  await b.close();
}
console.log(JSON.stringify(theme, null, 1));
writeFileSync('benchmarks/results/theme.json', JSON.stringify(theme, null, 1));

// Perf: local files, rAF deltas 6s each.
const perf = {};
{
  const b = await chromium.launch();
  const page = await b.newPage();
  for (const f of ['probes/github/canonical-request.svg', 'probes/github/q-stagger-parallel.svg', 'probes/github/q-failure-recovery.svg']) {
    await page.goto('file:///D:/projects/archmark/' + f, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(500);
    const deltas = await page.evaluate(() => new Promise((res) => {
      const ds = []; let last = performance.now(); let n = 0;
      const tick = (t) => { ds.push(t - last); last = t; if (++n < 360) requestAnimationFrame(tick); else res(ds); };
      requestAnimationFrame(tick);
    }));
    deltas.sort((a, b2) => a - b2);
    const q = (x) => deltas[Math.min(deltas.length - 1, Math.floor(x * deltas.length))];
    const els = await page.evaluate(() => document.querySelectorAll('*').length);
    perf[f] = { n: deltas.length, p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +deltas[deltas.length - 1].toFixed(2), longFrames_gt50ms: deltas.filter((d) => d > 50).length, svgElements: els };
    console.log(f, JSON.stringify(perf[f]));
  }
  await b.close();
}
writeFileSync('benchmarks/results/motion-perf.json', JSON.stringify(perf, null, 1));
