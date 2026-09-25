import type { Diagnostic } from '../core/diagnostics.js';
// FlowPlan: architecture flow semantics expanded into renderer-independent operations.
// Knows: steps, edge identity, pulse styles. Knows NOT: ms timing, easing, SVG/SMIL, theme.
import type { ArchFlow, ArchModel } from '../core/ir.js';

export type TraverseStyle = 'solid' | 'hollow' | 'dashed';
export type PulseStyle = 'receive' | 'store' | 'hollow' | 'broadcast' | 'fail' | 'recover';
export type SemanticOp =
  | { op: 'activate'; node: string }
  | { op: 'traverse'; edge: string; style: TraverseStyle }
  | { op: 'pulse'; node: string; style: PulseStyle }
  | { op: 'settle' };

export interface FlowPlanStep {
  stepId: string;
  ops: SemanticOp[];
}
export interface FlowPlan {
  flowId: string;
  archId: string;
  steps: FlowPlanStep[];
}

export const MAX_FLOW_STEPS = 100;

export function planFlow(flow: ArchFlow, model: ArchModel, archId: string): { plan: FlowPlan; diagnostics: Diagnostic[]; fatal: boolean } {
  const diagnostics: Diagnostic[] = [];
  let fatal = false;
  const edgeByPair = new Map<string, string>();
  for (const e of model.edges) {
    const key = `${e.from}→${e.to}`;
    if (!edgeByPair.has(key)) edgeByPair.set(key, e.id);
  }
  const nodeIds = new Set(model.nodes.map((n) => n.id));
  const steps: FlowPlanStep[] = [];
  if (flow.steps.length > MAX_FLOW_STEPS) {
    diagnostics.push({
      code: 'AM3201',
      severity: 'error',
      message: `Flow "${flow.id}" has ${flow.steps.length} steps (> ${MAX_FLOW_STEPS}).`,
      line: 1,
      col: 1,
      hint: 'Split into multiple flows.',
    });
    return { plan: { flowId: flow.id, archId, steps: [] }, diagnostics, fatal: true };
  }
  flow.steps.forEach((s, i) => {
    const stepId = `${flow.id}.s${i}`;
    if (!nodeIds.has(s.from) || !nodeIds.has(s.to)) {
      diagnostics.push({
        code: 'AM3103',
        severity: 'error',
        message: `Flow "${flow.id}" step references unknown node in ${s.from} -> ${s.to}.`,
        line: 1,
        col: 1,
      });
      fatal = true;
      return;
    }
    const edge = edgeByPair.get(`${s.from}→${s.to}`);
    if (!edge) {
      diagnostics.push({
        code: 'AM3103',
        severity: 'error',
        message: `Flow "${flow.id}" step ${s.from} -> ${s.to} resolves to no architecture edge.`,
        line: 1,
        col: 1,
        hint: 'AM3102 should have caught this; refusing to animate unresolved topology.',
      });
      fatal = true;
      return;
    }
    const kind = s.type ?? 'request';
    const ops: SemanticOp[] = [];
    // error/failure deliberately emit only a fail pulse at the target (no travel): the step
    // names the failure LOCUS (which must still be a declared edge per AM3102), and the lack
    // of traverse encodes "no healthy transfer happened".
    switch (kind) {
      case 'request':
        ops.push({ op: 'activate', node: s.from }, { op: 'traverse', edge, style: 'solid' }, { op: 'pulse', node: s.to, style: 'receive' });
        break;
      case 'response':
        ops.push({ op: 'traverse', edge, style: 'hollow' }, { op: 'pulse', node: s.to, style: 'receive' });
        break;
      case 'write':
        ops.push({ op: 'activate', node: s.from }, { op: 'traverse', edge, style: 'solid' }, { op: 'pulse', node: s.to, style: 'store' });
        break;
      case 'read':
        ops.push({ op: 'traverse', edge, style: 'solid' }, { op: 'pulse', node: s.to, style: 'hollow' });
        break;
      case 'event':
        ops.push({ op: 'traverse', edge, style: 'solid' }, { op: 'pulse', node: s.to, style: 'broadcast' });
        break;
      case 'error':
      case 'failure':
        ops.push({ op: 'pulse', node: s.to, style: 'fail' });
        break;
      case 'recovery':
        ops.push({ op: 'pulse', node: s.to, style: 'recover' });
        break;
      default: {
        // Exhaustive: future FlowStepType values fail compile here (no silent generic traverse).
        const _exhaustive: never = kind;
        throw new Error(`planFlow: unhandled step type "${_exhaustive}" (AM3206)`);
      }
    }
    steps.push({ stepId, ops });
  });
  return { plan: { flowId: flow.id, archId, steps }, diagnostics, fatal };
}
