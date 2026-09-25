import { MOTION_TOKENS, tokenForOp, echoTailMs } from '../animation/tokens.js';
// Timeline compiler: FlowPlan → ordered timed events with dependencies.
// Knows: sequence/deps/durations. Knows NOT: SVG/SMIL, geometry, theme, renderers.
import type { Diagnostic } from '../core/diagnostics.js';
import type { FlowPlan, SemanticOp } from './plan.js';

export interface TimelineNode {
  id: string;
  startMs: number;
  durMs: number;
  deps: string[];
}
export interface Timeline {
  nodes: TimelineNode[];
  totalMs: number;
}

export const MAX_ANIM_OPS = 500;

export function durationFor(op: SemanticOp): number {
  // Single source of timing truth: motion tokens. Timeline never hardcodes durations.
  return MOTION_TOKENS[tokenForOp(op)].durMs;
}

export function compileTimeline(plan: FlowPlan): { timeline: Timeline; diagnostics: Diagnostic[]; fatal: boolean } {
  const diagnostics: Diagnostic[] = [];
  const nodes: TimelineNode[] = [];
  let t = 0;
  let tailEnd = 0;
  let prev: string | null = null;
  for (const step of plan.steps) {
    for (let k = 0; k < step.ops.length; k++) {
      const op = step.ops[k] as SemanticOp;
      const dur = durationFor(op);
      if (!(dur > 0)) {
        diagnostics.push({ code: 'AM3202', severity: 'error', message: `Non-positive duration for ${op.op}.`, line: 1, col: 1 });
        return { timeline: { nodes: [], totalMs: 0 }, diagnostics, fatal: true };
      }
      const id = `${step.stepId}.o${k}`;
      nodes.push({ id, startMs: t, durMs: dur, deps: prev ? [prev] : [] });
      // Renderer embellishment tails (broadcast echoes, fail second ring) extend past the
      // node end; totalMs covers them so loops/progress never clip the tail.
      if (op.op === 'pulse') tailEnd = Math.max(tailEnd, t + dur + echoTailMs(op.style));
      prev = id;
      t += dur;
    }
  }
  // Settle closes the flow.
  nodes.push({ id: `${plan.flowId}.settle`, startMs: t, durMs: MOTION_TOKENS.settle.durMs, deps: prev ? [prev] : [] });
  t += MOTION_TOKENS.settle.durMs;
  if (nodes.length > MAX_ANIM_OPS) {
    diagnostics.push({
      code: 'AM3203',
      severity: 'error',
      message: `Flow "${plan.flowId}" compiles to ${nodes.length} animation events (> ${MAX_ANIM_OPS}).`,
      line: 1,
      col: 1,
      hint: 'Split the flow; parallel fan-out must be chunked.',
    });
    return { timeline: { nodes: [], totalMs: 0 }, diagnostics, fatal: true };
  }
  // Dependency order check (linear chain by construction; guards future parallel edits).
  const seen = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    for (const d of n.deps) {
      if (!seen.has(d)) {
        diagnostics.push({ code: 'AM3204', severity: 'error', message: `Unresolved timeline dependency "${d}".`, line: 1, col: 1 });
        return { timeline: { nodes: [], totalMs: 0 }, diagnostics, fatal: true };
      }
    }
    if (n.deps.includes(n.id)) {
      diagnostics.push({ code: 'AM3205', severity: 'error', message: `Timeline dependency cycle at "${n.id}".`, line: 1, col: 1 });
      return { timeline: { nodes: [], totalMs: 0 }, diagnostics, fatal: true };
    }
  }
  return { timeline: { nodes, totalMs: Math.max(t, tailEnd) }, diagnostics, fatal: false };
}
