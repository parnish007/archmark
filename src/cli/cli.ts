#!/usr/bin/env node
// archmark CLI v0: init / build / check. Thin orchestration over core.
import {
  existsSync,
  fsyncSync,
  openSync,
  closeSync,
  lstatSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { compileAnimation } from '../animation/ir.js';
import { compile } from '../core/compiler.js';
import type { ArchModel } from '../core/ir.js';
import { ElkLayout, type LayoutEngine, type PlacedGraph, toScene } from '../core/layout.js';
import { planFlow } from '../flow/plan.js';
import { compileTimeline } from '../flow/timeline.js';
import { parse } from '../language/parser.js';
import {
  PatchError,
  extractBlocks,
  patchReadme,
  patchRegion,
  regionIdFor,
  renderTag,
  resolveReadmeInCwd,
  scan,
  validateSvgName,
} from '../markdown/extract.js';
import { SmilRenderer, describeFlowAlt } from '../renderer/smil.js';
import { renderStatic } from '../renderer/svg.js';

export function diagramBase(blockId: string): string {
  return blockId === 'system' ? 'archmark' : `archmark.${blockId}`;
}

export function staticAssets(blockId: string): { light: string; dark: string } {
  const base = diagramBase(blockId);
  return { light: `${base}.light.svg`, dark: `${base}.dark.svg` };
}

export function flowAssets(blockId: string, flowId: string): { light: string; dark: string; region: string } {
  const base = diagramBase(blockId);
  return { light: `${base}.${flowId}.light.svg`, dark: `${base}.${flowId}.dark.svg`, region: `${blockId}.${flowId}` };
}

export function describeArch(model: ArchModel, id: string): string {
  // Concise generated description in topology order (roots first, then dependents),
  // not id-sorted: "id architecture: User → Frontend → API". Deterministic DFS with
  // id-sorted adjacency; unreachable leftovers appended in id order. Truncated safely.
  const labelOf = new Map(model.nodes.map((n) => [n.id, n.label]));
  const short = (s: string) => (s.length > 24 ? `${[...s].slice(0, 23).join('')}…` : s);
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  for (const n of model.nodes) {
    outgoing.set(n.id, []);
    incoming.set(n.id, 0);
  }
  for (const e of [...model.edges].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))) {
    outgoing.get(e.from)?.push(e.to);
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
  }
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(id);
    for (const next of outgoing.get(id) ?? []) visit(next);
  };
  for (const n of [...model.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    if ((incoming.get(n.id) ?? 0) === 0) visit(n.id);
  }
  for (const n of [...model.nodes].sort((a, b) => a.id.localeCompare(b.id))) visit(n.id);
  const names = order.map((id) => short(labelOf.get(id) ?? id));
  const shown = names.slice(0, 6);
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

export interface FileSink {
  writeFileAtomic(path: string, content: string): void;
  readdir(dir: string): string[];
}

export const realFileSink: FileSink = {
  writeFileAtomic(path: string, content: string): void {
    writeFileAtomic(path, content);
  },
  readdir(dir: string): string[] {
    return readdirSync(dir);
  },
};

export interface RunDeps {
  layout?: LayoutEngine;
  fs?: FileSink;
}

import { createRequire } from 'node:module';
import type { Stats } from 'node:fs';

// Symlink guard: path.resolve() traversal checks do not see through symlinks, so a hostile
// repository could otherwise redirect README/output writes outside the project. Fail closed.
// `stat` is injectable for tests (defaults to lstatSync: never follows links).
export function assertNoSymlink(path: string, stat: (p: string) => Stats = lstatSync): void {
  let st: Stats;
  try {
    st = stat(path);
  } catch {
    return; // missing files cannot be hostile links; creation uses O_EXCL tmp + rename
  }
  if (st.isSymbolicLink()) throw new Error(`Refusing to write through symlink: ${path}.`);
}

const VERSION: string = (() => {
  // Single source: package.json version (works in checkout and packed tarball alike).
  // Throws (never a bogus fallback): a version we cannot prove is worse than none.
  const require = createRequire(import.meta.url);
  const pkg = require('../../package.json') as { version?: unknown };
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    throw new Error('archmark: cannot determine version from package.json');
  }
  return pkg.version;
})();

function printHelp(): void {
  console.log(`archmark ${VERSION} — architecture-as-code for GitHub READMEs

Usage:
  archmark [build] [README.md]   render (default command is build)
  archmark init [README.md]      scaffold an ArchMark block (includes a flow example)
  archmark build [README.md]     render diagrams + flows, patch owned regions
  archmark check [README.md]     exit 1 if generated output is stale (CI gate)
  archmark --help                this text
  archmark --version             print version

build writes archmark.<id>.light/dark.svg (+ archmark.<id>.<flow>.* per flow)
next to the README and patches only ArchMark-owned marker regions.
The 'system' id is the default: its files omit '.system' (archmark.light.svg).
Writes are planned fully in memory first; nothing changes unless all diagrams validate.
Exit codes: 0 ok, 1 error or [stale] output, 2 usage error. Errors carry stable
codes (AM1xxx parser, AM11xx/AM12xx model, AM21xx regions, AM31xx/AM32xx flows).`);
}

export async function run(argv: string[], deps: RunDeps = {}): Promise<number> {
  const cmd = argv[0] ?? 'build';
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printHelp();
    return 0;
  }
  if (cmd === '--version' || cmd === '-V' || cmd === 'version') {
    console.log(VERSION);
    return 0;
  }
  // Flags are not positional file arguments: `init --help` must not create a file named --help.
  if (cmd.startsWith('-')) {
    console.error(`archmark: error: unknown flag "${cmd}". Usage: archmark <init|build|check> [README.md]`);
    return 2;
  }
  if (cmd === 'init') {
    const target = argv[1] ?? 'README.md';
    if (target.startsWith('-')) {
      console.error(`archmark: error: unknown flag "${target}". Usage: archmark init [README.md]`);
      return 2;
    }
    const abs = resolveReadmeInCwd(target);
    const sample = `# ArchMark demo

<!-- archmark id=system
actor user "User"
service api "API"
database db "PostgreSQL"

user -> api
api -> db

flow request {
  user -> api
  api -> db { type: write }
}
-->
`;
    if (existsSync(abs)) {
      const md = readFileSync(abs, 'utf8');
      if (md.includes('archmark')) {
        console.log(`archmark: ${target} already contains an archmark block (no-op).`);
        return 0;
      }
      writeFileSync(abs, `${md.trimEnd()}\n\n${sample.split('\n').slice(2).join('\n')}`);
    } else writeFileSync(abs, sample);
    console.log(`archmark: init → ${target} (run: archmark build)`);
    return 0;
  }
  if (cmd === 'build' || cmd === 'check') {
    const target = argv[1] ?? 'README.md';
    if (target.startsWith('-')) {
      console.error(`archmark: error: unknown flag "${target}". Usage: archmark <init|build|check> [README.md]`);
      return 2;
    }
    const dryRun = cmd === 'check';
    return buildOrCheck(target, dryRun, deps);
  }
  console.error('Usage: archmark <init|build|check> [README.md]');
  return 2;
}

async function buildOrCheck(readmePath: string, dryRun: boolean, deps: RunDeps): Promise<number> {
  const sink = deps.fs ?? realFileSink;
  let abs: string;
  try {
    abs = resolveReadmeInCwd(readmePath);
    assertNoSymlink(abs);
  } catch (e) {
    console.error(`archmark: error: ${(e as Error).message}`);
    return 1;
  }
  if (!existsSync(abs)) {
    console.error(`archmark: error: README not found: ${readmePath}`);
    return 1;
  }
  let md: string;
  try {
    md = readFileSync(abs, 'utf8');
  } catch (e) {
    console.error(`archmark: error: cannot read ${readmePath} (${(e as Error).message})`);
    return 1;
  }
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
      const pair = staticAssets(b.id);
      for (const f of [pair.light, pair.dark]) {
        const prev = seen.get(f.toLowerCase());
        if (prev) {
          console.error(`archmark: error: output collision on "${f}" (ids "${prev}" vs "${b.id}").`);
          return 1;
        }
        seen.set(f.toLowerCase(), b.id);
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
  let totalOps = 0;
  const dir = dirname(abs);
  const pendingWrites: { path: string; content: string }[] = [];
  for (const b of blocks) {
    const { ast, diagnostics: pd } = parse(b.source);
    const { model, diagnostics: cd, fatal } = compile(ast);
    const all = [...pd, ...cd];
    // Block-relative parser lines become file-relative; block id is always shown.
    for (const d of all)
      console.error(
        `${readmePath}:${b.contentStartLine + d.line - 1}:${d.col} [${d.severity}] ${d.code} (block "${b.id}"): ${d.message}${d.hint ? `\n  hint: ${d.hint}` : ''}`,
      );
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
    // Render stage guard: toScene/render/plan/timeline/animation throw on corrupt internals.
    // Any throw becomes exit 1 with a message — never an unhandled rejection (exit-code contract).
    // NOTE: this guard is a plain block (not a nested function) so `continue` keeps targeting
    // the per-block loop and definite-assignment narrowing is preserved.
    try {
      const renderPlaced = placed;
      if (!renderPlaced) throw new Error('unreachable: placed checked above');
      const scene = toScene(model, renderPlaced, b.id);
      const light = renderStatic(scene, 'light', { title: `${b.id} architecture` });
      const dark = renderStatic(scene, 'dark', { title: `${b.id} architecture` });
      const pair = staticAssets(b.id);
      let lf: string;
      let df: string;
      try {
        lf = validateSvgName(pair.light);
        df = validateSvgName(pair.dark);
      } catch (e) {
        console.error((e as Error).message);
        failed = true;
        continue;
      }
      if (dryRun) {
        const curL = existsSync(join(dir, lf)) ? readFileSync(join(dir, lf), 'utf8') : null;
        const curD = existsSync(join(dir, df)) ? readFileSync(join(dir, df), 'utf8') : null;
        if (curL !== light || curD !== dark) {
          console.error(`archmark check: [stale] ${b.id} SVG stale. Run archmark build.`);
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
          console.error(`archmark check: [stale] ${b.id} README region stale. Run archmark build.`);
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
          console.error(
            `${readmePath}:${b.contentStartLine + d.line - 1}:${d.col} [${d.severity}] ${d.code} (flow "${flow.id}"): ${d.message}${d.hint ? `\n  hint: ${d.hint}` : ''}`,
          );
        if (fdiags.some((d) => d.severity === 'error') || pfatal || tfatal) {
          failed = true;
          continue;
        }
        const anim = compileAnimation(plan, timeline);
        totalOps += anim.ops.length;
        const aLight = smil.render(scene, anim, 'light', { title: `${b.id} ${flow.id} flow` });
        const aDark = smil.render(scene, anim, 'dark', { title: `${b.id} ${flow.id} flow` });
        const named = flowAssets(b.id, flow.id);
        // Typed region key: Markdown determines owner-anchored placement from the index.
        // CLI describes desired output; it never computes anchor offsets (no glue).
        const regionKey = { diagramId: b.id, kind: 'flow', flowId: flow.id } as const;
        const regionId = regionIdFor(regionKey);
        let alf: string;
        let adf: string;
        try {
          alf = validateSvgName(named.light);
          adf = validateSvgName(named.dark);
        } catch (e) {
          console.error((e as Error).message);
          failed = true;
          continue;
        }
        const labelOf = new Map(model.nodes.map((n) => [n.id, n.label]));
        const lab = (id: string) => {
          const s = labelOf.get(id) ?? id;
          return s.length > 24 ? `${[...s].slice(0, 23).join('')}…` : s;
        };
        const alt = describeFlowAlt(
          b.id,
          flow.id,
          flow.steps.map((s) => ({ from: lab(s.from), to: lab(s.to) })),
        );
        if (dryRun) {
          const curL = existsSync(join(dir, alf)) ? readFileSync(join(dir, alf), 'utf8') : null;
          const curD = existsSync(join(dir, adf)) ? readFileSync(join(dir, adf), 'utf8') : null;
          if (curL !== aLight || curD !== aDark) {
            console.error(`archmark check: [stale] ${regionId} SVG stale. Run archmark build.`);
            failed = true;
          }
          let next: string;
          try {
            next = patchRegion(out, regionKey, renderTag(regionId, `./${alf}`, `./${adf}`, alt));
          } catch (e) {
            console.error((e as Error).message);
            failed = true;
            continue;
          }
          if (next !== out) {
            console.error(`archmark check: [stale] ${regionId} README region stale. Run archmark build.`);
            failed = true;
            out = next;
          }
        } else {
          pendingWrites.push({ path: join(dir, alf), content: aLight }, { path: join(dir, adf), content: aDark });
          try {
            out = patchRegion(out, regionKey, renderTag(regionId, `./${alf}`, `./${adf}`, alt));
          } catch (e) {
            console.error((e as Error).message);
            failed = true;
            continue;
          }
          console.log(`archmark: built ${regionId}: ${anim.ops.length} events, ${anim.totalMs}ms → ${alf}, ${adf}`);
        }
      }
    } catch (e) {
      console.error(`archmark: error: failed to render "${b.id}": ${(e as Error).message}`);
      failed = true;
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
  // Per-document aggregate cap: 50 blocks × 500 events could otherwise explode output.
  // (Per-flow caps already enforced in plan/timeline compilers.)
  const MAX_TOTAL_OPS = 2000;
  if (totalOps > MAX_TOTAL_OPS) {
    console.error(`archmark: error: document compiles to ${totalOps} animation events (> ${MAX_TOTAL_OPS}). Split flows across documents.`);
    return 1;
  }
  if (failed) return 1;
  // Commit phase: symlink-guard every target first (fail before any write), then write all.
  // Honest guarantee: nothing changes unless planning/validation succeeded; a mid-commit
  // failure or crash can leave a mix that rerunning `archmark build` repairs (idempotent).
  // No manifest/journal: the rerun-repairs model is sufficient and simpler (documented).
  try {
    for (const w of pendingWrites) assertNoSymlink(w.path);
    if (out !== md) assertNoSymlink(abs);
  } catch (e) {
    console.error(`archmark: error: ${(e as Error).message}`);
    return 1;
  }
  try {
    for (const w of pendingWrites) sink.writeFileAtomic(w.path, w.content);
    if (out !== md) sink.writeFileAtomic(abs, out);
  } catch (e) {
    console.error(`archmark: error: commit failed (${(e as Error).message}); rerun build to repair.`);
    return 1;
  }
  // Stale-asset notice (warn-only, never auto-delete: ownership of pre-existing files unproven).
  try {
    const planned = new Set(pendingWrites.map((w) => w.path.toLowerCase()));
    for (const f of sink.readdir(dir)) {
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
