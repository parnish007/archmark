// Semantic compiler: AST → Architecture IR + diagnostics. Hoisting, no layout.
import type { Ast, Diagnostic } from '../language/parser.js';
import { type ArchModel, type ArchNode, type FlowStepType, NODE_KINDS } from './ir.js';
import { slugId, suggest } from './suggest.js';
export { slugId };

export function stableEdgeId(from: string, to: string, ordinal: number): string {
  // Stable under input reorder: ordinal counts occurrences within the same (from,to) pair
  // after deterministic sorting, never the raw array index.
  return ordinal <= 1 ? `${slugId(from)}--${slugId(to)}` : `${slugId(from)}--${slugId(to)}#${ordinal}`;
}

// Final uniqueness pass over SLUGGED ids: a-b→c and a→b-c both slug to a-b--c.
// First occurrence keeps the id; later ones get -2, -3… (deterministic by sorted order).

export interface CompileResult {
  model: ArchModel;
  diagnostics: Diagnostic[];
  fatal: boolean;
}

export const MAX_NODES = 5000;
export const MAX_EDGES = 10000;
// Semantic label cap, deliberately counted in Unicode CODE POINTS (not graphemes):
// this is a resource-control bound (memory/output size), where code points are the honest
// unit. Code-point iteration can never split a surrogate pair, so output stays well-formed;
// a grapheme cluster (e.g. ZWJ sequence) may be cut mid-cluster in extreme 512+ char labels,
// which is cosmetic-only at that scale. No presentation dependency is introduced here.
export const MAX_LABEL = 512;

export function compile(ast: Ast): CompileResult {
  const diagnostics: Diagnostic[] = [];
  let fatal = false;
  const nodes: ArchNode[] = [];
  const ids = new Set<string>();

  const allComps = [...ast.components, ...ast.groups.flatMap((g) => g.members)];
  for (const c of allComps) {
    if (!NODE_KINDS.includes(c.kind)) {
      diagnostics.push({
        code: 'AM1101',
        line: c.line,
        col: 1,
        severity: 'error',
        message: `Unknown kind "${c.kind}".`,
        hint: `Valid: ${NODE_KINDS.join(', ')}.`,
      });
      fatal = true;
      continue;
    }
    if (ids.has(c.id)) {
      // Parser reports the duplicate (AM1001); the compiler drops the second definition AND
      // records its own diagnostic so library use never fails silently.
      diagnostics.push({
        code: 'AM1001',
        line: c.line,
        col: 1,
        severity: 'error',
        message: `Duplicate component id "${c.id}" (second definition ignored).`,
        hint: 'Rename one; ids must be unique.',
      });
      fatal = true;
      continue;
    }
    ids.add(c.id);
    const label = [...c.label].length > MAX_LABEL ? [...c.label].slice(0, MAX_LABEL).join('') : c.label;
    if ([...c.label].length > MAX_LABEL)
      diagnostics.push({
        code: 'AM1105',
        line: c.line,
        col: 1,
        severity: 'warn',
        message: `Label for "${c.id}" truncated to ${MAX_LABEL} chars.`,
      });
    nodes.push({ id: c.id, kind: c.kind, label });
  }
  if (nodes.length === 0) {
    diagnostics.push({
      code: 'AM1102',
      line: 1,
      col: 1,
      severity: 'error',
      message: 'Empty architecture: declare at least one component.',
      hint: 'Example: service api "API".',
    });
    fatal = true;
  }
  if (nodes.length > MAX_NODES) {
    diagnostics.push({
      code: 'AM1103',
      line: 1,
      col: 1,
      severity: 'error',
      message: `Too many nodes (${nodes.length} > ${MAX_NODES}). Refusing layout (DoS guard).`,
    });
    fatal = true;
  }

  const rawEdges = [...ast.edges, ...ast.groups.flatMap((g) => g.edges)].sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || (a.label ?? '').localeCompare(b.label ?? '') || a.line - b.line,
  );
  const ordinals = new Map<string, number>();
  const edges = rawEdges.map((e) => {
    const key = `${e.from}→${e.to}`;
    const n = (ordinals.get(key) ?? 0) + 1;
    ordinals.set(key, n);
    return { id: stableEdgeId(e.from, e.to, n), ...e };
  });
  // Dedupe on the SLUGGED id (slug collisions across distinct pairs get suffixes).
  // Loop until fresh: a natural `x-2` must never collide with a suffixed `x → x-2`.
  {
    const seen = new Set<string>();
    for (const e of edges) {
      let candidate = e.id;
      let n = 1;
      while (seen.has(candidate)) {
        n += 1;
        candidate = `${e.id}-${n}`;
      }
      seen.add(candidate);
      e.id = candidate;
    }
  }
  if (edges.length > MAX_EDGES) {
    diagnostics.push({
      code: 'AM1103',
      line: 1,
      col: 1,
      severity: 'error',
      message: `Too many edges (${edges.length} > ${MAX_EDGES}). Refusing layout.`,
    });
    fatal = true;
  }
  for (const e of edges) {
    for (const end of [e.from, e.to] as const) {
      if (!ids.has(end)) {
        const s = suggest(end, [...ids]);
        diagnostics.push({
          code: 'AM1203',
          line: e.line,
          col: 1,
          severity: 'error',
          message: `Unknown component "${end}" in ${e.from} -> ${e.to}.`,
          hint: s ? `Did you mean "${s}"?` : 'Declare it first (forward refs allowed, typos not).',
        });
        fatal = true;
      }
    }
    if (e.from === e.to)
      diagnostics.push({
        code: 'AM1109',
        line: e.line,
        col: 1,
        severity: 'warn',
        message: `Self-edge on "${e.from}" drawn as loop.`,
        hint: 'Remove if unintended.',
      });
  }

  const groups = ast.groups.map((g) => ({ id: g.id, label: g.label, members: g.members.map((m) => m.id) }));
  {
    // One group per node, validated HERE (not only in layout): paying ELK cost before
    // rejecting is wasteful, and the diagnostic belongs to semantic validation.
    const memberOf = new Map<string, string>();
    for (const g of ast.groups) {
      for (const m of g.members) {
        const prev = memberOf.get(m.id);
        if (prev) {
          diagnostics.push({
            code: 'AM1110',
            line: m.line,
            col: 1,
            severity: 'error',
            message: `Node "${m.id}" is in groups "${prev}" and "${g.id}"; v0 supports one group per node.`,
            hint: 'Move the node to a single group.',
          });
          fatal = true;
        } else memberOf.set(m.id, g.id);
      }
    }
  }
  for (const g of ast.groups) {
    if (g.members.length === 0) {
      diagnostics.push({
        code: 'AM1108',
        line: g.line,
        col: 1,
        severity: 'error',
        message: `Group "${g.id}" is empty.`,
        hint: 'Declare members inside the group or remove it. Empty groups are rejected, not silently rendered.',
      });
      fatal = true;
    }
    // Unknown members must fail here: layout would otherwise place ghost nodes, pass P5 on the
    // placed set, and silently omit them from the scene (false grouping).
    for (const m of g.members) {
      if (!ids.has(m.id)) {
        const s = suggest(m.id, [...ids]);
        diagnostics.push({
          code: 'AM1203',
          line: m.line,
          col: 1,
          severity: 'error',
          message: `Group "${g.id}" references unknown component "${m.id}".`,
          hint: s ? `Did you mean "${s}"?` : 'Declare the component first.',
        });
        fatal = true;
      }
    }
  }
  const flows = ast.flows.map((f) => ({
    id: f.id,
    loop: f.loop,
    line: f.line,
    steps: f.steps.map((s) => {
      const valid: readonly FlowStepType[] = ['request', 'response', 'write', 'read', 'event', 'error', 'failure', 'recovery'];
      let type: FlowStepType | undefined = s.type as FlowStepType | undefined;
      if (type && !valid.includes(type)) {
        diagnostics.push({
          code: 'AM1106',
          line: s.line,
          col: 1,
          severity: 'error',
          message: `Unknown flow type "${s.type}".`,
          hint: `Valid: ${valid.join(', ')}.`,
        });
        type = undefined;
        fatal = true;
      }
      if (!ids.has(s.from) || !ids.has(s.to)) {
        const bad = !ids.has(s.from) ? s.from : s.to;
        const sug = suggest(bad, [...ids]);
        diagnostics.push({
          code: 'AM1203',
          line: s.line,
          col: 1,
          severity: 'error',
          message: `Flow "${f.id}" references unknown node "${bad}" in ${s.from} -> ${s.to}.`,
          hint: sug ? `Did you mean "${sug}"?` : 'Declare the component first.',
        });
        fatal = true;
      }
      return { from: s.from, to: s.to, line: s.line, ...(type ? { type } : {}) };
    }),
  }));

  // Strict flow validation (§24): every flow step must reference a declared architecture
  // relationship. The animation explains the architecture; it must not invent topology.
  {
    const declared = new Set(edges.map((e) => `${e.from}→${e.to}`));
    for (const f of flows) {
      if (f.steps.length === 0) {
        diagnostics.push({
          code: 'AM3104',
          line: f.line,
          col: 1,
          severity: 'error',
          message: `Flow "${f.id}" has no steps.`,
          hint: 'Add at least one `from -> to` step or remove the flow.',
        });
        fatal = true;
      }
      for (const s of f.steps) {
        if (!declared.has(`${s.from}→${s.to}`) && ids.has(s.from) && ids.has(s.to)) {
          diagnostics.push({
            code: 'AM3102',
            line: s.line,
            col: 1,
            severity: 'error',
            message: `Flow "${f.id}" uses ${s.from} -> ${s.to}, but no such architecture relationship exists.`,
            hint: `Declare it:\n${s.from} -> ${s.to}`,
          });
          fatal = true;
        }
      }
    }
  }

  return { model: { nodes, edges, groups, flows }, diagnostics, fatal };
}
