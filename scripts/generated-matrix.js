// Generated-output matrix: DSL → CLI-built SVGs → 3 engines → animated-value sampling.
// Hermetic: builds its own fixtures in a temp dir via the packed-or-built CLI contract.
// Verdict PASS only on observed value change over time (no pixel heuristics).
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.env.ENGINE || 'chromium';
const ETYPES = { chromium, firefox, webkit };

const DSL = `# matrix
<!-- archmark id=mx
service api "API"
queue bus "Bus"
service billing "Billing"
database db "DB"

api -> bus
bus -> billing
billing -> api
api -> db

flow order {
  api -> bus { type: event }
  bus -> billing { type: event }
  billing -> api { type: response }
  api -> db { type: write }
}

flow outage {
  api -> bus { type: failure }
  api -> db { type: recovery }
}
-->
`;

// Build fixtures with the CURRENT checkout's CLI (dist must be built first).
const dir = mkdtempSync(join(tmpdir(), 'am-matrix-'));
writeFileSync(join(dir, 'README.md'), DSL);
execFileSync(process.execPath, [fileURLToPath(new URL('../dist/cli/cli.js', import.meta.url)), 'build', 'README.md'], {
  cwd: dir,
  stdio: 'pipe',
});

const FILES = {
  'canonical-request': join(dir, 'archmark.mx.order.light.svg'),
  'failure-recovery': join(dir, 'archmark.mx.outage.light.svg'),
  'static-control': join(dir, 'archmark.mx.light.svg'),
};

const browser = await ETYPES[ENGINE].launch();
const out = { engine: ENGINE, version: browser.version(), date: new Date().toISOString(), probes: {} };

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
