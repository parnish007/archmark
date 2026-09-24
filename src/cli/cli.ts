#!/usr/bin/env node
// archmark CLI v0: init / build / check. Thin orchestration over core.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parse } from '../language/parser.js';
import { compile } from '../core/compiler.js';
import { ElkLayout, toScene, type LayoutEngine } from '../core/layout.js';
import { renderStatic } from '../renderer/svg.js';
import { extractBlocks, patchReadme, renderTag, validateSvgName, resolveReadmeInCwd } from '../markdown/extract.js';

export async function run(argv: string[], deps: { layout?: LayoutEngine } = {}): Promise<number> {
  const cmd = argv[0] ?? 'build';
  if (cmd === 'init') {
    const target = argv[1] ?? 'README.md';
    const abs = resolveReadmeInCwd(target);
    const sample = `# ArchMark demo\n\n<!-- archmark id=system\nactor user "User"\nservice frontend "Frontend"\nservice api "API"\ndatabase db "PostgreSQL"\n\nuser -> frontend\nfrontend -> api\napi -> db\n-->\n`;
    if (existsSync(abs)) {
      const md = readFileSync(abs, 'utf8');
      if (md.includes('archmark')) { console.log(`archmark: ${target} already contains archmark block.`); return 0; }
      writeFileSync(abs, md.trimEnd() + '\n\n' + sample.split('\n').slice(2).join('\n'));
    } else writeFileSync(abs, sample);
    console.log(`archmark: init → ${target}`);
    return 0;
  }
  if (cmd === 'build' || cmd === 'check') {
    const dryRun = cmd === 'check';
    return buildOrCheck(argv[1] ?? 'README.md', dryRun, deps);
  }
  console.error('Usage: archmark <init|build|check> [README.md]');
  return 2;
}

async function buildOrCheck(readmePath: string, dryRun: boolean, deps: { layout?: LayoutEngine }): Promise<number> {
  let abs: string;
  try { abs = resolveReadmeInCwd(readmePath); }
  catch (e) { console.error(`archmark: error: ${(e as Error).message}`); return 1; }
  if (!existsSync(abs)) { console.error(`archmark: error: README not found: ${readmePath}`); return 1; }
  const md = readFileSync(abs, 'utf8');
  const blocks = extractBlocks(md);
  if (blocks.length === 0) { console.error(`archmark: error: No <!-- archmark --> blocks in ${readmePath}. Run: archmark init`); return 1; }
  const layout = deps.layout ?? new ElkLayout(); // single instance per run (red-team #3)
  let out = md;
  let failed = false;
  const dir = dirname(abs);
  const pendingWrites: { path: string; content: string }[] = [];
  for (const b of blocks) {
    const { ast, diagnostics: pd } = parse(b.source);
    const { model, diagnostics: cd, fatal } = compile(ast);
    const all = [...pd, ...cd];
    for (const d of all) console.error(`${readmePath}:${d.line}:${d.col} [${d.severity}]: ${d.message}${d.hint ? `\n  hint: ${d.hint}` : ''}`);
    const hasError = all.some(d => d.severity === 'error') || fatal;
    if (hasError) { failed = true; continue; }
    let placed;
    try { placed = await layout.layout(model); }
    catch (e) { console.error(`${readmePath}: layout failed for "${b.id}": ${(e as Error).message}`); failed = true; continue; }
    const scene = toScene(model, placed, b.id);
    const light = renderStatic(scene, 'light', { title: `${b.id} architecture` });
    const dark = renderStatic(scene, 'dark', { title: `${b.id} architecture` });
    const base = b.id === 'system' ? 'archmark' : `archmark.${b.id}`;
    let lf: string; let df: string;
    try { lf = validateSvgName(`${base}.light.svg`); df = validateSvgName(`${base}.dark.svg`); }
    catch (e) { console.error((e as Error).message); failed = true; continue; }
    if (dryRun) {
      const curL = existsSync(join(dir, lf)) ? readFileSync(join(dir, lf), 'utf8') : null;
      const curD = existsSync(join(dir, df)) ? readFileSync(join(dir, df), 'utf8') : null;
      if (curL !== light || curD !== dark) { console.error(`archmark check: ${b.id} SVG stale.`); failed = true; }
      const tag = renderTag(b.id, `./${lf}`, `./${df}`, `${b.id} architecture`);
      const next = patchReadme(out, b.id, tag);
      if (next !== out) { console.error(`archmark check: ${b.id} README region stale.`); failed = true; out = next; }
    } else {
      pendingWrites.push({ path: join(dir, lf), content: light }, { path: join(dir, df), content: dark });
      out = patchReadme(out, b.id, renderTag(b.id, `./${lf}`, `./${df}`, `${b.id} architecture`));
      console.log(`archmark: built ${b.id}: ${model.nodes.length} nodes, ${model.edges.length} edges → ${lf}, ${df}`);
    }
  }
  if (dryRun) {
    if (failed) { console.error('archmark check: stale or errors. Run archmark build and commit.'); return 1; }
    console.log('archmark check: fresh.');
    return 0;
  }
  if (failed) return 1;
  for (const w of pendingWrites) writeFileSync(w.path, w.content);
  if (out !== md) writeFileSync(abs, out);
  return 0;
}

const isMain = process.argv[1]?.endsWith('cli.js') ?? false;
if (isMain) {
  run(process.argv.slice(2)).then(code => process.exit(code));
}
