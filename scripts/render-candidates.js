// Renders all fixtures × V1/V2/V3 × light/dark into examples/visual-candidates/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { parse } from '../dist/language/parser.js';
import { compile } from '../dist/core/compiler.js';
import { ElkLayout, toScene } from '../dist/core/layout.js';
import { renderCandidate } from '../dist/renderer/candidates.js';

const fixtures = readdirSync('fixtures').filter(f => f.endsWith('.archmark'));
mkdirSync('examples/visual-candidates', { recursive: true });
const layout = new ElkLayout();
for (const f of fixtures) {
  const src = readFileSync(`fixtures/${f}`, 'utf8');
  const { ast } = parse(src);
  const { model, fatal } = compile(ast);
  if (fatal) { console.log(`skip ${f} (fatal)`); continue; }
  const placed = await layout.layout(model);
  const scene = toScene(model, placed, f);
  for (const v of ['V1', 'V2', 'V3']) {
    for (const th of ['light', 'dark']) {
      writeFileSync(`examples/visual-candidates/${f.replace('.archmark', '')}.${v.toLowerCase()}.${th}.svg`, renderCandidate(scene, v, th, f));
    }
  }
  console.log(`rendered ${f}`);
}
