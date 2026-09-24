// GitHub motion detection v2: element screenshots + pixelmatch.
// Control: static gradient probe must be STABLE or methodology is broken.
import { writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium, firefox, webkit } from 'playwright';

const SHA = '3b36c1f';
const URL = 'https://github.com/parnish007/archmark/blob/probe/github-rendering/probes/github/PROBE.md';
const ANIMATED = ['q-animate-opacity', 'q-animate-transform', 'q-animate-motion', 'q-mpath', 'q-stagger-parallel', 'q-freeze-loop', 'canonical-request', 'p-smil-02-pulse-compound'];
const STATIC_CONTROL = ['q-gradient', 'p-gh-01-static'];
const ENGINES = { chromium, firefox, webkit };

function decode(buf) { return PNG.sync.read(buf); }
function diffPx(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { px: -1, total: a.width * a.height, sizeMismatch: true };
  const out = Buffer.alloc(a.width * a.height * 4);
  const px = pixelmatch(a.data, b.data, out, a.width, a.height, { threshold: 0.1 });
  return { px, total: a.width * a.height, sizeMismatch: false };
}

const report = { sha: SHA, url: URL, date: new Date().toISOString(), os: process.platform, engines: {} };

for (const [ename, etype] of Object.entries(ENGINES)) {
  const entry = { version: null, probes: {}, delivery: {}, error: null };
  let browser = null;
  try {
    browser = await etype.launch();
    entry.version = browser.version();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const imgReqs = [];
    page.on('response', (r) => {
      const u = r.url();
      if (/camo|githubusercontent/.test(u) && /\.svg/.test(u)) imgReqs.push({ url: u.slice(0, 130), ct: r.headers()['content-type'] || '', status: r.status() });
    });
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(3000);
    entry.delivery.sampleRequests = imgReqs.slice(0, 14);
    for (const p of [...ANIMATED, ...STATIC_CONTROL]) {
      const el = page.locator(`img[src*="${p}.svg"]`).first();
      if (!await el.count()) { entry.probes[p] = { verdict: 'INCONCLUSIVE', reason: 'img not found' }; continue; }
      try {
        await el.scrollIntoViewIfNeeded({ timeout: 10000 });
        await page.waitForTimeout(600);
        const src = (await el.getAttribute('src')) || '';
        entry.delivery[p] = src.slice(0, 140);
        const s0 = decode(await el.screenshot({ timeout: 15000 }));
        await page.waitForTimeout(800);
        const s1 = decode(await el.screenshot({ timeout: 15000 }));
        await page.waitForTimeout(700);
        const s2 = decode(await el.screenshot({ timeout: 15000 }));
        const d01 = diffPx(s0, s1); const d02 = diffPx(s0, s2);
        const isStatic = STATIC_CONTROL.includes(p);
        const frac = d02.sizeMismatch ? -1 : d02.px / d02.total;
        let verdict;
        if (d02.sizeMismatch) verdict = 'INCONCLUSIVE';
        else if (isStatic) verdict = frac < 0.001 ? 'PASS' : 'FAIL';
        else verdict = frac > 0.005 ? 'PASS' : 'FAIL';
        entry.probes[p] = {
          verdict, kind: isStatic ? 'static-control' : 'animated',
          w: s0.width, h: s0.height,
          changedPx_t800: d01.px, changedPx_t1500: d02.px, frac_t1500: +frac.toFixed(5),
        };
      } catch (e) { entry.probes[p] = { verdict: 'INCONCLUSIVE', reason: String(e).slice(0, 160) }; }
    }
    await browser.close();
  } catch (e) {
    entry.error = String(e).slice(0, 300);
    try { await browser?.close(); } catch {}
  }
  report.engines[ename] = entry;
}

mkdirSync('benchmarks/results', { recursive: true });
mkdirSync('research/tmp', { recursive: true });
writeFileSync('benchmarks/results/github-motion.json', JSON.stringify(report, null, 1));
let out = '# GitHub motion detection v2 (pixelmatch)\n';
for (const [e, r] of Object.entries(report.engines)) {
  out += `\n## ${e} ${r.version ?? ''} ${r.error ? 'ERROR: ' + r.error : ''}\n`;
  for (const [p, v] of Object.entries(r.probes)) out += `- ${p} [${v.kind ?? ''}]: ${v.verdict}${v.frac_t1500 !== undefined ? ` frac=${v.frac_t1500} px=${v.changedPx_t1500}` : ''}${v.reason ? ' ' + v.reason : ''}\n`;
  out += 'delivery:\n';
  for (const [p, u] of Object.entries(r.delivery)) {
    if (p === 'sampleRequests') { for (const s of u) out += `  - [net] ${s.status} ${s.ct} ${s.url}\n`; continue; }
    out += `  - ${p}: ${u}\n`;
  }
}
writeFileSync('research/tmp/github-motion-summary.md', out);
console.log(out);
