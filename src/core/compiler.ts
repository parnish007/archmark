// Semantic compiler: AST → Architecture IR + diagnostics. Hoisting, no layout.
import { type Ast, type Diagnostic } from '../language/parser.js';
import { type ArchModel, type ArchNode, type FlowStepType, NODE_KINDS } from './ir.js';
import { suggest } from './suggest.js';

export interface CompileResult { model: ArchModel; diagnostics: Diagnostic[]; fatal: boolean }

export const MAX_NODES = 5000; export const MAX_EDGES = 10000; export const MAX_LABEL = 512;

export function compile(ast: Ast): CompileResult {
  const diagnostics: Diagnostic[] = [];
  let fatal = false;
  const nodes: ArchNode[] = [];
  const ids = new Set<string>();

  const allComps = [...ast.components, ...ast.groups.flatMap(g => g.members)];
  for (const c of allComps) {
    if (!NODE_KINDS.includes(c.kind)) {
      diagnostics.push({ line: c.line, col: 1, severity: 'error', message: `Unknown kind "${c.kind}".`, hint: `Valid: ${NODE_KINDS.join(', ')}.` });
      fatal = true;
      continue;
    }
    if (ids.has(c.id)) { fatal = true; continue; } // parser already reported duplicate
    ids.add(c.id);
    const label = c.label.length > MAX_LABEL ? c.label.slice(0, MAX_LABEL) : c.label;
    if (c.label.length > MAX_LABEL) diagnostics.push({ line: c.line, col: 1, severity: 'warn', message: `Label for "${c.id}" truncated to ${MAX_LABEL} chars.` });
    nodes.push({ id: c.id, kind: c.kind, label });
  }
  if (nodes.length === 0) {
    diagnostics.push({ line: 1, col: 1, severity: 'error', message: 'Empty architecture: declare at least one component.', hint: 'Example: service api "API".' });
    fatal = true;
  }
  if (nodes.length > MAX_NODES) {
    diagnostics.push({ line: 1, col: 1, severity: 'error', message: `Too many nodes (${nodes.length} > ${MAX_NODES}). Refusing layout (DoS guard).` });
    fatal = true;
  }

  const edges = [...ast.edges, ...ast.groups.flatMap(g => g.edges)].map((e, i) => ({ id: `e${i}`, ...e }));
  if (edges.length > MAX_EDGES) {
    diagnostics.push({ line: 1, col: 1, severity: 'error', message: `Too many edges (${edges.length} > ${MAX_EDGES}). Refusing layout.` });
    fatal = true;
  }
  for (const e of edges) {
    for (const end of [e.from, e.to] as const) {
      if (!ids.has(end)) {
        const s = suggest(end, [...ids]);
        diagnostics.push({ line: e.line, col: 1, severity: 'error', message: `Unknown component "${end}" in ${e.from} -> ${e.to}.`, hint: s ? `Did you mean "${s}"?` : 'Declare it first (forward refs allowed, typos not).' });
        fatal = true;
      }
    }
    if (e.from === e.to) diagnostics.push({ line: e.line, col: 1, severity: 'warn', message: `Self-edge on "${e.from}" drawn as loop.`, hint: 'Remove if unintended.' });
  }

  const groups = ast.groups.map(g => ({ id: g.id, label: g.label, members: g.members.map(m => m.id) }));
  const flows = ast.flows.map(f => ({
    id: f.id,
    steps: f.steps.map(s => {
      const valid: readonly FlowStepType[] = ['request','response','write','read','event','error'];
      let type: FlowStepType | undefined = (s.type as FlowStepType | undefined);
      if (type && !valid.includes(type)) {
        diagnostics.push({ line: s.line, col: 1, severity: 'error', message: `Unknown flow type "${s.type}".`, hint: `Valid: ${valid.join(', ')}.` });
        type = undefined;
        fatal = true;
      }
      if (!ids.has(s.from) || !ids.has(s.to)) {
        diagnostics.push({ line: s.line, col: 1, severity: 'error', message: `Flow "${f.id}" references unknown node in ${s.from} -> ${s.to}.` });
        fatal = true;
      }
      return { from: s.from, to: s.to, ...(type ? { type } : {}) };
    }),
  }));

  return { model: { nodes, edges, groups, flows }, diagnostics, fatal };
}
