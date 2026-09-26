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
  loop: boolean;
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
const RE_FLOW_OPEN = new RegExp(`^flow\\s+(${IDENT_SRC})(?:\\s+(loop))?\\s*(\\{?)\\s*(?://.*)?$`);
const RE_GROUP_OPEN = new RegExp(`^group\\s+(${IDENT_SRC})(?:\\s+"((?:[^"\\\\]|\\\\.)*)")?\\s*(\\{?)\\s*(?://.*)?$`);
const RE_COMP = new RegExp(`^(${IDENT_SRC})\\s+(${IDENT_SRC})(?:\\s+"((?:[^"\\\\]|\\\\.)*)")?\\s*(?://.*)?$`);
const RE_EDGE = new RegExp(`^(${IDENT_SRC})\\s*->\\s*(${IDENT_SRC})(?:\\s*\\{((?:[^"{}]|"(?:[^"\\\\]|\\\\.)*")*)\\})?\\s*(?://.*)?$`);
const RE_CLOSE = /^\}\s*(?:\/\/.*)?$/;

function unescapeLabel(s: string): string {
  // No length cap here: MAX_LABEL truncation + warning belongs to the compiler (AM1105),
  // which must see the full label to diagnose. Input size is bounded by MAX_SOURCE_BYTES.
  return s.replace(/\\(.)/g, '$1');
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
      if (!m[3]) {
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
      const f: AstFlow = { id: m[1] as string, loop: m[2] === 'loop', steps: [], line };
      if (stack.length > 0) {
        diagnostics.push({
          code: 'AM1013',
          line,
          col: 1,
          severity: 'error',
          message: `flow "${m[1]}" opened inside a ${stack[stack.length - 1]?.type} block; flows and groups cannot nest.`,
          hint: 'Close the enclosing block first.',
        });
        return;
      }
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
      if (stack.length > 0) {
        diagnostics.push({
          code: stack.some((s) => s.type === 'group') ? 'AM1004' : 'AM1013',
          line,
          col: 1,
          severity: 'error',
          message: 'Nested groups are not supported in v0 (max 1 level, no groups inside flows).',
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
      if (curFlow()) {
        diagnostics.push({
          code: 'AM1013',
          line,
          col: 1,
          severity: 'error',
          message: `Component "${m[2]}" declared inside a flow; flows contain only steps.`,
          hint: 'Declare components outside the flow block.',
        });
        return;
      }
      const comp: AstComponent = { kind: m[1] as NodeKind, id: m[2] as string, label: unescapeLabel(m[3] ?? (m[2] as string)), line };
      const g = curGroup();
      if (g) g.members.push(comp);
      else ast.components.push(comp);
      return;
    }
    // kind-like but unknown → helpful error (not generic unrecognized).
    // Only when the leading word is genuinely not a kind: if it IS a valid kind, the
    // statement failed for another reason (e.g. an invalid id like `n:evil`) and the
    // generic AM1012 below is the honest diagnostic — never blame the kind.
    const kindGuess = t.match(new RegExp(`^(${IDENT_SRC})\\s+`));
    if (kindGuess && !t.includes('->') && !(NODE_KINDS as readonly string[]).includes(kindGuess[1] as string)) {
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
      code: 'AM1012',
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

  // Duplicate ids across ALL namespaces: components, group members, group ids, flow ids.
  // A group id colliding with a node id (or two flows sharing an id) is the same class of
  // error as duplicate components — one namespace per document (AM1001).
  const seen = new Map<string, { line: number; what: string }>();
  const claim = (id: string, line: number, what: string) => {
    const prev = seen.get(id);
    if (prev) {
      diagnostics.push({
        code: 'AM1001',
        line,
        col: 1,
        severity: 'error',
        message: `Duplicate id "${id}" (${what} at line ${line}; ${prev.what} at line ${prev.line}).`,
        hint: 'Rename one; ids must be unique per document. Second definition ignored.',
      });
    } else seen.set(id, { line, what });
  };
  for (const c of [...ast.components, ...ast.groups.flatMap((g) => g.members)]) claim(c.id, c.line, 'component');
  for (const g of ast.groups) claim(g.id, g.line, 'group');
  for (const f of ast.flows) claim(f.id, f.line, 'flow');
  return { ast, diagnostics };
}
