// Preview-path motion measurement: FRESH page per probe, element screenshots at
// +300/+1100/+2000ms after load; absolute-px thresholds (no viewport dilution).
// PASS animated: max changed px > 120. PASS static: all diffs < 40px.
import { writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.env.ENGINE || 'chromium';
const SHA = process.env.SHA || 'HEAD';
const PREVIEW = 'https://github.com/parnish007/archmark/blob/probe/github-rendering/probes/github/PROBE.md';
const PROBES = ['q-animate-opacity', 'q-animate-transform', 'q-animate-motion', 'q-mpath', 'q-stagger-parallel', 'q-freeze-loop', 'p-smil-02-pulse-compound', 'canonical-request', 'q-failure-recovery', 'q-gradient', 'p-gh-01-static'];
const STATIC = new Set(['q-gradient', 'p-gh-01-static']);
const ETYPES = { chromium, firefox, webkit };

function decode(b) { return PNG.sync.read(b); }
function diffPx(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { px: -1, mismatch: true };
  const out = Buffer.alloc(a.width * a.height * 4);
  return { px: pixelmatch(a.data, b.data, out, a.width, a.height, { threshold: 0.1 }), mismatch: false };
}

const browser = await ETYPES[ENGINE].launch();
const out = { engine: ENGINE, version: browser.version(), sha: SHA, date: new Date().toISOString(), os: process.platform, probes: {} };
for (const p of PROBES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(PREVIEW, { waitUntil: 'networkidle', timeout: 90000 });
    const el = page.locator(`img[src*="${p}.svg"]`).first();
    if (!await el.count()) { out.probes[p] = { verdict: 'INCONCLUSIVE', reason: 'img absent' }; await page.close(); continue; }
    await el.scrollIntoViewIfNeeded({ timeout: 15000 });
    await page.waitForFunction((s) => { const i = document.querySelector(s); return i && i.complete && i.naturalWidth > 0; }, `img[src*="${p}.svg"]`, { timeout: 25000 });
    const shot = async () => decode(await el.screenshot({ timeout: 15000 }));
    const s0 = await shot(); await page.waitForTimeout(300);
    const s1 = await shot(); await page.waitForTimeout(800);
    const s2 = await shot(); await page.waitForTimeout(900);
    const s3 = await shot();
    const ds = [diffPx(s0, s1).px, diffPx(s0, s2).px, diffPx(s0, s3).px, diffPx(s1, s3).px];
    const mx = Math.max(...ds);
    const isStatic = STATIC.has(p);
    const verdict = ds.some((d) => d < 0) ? 'INCONCLUSIVE' : isStatic ? (mx < 40 ? 'PASS' : 'FAIL') : mx > 120 ? 'PASS' : 'FAIL';
    out.probes[p] = { verdict, kind: isStatic ? 'static' : 'animated', w: s0.width, h: s0.height, maxChangedPx: mx, diffs: ds };
  } catch (e) { out.probes[p] = { verdict: 'INCONCLUSIVE', reason: String(e).slice(0, 160) }; }
  await page.close();
  console.log(`${p}: ${out.probes[p].verdict} maxPx=${out.probes[p].maxChangedPx}`);
}
await browser.close();
mkdirSync('benchmarks/results', { recursive: true });
writeFileSync(`benchmarks/results/github-preview-${ENGINE}.json`, JSON.stringify(out, null, 1));
