// Animation IR: renderer-independent visual semantic operations + timing.
// Knows: ops, tokens, targets, timing. Knows NOT: SVG/SMIL tags, geometry, theme colors, topology.
import type { FlowPlan, SemanticOp } from '../flow/plan.js';
import type { Timeline } from '../flow/timeline.js';
import { type MotionToken, tokenForOp } from './tokens.js';

export type AnimOpKind = 'traverse' | 'pulse' | 'activate';
export interface AnimOp {
  id: string;
  kind: AnimOpKind;
  target: string; // semantic edge id or node id (SVG namespacing happens in renderers)
  token: MotionToken;
  startMs: number;
  durMs: number;
  style: string;
}
export interface AnimationIR {
  flowId: string;
  archId: string;
  ops: AnimOp[];
  totalMs: number;
}

export function compileAnimation(plan: FlowPlan, timeline: Timeline): AnimationIR {
  // Plan ops and timeline nodes align 1:1 except the trailing settle node, which is
  // TIMING-ONLY metadata (extends totalMs) and produces NO renderer operation. Renderers
  // must never depend on comments: settle disappears before renderer input entirely.
  const flat: SemanticOp[] = plan.steps.flatMap((s) => s.ops);
  const ops: AnimOp[] = [];
  timeline.nodes.forEach((n, i) => {
    if (n.id.endsWith('.settle')) return;
    const pop = flat[i];
    if (!pop) throw new Error(`compileAnimation: plan/timeline skew at node "${n.id}" (AM3207)`);
    const token = tokenForOp(pop);
    const kind: AnimOpKind = pop.op === 'traverse' ? 'traverse' : pop.op === 'pulse' ? 'pulse' : 'activate';
    const target = pop.op === 'traverse' ? pop.edge : pop.op === 'settle' ? '' : pop.node;
    const style = pop.op === 'traverse' || pop.op === 'pulse' ? pop.style : pop.op;
    ops.push({ id: n.id, kind, target, token, startMs: n.startMs, durMs: n.durMs, style });
  });
  return { flowId: plan.flowId, archId: plan.archId, ops, totalMs: timeline.totalMs };
}
