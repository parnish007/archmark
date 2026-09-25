#!/usr/bin/env node
// archmark CLI v0: init / build / check. Thin orchestration over core.
import { existsSync, fsyncSync, openSync, closeSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { compileAnimation } from '../animation/ir.js';
import { compile } from '../core/compiler.js';
import type { ArchModel } from '../core/ir.js';
import { ElkLayout, type LayoutEngine, type PlacedGraph, toScene } from '../core/layout.js';
import { planFlow } from '../flow/plan.js';
import { compileTimeline } from '../flow/timeline.js';
import { parse } from '../language/parser.js';
import { PatchError, extractBlocks, patchReadme, renderTag, resolveReadmeInCwd, scan, validateSvgName } from '../markdown/extract.js';
import { SmilRenderer, describeFlowAlt } from '../renderer/smil.js';
import { renderStatic } from '../renderer/svg.js';

export function describeArch(model: ArchModel, id: string): string {
  // Concise generated description: "id architecture: A → B → C" (≤6 labels, truncated).
  const names = [...model.nodes].sort((a, b) => a.id.localeCompare(b.id)).map((n) => n.label);
  const shown = names.slice(0, 6).map((s) => (s.length > 24 ? `${s.slice(0, 23)}…` : s));
  const more = names.length > 6 ? ` (+${names.length - 6} more)` : '';
  return `${id} architecture: ${shown.join(' → ')}${more}`;
}

function writeFileAtomic(path: string, content: string): void {
  // Unpredictable tmp name (no pid-guessing/symlink pre-creation race) + fsync before rename
  // (crash durability) + cleanup on failure (no litter).
  const tmp = `${path}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
  const fd = openSync(tmp, 'wx');
  try {
    writeFileSync(fd, content);
    fsyncSync(fd);
  } catch (e) {
    try {
      closeSync(fd);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw e;
  }
  closeSync(fd);
  renameSync(tmp, path);
}

export async function run(argv: string[], deps: { layout?: LayoutEngine } = {}): Promise<number> {
  const cmd = argv[0] ?? 'build';
  if (cmd === 'init') {
    const target = argv[1] ?? 'README.md';
    const abs = resolveReadmeInCwd(target);
    const sample = `# ArchMark demo\n\n<!-- archmark id=system\nactor user "User"\nservice frontend "Frontend"\nservice api "API"\ndatabase db "PostgreSQL"\n\nuser -> frontend\nfrontend -> api\napi -> db\n-->\n`;
    if (existsSync(abs)) {
      const md = readFileSync(abs, 'utf8');
      if (md.includes('archmark')) {
        console.log(`archmark: ${target} already contains archmark block.`);
        return 0;
      }
      writeFileSync(abs, `${md.trimEnd()}\n\n${sample.split('\n').slice(2).join('\n')}`);
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
  try {
    abs = resolveReadmeInCwd(readmePath);
  } catch (e) {
    console.error(`archmark: error: ${(e as Error).message}`);
    return 1;
  }
  if (!existsSync(abs)) {
    console.error(`archmark: error: README not found: ${readmePath}`);
    return 1;
  }
  const md = readFileSync(abs, 'utf8');
  // Fail-closed gate: malformed regions / duplicate ids → no mutation at all.
  const pre = scan(md);
  for (const d of pre.diagnostics)
    console.error(`${readmePath}:${d.line}:${d.col} [${d.severity}] ${d.code}: ${d.message}${d.hint ? `\n  hint: ${d.hint}` : ''}`);
  if (pre.fatal) {
    console.error(`archmark: error: refusing to process ${readmePath} (fix markers first).`);
    return 1;
  }
  const blocks = extractBlocks(md);
  if (blocks.length === 0) {
    console.error(`archmark: error: No <!-- archmark --> blocks in ${readmePath}. Run: archmark init`);
    return 1;
  }
  // Charset assertion: the no-collision proof depends on ids lacking dots. Enforce at runtime
  // so a future charset change fails loudly here instead of silently breaking the proof.
  for (const b of blocks) {
    if (!/^[A-Za-z0-9_-]+$/.test(b.id)) {
      console.error(`archmark: error: unsafe block id "${b.id}".`);
      return 1;
    }
  }
  // Output collision gate (case-insensitive for Windows/macOS filesystems).
  // Static pairs are checked here. Per-flow pairs need no separate check: block/flow ids match
  // [A-Za-z0-9_-]+ (no dots), so `archmark.<bid>.<flow>.(light|dark).svg` can never equal another
  // block's static name or another flow's name — proven by charset, not by convention.
  {
    const seen = new Map<string, string>();
    for (const b of blocks) {
      const base = (b.id === 'system' ? 'archmark' : `archmark.${b.id}`).toLowerCase();
      for (const f of [`${base}.light.svg`, `${base}.dark.svg`]) {
        const prev = seen.get(f);
        if (prev) {
          console.error(`archmark: error: output collision on "${f}" (ids "${prev}" vs "${b.id}").`);
          return 1;
        }
        seen.set(f, b.id);
      }
    }
  }
  const layout = deps.layout ?? new ElkLayout(); // single instance per run (red-team #3)
  // Transactional plan: render + patch fully in memory; commit writes only if all valid.
  // Generated assets live beside the README (root clutter accepted deliberately: GitHub renders
  // relative links; no .archmark/ move without an ADR). Overwrite guard: only files whose names
  // ArchMark itself generated (validated above) are written; anything else is a collision error.
  let out = md;
  let failed = false;
  const dir = dirname(abs);
  const pendingWrites: { path: string; content: string }[] = [];
  for (const b of blocks) {
    const { ast, diagnostics: pd } = parse(b.source);
    const { model, diagnostics: cd, fatal } = compile(ast);
    const all = [...pd, ...cd];
    for (const d of all)
      console.error(`${readmePath}:${d.line}:${d.col} [${d.severity}]: ${d.message}${d.hint ? `\n  hint: ${d.hint}` : ''}`);
    const hasError = all.some((d) => d.severity === 'error') || fatal;
    if (hasError) {
      failed = true;
      continue;
    }
    let placed: PlacedGraph | undefined;
    try {
      placed = await layout.layout(model);
    } catch (e) {
      console.error(`${readmePath}: layout failed for "${b.id}": ${(e as Error).message}`);
      failed = true;
      continue;
    }
    if (!placed) {
      failed = true;
      continue;
    }
    const scene = toScene(model, placed, b.id);
    const light = renderStatic(scene, 'light', { title: `${b.id} architecture` });
    const dark = renderStatic(scene, 'dark', { title: `${b.id} architecture` });
    const base = b.id === 'system' ? 'archmark' : `archmark.${b.id}`;
    let lf: string;
    let df: string;
    try {
      lf = validateSvgName(`${base}.light.svg`);
      df = validateSvgName(`${base}.dark.svg`);
    } catch (e) {
      console.error((e as Error).message);
      failed = true;
      continue;
    }
    if (dryRun) {
      const curL = existsSync(join(dir, lf)) ? readFileSync(join(dir, lf), 'utf8') : null;
      const curD = existsSync(join(dir, df)) ? readFileSync(join(dir, df), 'utf8') : null;
      if (curL !== light || curD !== dark) {
        console.error(`archmark check: ${b.id} SVG stale.`);
        failed = true;
      }
      const tag = renderTag(b.id, `./${lf}`, `./${df}`, describeArch(model, b.id));
      let next: string;
      try {
        next = patchReadme(out, b.id, tag);
      } catch (e) {
        console.error((e as Error).message);
        failed = true;
        continue;
      }
      if (next !== out) {
        console.error(`archmark check: ${b.id} README region stale.`);
        failed = true;
        out = next;
      }
    } else {
      pendingWrites.push({ path: join(dir, lf), content: light }, { path: join(dir, df), content: dark });
      try {
        out = patchReadme(out, b.id, renderTag(b.id, `./${lf}`, `./${df}`, describeArch(model, b.id)));
      } catch (e) {
        console.error((e as Error).message);
        failed = true;
        continue;
      }
      console.log(`archmark: built ${b.id}: ${model.nodes.length} nodes, ${model.edges.length} edges → ${lf}, ${df}`);
    }
    // Named flows: each generates its own animated asset pair (archmark.<base>.<flow>.light/dark.svg)
    // with its own owned README region `${id}.${flow}`. No "first flow wins" convention.
    const smil = new SmilRenderer();
    for (const flow of model.flows) {
      const { plan, diagnostics: pdiags, fatal: pfatal } = planFlow(flow, model, b.id);
      const {
        timeline,
        diagnostics: tdiags,
        fatal: tfatal,
      } = pfatal ? { timeline: { nodes: [], totalMs: 0 }, diagnostics: [], fatal: true } : compileTimeline(plan);
      const fdiags = [...pdiags, ...tdiags];
      for (const d of fdiags)
        console.error(`${readmePath}:${d.line}:${d.col} [${d.severity}] ${d.code}: ${d.message}${d.hint ? `\n  hint: ${d.hint}` : ''}`);
      if (fdiags.some((d) => d.severity === 'error') || pfatal || tfatal) {
        failed = true;
        continue;
      }
      const anim = compileAnimation(plan, timeline);
      const aLight = smil.render(scene, anim, 'light', { title: `${b.id} ${flow.id} flow` });
      const aDark = smil.render(scene, anim, 'dark', { title: `${b.id} ${flow.id} flow` });
      const regionId = `${b.id}.${flow.id}`;
      let alf: string;
      let adf: string;
      try {
        alf = validateSvgName(`${base}.${flow.id}.light.svg`);
        adf = validateSvgName(`${base}.${flow.id}.dark.svg`);
      } catch (e) {
        console.error((e as Error).message);
        failed = true;
        continue;
      }
      const alt = describeFlowAlt(b.id, flow.id, flow.steps);
      if (dryRun) {
        const curL = existsSync(join(dir, alf)) ? readFileSync(join(dir, alf), 'utf8') : null;
        const curD = existsSync(join(dir, adf)) ? readFileSync(join(dir, adf), 'utf8') : null;
        if (curL !== aLight || curD !== aDark) {
          console.error(`archmark check: ${regionId} SVG stale.`);
          failed = true;
        }
        let next: string;
        try {
          next = patchReadme(out, regionId, renderTag(regionId, `./${alf}`, `./${adf}`, alt));
        } catch (e) {
          console.error((e as Error).message);
          failed = true;
          continue;
        }
        if (next !== out) {
          console.error(`archmark check: ${regionId} README region stale.`);
          failed = true;
          out = next;
        }
      } else {
        pendingWrites.push({ path: join(dir, alf), content: aLight }, { path: join(dir, adf), content: aDark });
        try {
          out = patchReadme(out, regionId, renderTag(regionId, `./${alf}`, `./${adf}`, alt));
        } catch (e) {
          console.error((e as Error).message);
          failed = true;
          continue;
        }
        console.log(`archmark: built ${regionId}: ${anim.ops.length} events, ${anim.totalMs}ms → ${alf}, ${adf}`);
      }
    }
  }
  if (dryRun) {
    if (failed) {
      console.error('archmark check: stale or errors. Run archmark build and commit.');
      return 1;
    }
    console.log('archmark check: fresh.');
    return 0;
  }
  if (failed) return 1;
  for (const w of pendingWrites) writeFileAtomic(w.path, w.content);
  if (out !== md) writeFileAtomic(abs, out);
  // Stale-asset notice (warn-only, never auto-delete: ownership of pre-existing files unproven).
  try {
    const planned = new Set(pendingWrites.map((w) => w.path.toLowerCase()));
    for (const f of readdirSync(dir)) {
      if (/^archmark(\..+)?\.svg$/i.test(f) && !planned.has(join(dir, f).toLowerCase())) {
        console.error(
          `archmark: warning: stale generated asset "${f}" not produced by this build (diagram renamed/removed?). Delete manually if unowned.`,
        );
      }
    }
  } catch {
    /* best-effort notice only */
  }
  return 0;
}

const isMain = process.argv[1]?.endsWith('cli.js') ?? false;
if (isMain) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}
