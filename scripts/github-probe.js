// GitHub motion detection v3: per-probe FRESH page loads in two contexts:
//  (A) direct raw SVG document (browser SMIL baseline — must animate if harness works)
//  (B) blob-page PROBE.md <img> (README-proxy delivery path under test)
// Captures during finite animations (300/1200/2500ms after load), pixelmatch compares.
import { writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.env.ENGINE || 'chromium';
const ETYPES = { chromium, firefox, webkit };
const SHA = '5b6cc30';
const RAW = (p) => `https://raw.githubusercontent.com/parnish007/archmark/probe/github-rendering/probes/github/${p}.svg`;
const PREVIEW = 'https://github.com/parnish007/archmark/blob/probe/github-rendering/probes/github/PROBE.md';
const PROBES = ['q-animate-opacity', 'q-animate-transform', 'q-animate-motion', 'q-mpath', 'q-stagger-parallel', 'q-freeze-loop', 'p-smil-02-pulse-compound', 'canonical-request', 'q-gradient', 'p-gh-01-static'];
const STATIC = new Set(['q-gradient', 'p-gh-01-static']);

function decode(b) { return PNG.sync.read(b); }
function diffPx(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { px: -1, total: a.width * a.height, mismatch: true };
  const out = Buffer.alloc(a.width * a.height * 4);
  const px = pixelmatch(a.data, b.data, out, a.width, a.height, { threshold: 0.1 });
  return { px, total: a.width * a.height, mismatch: false };
}
const frac = (d) => (d.mismatch ? -1 : +(d.px / d.total).toFixed(5));

const etype = ETYPES[ENGINE];
const browser = await etype.launch();
const out = { engine: ENGINE, version: browser.version(), sha: SHA, date: new Date().toISOString(), os: process.platform, probes: {} };

async function measure(page, kind, p) {
  if (kind === 'direct') {
    await page.goto(RAW(p), { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(400);
  } else {
    await page.goto(PREVIEW, { waitUntil: 'networkidle', timeout: 90000 });
    const el = page.locator(`img[src*="${p}.svg"]`).first();
    if (!await el.count()) return { verdict: 'INCONCLUSIVE', reason: 'img absent' };
    await el.scrollIntoViewIfNeeded({ timeout: 15000 });
    await page.waitForFunction((s) => { const i = document.querySelector(s); return i && i.complete && i.naturalWidth > 0; }, `img[src*="${p}.svg"]`, { timeout: 25000 });
    await page.waitForTimeout(400);
  }
  const shot = async () => {
    if (kind === 'direct') return decode(await page.screenshot({ timeout: 15000 }));
    const el = page.locator(`img[src*="${p}.svg"]`).first();
    return decode(await el.screenshot({ timeout: 15000 }));
  };
  const s0 = await shot(); await page.waitForTimeout(500);
  const s1 = await shot(); await page.waitForTimeout(900);
  const s2 = await shot();
  const d01 = diffPx(s0, s1); const d02 = diffPx(s0, s2);
  const f = Math.max(frac(d01), frac(d02));
  const isStatic = STATIC.has(p);
  const verdict = d01.mismatch || d02.mismatch ? 'INCONCLUSIVE' : isStatic ? (f < 0.001 ? 'PASS' : 'FAIL') : f > 0.005 ? 'PASS' : 'FAIL';
  return { verdict, kind, w: s0.width, h: s0.height, frac: f, px01: d01.px, px02: d02.px };
}

for (const p of PROBES) {
  const row = {};
  for (const kind of ['direct', 'preview']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try { row[kind] = await measure(page, kind, p); }
    catch (e) { row[kind] = { verdict: 'INCONCLUSIVE', reason: String(e).slice(0, 160) }; }
    await page.close();
  }
  out.probes[p] = row;
  console.log(`${p}: direct=${row.direct.verdict}(${row.direct.frac}) preview=${row.preview.verdict}(${row.preview.frac})`);
}
await browser.close();
mkdirSync('benchmarks/results', { recursive: true });
writeFileSync(`benchmarks/results/github-motion-${ENGINE}.json`, JSON.stringify(out, null, 1));
console.log('wrote benchmarks/results/github-motion-' + ENGINE + '.json');
