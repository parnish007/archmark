// ArchMark v0 parser: deterministic, hoisting-friendly, positional diagnostics.
// Langium grammar plugs in later behind parse(); IR unchanged.
import { NODE_KINDS, type NodeKind } from '../core/ir.js';

export type Severity = 'error' | 'warn';
export interface Diagnostic {
  code: string;
  line: number;
  col: number;
  message: string;
  hint?: string;
  severity: Severity;
}
export interface AstComponent {
  kind: NodeKind;
  id: string;
  label: string;
  line: number;
}
export interface AstEdge {
  from: string;
  to: string;
  label?: string;
  line: number;
}
export interface AstFlow {
  id: string;
  steps: { from: string; to: string; type?: string; line: number }[];
  line: number;
}
export interface AstGroup {
  id: string;
  label: string;
  members: AstComponent[];
  edges: AstEdge[];
  line: number;
}
export interface Ast {
  components: AstComponent[];
  edges: AstEdge[];
  flows: AstFlow[];
  groups: AstGroup[];
}

export const MAX_SOURCE_BYTES = 256 * 1024;
export const MAX_LINES = 2000;

const IDENT_SRC = '[A-Za-z_][A-Za-z0-9_-]*';
const RE_FLOW_OPEN = new RegExp(`^flow\\s+(${IDENT_SRC})\\s*(\\{?)\\s*(?://.*)?$`);
const RE_GROUP_OPEN = new RegExp(`^group\\s+(${IDENT_SRC})(?:\\s+"((?:[^"\\\\]|\\\\.)*)")?\\s*(\\{?)\\s*(?://.*)?$`);
const RE_COMP = new RegExp(`^(${IDENT_SRC})\\s+(${IDENT_SRC})(?:\\s+"((?:[^"\\\\]|\\\\.)*)")?\\s*(?://.*)?$`);
const RE_EDGE = new RegExp(`^(${IDENT_SRC})\\s*->\\s*(${IDENT_SRC})(?:\\s*\\{([^}]*)\\})?\\s*(?://.*)?$`);
const RE_CLOSE = /^\}\s*(?:\/\/.*)?$/;

function unescapeLabel(s: string): string {
  return s.replace(/\\(.)/g, '$1').slice(0, 512);
}

export function parse(source: string): { ast: Ast; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const ast: Ast = { components: [], edges: [], flows: [], groups: [] };
  if (Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) {
    diagnostics.push({
      code: 'AM1008',
      line: 1,
      col: 1,
      severity: 'error',
      message: `Source exceeds ${MAX_SOURCE_BYTES} bytes; split the model.`,
    });
    return { ast, diagnostics };
  }
  const lines = source.split('\n');
  if (lines.length > MAX_LINES) {
    diagnostics.push({ code: 'AM1009', line: 1, col: 1, severity: 'error', message: `Source exceeds ${MAX_LINES} lines.` });
    return { ast, diagnostics };
  }
  type Scope = { type: 'flow'; flow: AstFlow } | { type: 'group'; group: AstGroup };
  const stack: Scope[] = [];
  const curFlow = (): AstFlow | null => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i]?.type === 'flow') return (stack[i] as { flow: AstFlow }).flow;
    return null;
  };
  const curGroup = (): AstGroup | null => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i]?.type === 'group') return (stack[i] as { group: AstGroup }).group;
    return null;
  };

  lines.forEach((raw, idx) => {
    const line = idx + 1;
    const t = raw.trim();
    if (!t || t.startsWith('//') || t.startsWith('#')) return;

    let m = t.match(RE_FLOW_OPEN);
    if (m && t.startsWith('flow')) {
      if (!m[2]) {
        diagnostics.push({
          code: 'AM1003',
          line,
          col: 1,
          severity: 'error',
          message: `flow "${m[1]}" missing "{" — expected: flow ${m[1]} {`,
          hint: 'Add {. Flow does not swallow following lines.',
        });
        return;
      }
      const f: AstFlow = { id: m[1] as string, steps: [], line };
      ast.flows.push(f);
      stack.push({ type: 'flow', flow: f });
      return;
    }
    m = t.match(RE_GROUP_OPEN);
    if (m && t.startsWith('group')) {
      if (!m[3]) {
        diagnostics.push({
          code: 'AM1003',
          line,
          col: 1,
          severity: 'error',
          message: `group "${m[1]}" missing "{" — expected: group ${m[1]} {`,
          hint: 'Add {.',
        });
        return;
      }
      if (stack.some((s) => s.type === 'group')) {
        diagnostics.push({
          code: 'AM1004',
          line,
          col: 1,
          severity: 'error',
          message: 'Nested groups are not supported in v0 (max 1 level).',
          hint: 'Flatten; nesting lands with views.',
        });
        return;
      }
      const g: AstGroup = { id: m[1] as string, label: unescapeLabel(m[2] ?? (m[1] as string)), members: [], edges: [], line };
      ast.groups.push(g);
      stack.push({ type: 'group', group: g });
      return;
    }
    if (RE_CLOSE.test(t)) {
      if (stack.length === 0) {
        diagnostics.push({ code: 'AM1005', line, col: 1, severity: 'error', message: 'Unmatched "}".' });
        return;
      }
      stack.pop();
      return;
    }
    m = t.match(RE_EDGE);
    if (m) {
      const body = m[3] ?? '';
      let type: string | undefined;
      const tm = body.match(/type\s*:\s*([A-Za-z]+)/);
      if (tm) type = tm[1]?.toLowerCase();
      const unknownKeys = body
        .replace(/type\s*:\s*[A-Za-z]+/g, '')
        .replace(/label\s*:\s*"[^"]*"/g, '')
        .trim()
        .replace(/^,|,$/g, '')
        .trim();
      if (unknownKeys.replace(/,/g, '').trim()) {
        diagnostics.push({
          code: 'AM1010',
          line,
          col: 1,
          severity: 'error',
          message: `Unknown edge options: "${unknownKeys}".`,
          hint: 'Valid keys: type, label.',
        });
      }
      const lm = body.match(/label\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const label = lm ? unescapeLabel(lm[1] as string) : undefined;
      const flow = curFlow();
      if (flow) {
        if (label)
          diagnostics.push({ code: 'AM1011', line, col: 1, severity: 'warn', message: 'Flow steps ignore label; use type instead.' });
        flow.steps.push({ from: m[1] as string, to: m[2] as string, type, line });
      } else {
        const e: AstEdge = { from: m[1] as string, to: m[2] as string, line };
        if (label) e.label = label;
        const g = curGroup();
        if (g) g.edges.push(e);
        else ast.edges.push(e);
      }
      return;
    }
    m = t.match(RE_COMP);
    if (m && (NODE_KINDS as readonly string[]).includes(m[1] as string)) {
      const comp: AstComponent = { kind: m[1] as NodeKind, id: m[2] as string, label: unescapeLabel(m[3] ?? (m[2] as string)), line };
      const g = curGroup();
      if (g) g.members.push(comp);
      else ast.components.push(comp);
      return;
    }
    // kind-like but unknown → helpful error (not generic unrecognized)
    const kindGuess = t.match(new RegExp(`^(${IDENT_SRC})\\s+`));
    if (kindGuess && !t.includes('->')) {
      diagnostics.push({
        code: 'AM1007',
        line,
        col: 1,
        severity: 'error',
        message: `Unknown component kind "${kindGuess[1]}".`,
        hint: `Valid: ${NODE_KINDS.join(', ')}.`,
      });
      return;
    }
    diagnostics.push({
      code: 'AM1001',
      line,
      col: 1,
      severity: 'error',
      message: `Unrecognized statement: "${t.slice(0, 80)}"`,
      hint: 'Expected `<kind> <id> "Label"`, `<a> -> <b>`, `flow <id> {`, or `group <id> {`.',
    });
  });

  if (stack.length > 0) {
    const top = stack[stack.length - 1] as Scope;
    const id = top.type === 'flow' ? top.flow.id : top.group.id;
    diagnostics.push({
      code: 'AM1006',
      line: lines.length,
      col: 1,
      severity: 'error',
      message: `Unclosed ${top.type} "${id}" — missing "}".`,
    });
  }

  const seen = new Map<string, number>();
  for (const c of [...ast.components, ...ast.groups.flatMap((g) => g.members)]) {
    if (seen.has(c.id))
      diagnostics.push({
        code: 'AM1001',
        line: c.line,
        col: 1,
        severity: 'error',
        message: `Duplicate component id "${c.id}" (first at line ${seen.get(c.id)}).`,
        hint: 'Rename one; ids must be unique. Second definition ignored.',
      });
    else seen.set(c.id, c.line);
  }
  return { ast, diagnostics };
}
