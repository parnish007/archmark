// Central diagnostic model (compiler-quality, LSP-ready shape).
export type Severity = 'error' | 'warn' | 'info';
export interface Range {
  line: number;
  col: number;
  endLine?: number;
  endCol?: number;
}
export interface Diagnostic {
  code: string;
  severity: Severity;
  message: string;
  file?: string;
  line: number;
  col: number;
  endLine?: number;
  endCol?: number;
  hint?: string;
}
export function diag(code: string, severity: Severity, message: string, line: number, col = 1, hint?: string): Diagnostic {
  return { code, severity, message, line, col, ...(hint ? { hint } : {}) };
}
