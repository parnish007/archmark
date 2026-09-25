// License inventory: lockfile packages × installed package.json license fields,
// compared against THIRD_PARTY_NOTICES.md declarations. Technical inventory only.
import { readFileSync, existsSync } from 'node:fs';

const lock = readFileSync('pnpm-lock.yaml', 'utf8');
const names = new Set();
for (const m of lock.matchAll(/^\s{2}(@?[^@\s][^:\s]*?)@/gm)) {
  const raw = m[1].replace(/\(.*/, '');
  names.add(raw.split('@')[0]);
}
const rows = [];
for (const name of [...names].sort()) {
  const p = `node_modules/${name}/package.json`;
  if (!existsSync(p)) continue;
  try {
    const pkg = JSON.parse(readFileSync(p, 'utf8'));
    rows.push({ name, license: typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license) });
  } catch {
    rows.push({ name, license: 'UNREADABLE' });
  }
}
const allowed = ['MIT', 'Apache-2.0', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'EPL-2.0', 'CC0-1.0', 'CC-BY-4.0', 'Python-2.0', 'Unlicense'];
// Dual-license elections documented in THIRD_PARTY_NOTICES.md (we consume one prong only).
const elected = { elkjs: 'EPL-2.0' };
let bad = 0;
for (const r of rows) {
  const license = elected[r.name] ?? r.license;
  const parts = license.split(/ OR | AND |, | \(|\)/).filter(Boolean);
  const ok = parts.length > 0 && parts.every((x) => allowed.includes(x.trim()));
  if (!ok) {
    bad++;
    console.log(`FLAG ${r.name}: ${r.license}`);
  }
}
console.log(`checked ${rows.length} direct packages, ${bad} flags`);
const notices = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
for (const dep of ['elkjs', 'vitest', 'typescript', 'playwright', 'biome', 'pngjs', 'pixelmatch']) {
  if (!notices.toLowerCase().includes(dep)) {
    console.log(`MISSING from notices: ${dep}`);
    bad++;
  }
}
if (bad > 0) process.exit(1);
console.log('license inventory clean (technical only — not legal clearance)');
