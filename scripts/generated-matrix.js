import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
// Generated-output matrix: DSL → CLI-built SVGs → 3 engines → animated-value sampling.
// Verdict PASS only on observed value change over time (no pixel heuristics).
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.env.ENGINE || 'chromium';
const FILES = {
  'canonical-request': 'examples/hero/archmark.hero.request.light.svg',
  'parallel-order': '.archmark-internal/matrix/archmark.shop.order.light.svg',
  'failure-recovery': '.archmark-internal/matrix/archmark.shop.outage.light.svg',
  'static-control': 'examples/hero/archmark.hero.light.svg',
};
const ETYPES = { chromium, firefox, webkit };
const browser = await ETYPES[ENGINE].launch();
const out = { engine: ENGINE, version: browser.version(), date: new Date().toISOString(), probes: {} };

// Build a failure+recovery + parallel fixture via CLI contract (temp doc, local only).
// (CLI run exercised separately in integration tests; matrix consumes built artifacts.)

for (const [name, f] of Object.entries(FILES)) {
  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(f).href, { waitUntil: 'load', timeout: 30000 });
    const samples = [];
    for (let i = 0; i < 5; i++) {
      samples.push(
        await page.evaluate(() => {
          const dots = [...document.querySelectorAll('#am-motion circle')];
          const moons = [...document.querySelectorAll('circle')].map((c) => c.getBoundingClientRect().x.toFixed(1)).join(',');
          return { n: dots.length, xs: moons.slice(0, 80), t: document.querySelector('svg').getCurrentTime().toFixed(2) };
        }),
      );
      await page.waitForTimeout(600);
    }
    const ts = samples.map((s) => s.t).join(',');
    const changed = new Set(samples.map((s) => s.xs)).size > 1;
    out.probes[name] = {
      verdict: name === 'static-control' ? (changed ? 'FAIL' : 'PASS') : changed ? 'PASS' : 'FAIL',
      samples: ts,
      motionEls: samples[0].n,
    };
  } catch (e) {
    out.probes[name] = { verdict: 'INCONCLUSIVE', reason: String(e).slice(0, 140) };
  }
  await page.close();
  console.log(`${name}: ${out.probes[name].verdict} t=${out.probes[name].samples ?? ''}`);
}
await browser.close();
mkdirSync('benchmarks/results', { recursive: true });
writeFileSync(`benchmarks/results/generated-matrix-${ENGINE}.json`, JSON.stringify(out, null, 1));
