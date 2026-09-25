// Markdown integration on the region scanner: byte-range extract/patch only.
// Fail-closed: any fatal index diagnostic → no mutation. No architecture semantics.
import { resolve, sep } from 'node:path';
import { escapeXmlText } from '../core/suggest.js';
import { type MarkdownRegionIndex, scanMarkdown } from './scanner.js';

export interface ArchBlock {
  id: string;
  source: string;
  start: number;
  end: number;
}
export const MAX_BLOCKS = 50;

export function scan(md: string): MarkdownRegionIndex {
  return scanMarkdown(md);
}

export function extractBlocks(md: string): ArchBlock[] {
  const idx = scan(md);
  if (idx.fatal) {
    const first = idx.diagnostics.find((d) => d.severity === 'error');
    throw new PatchError(`Refusing to extract: ${first?.code ?? 'AM21xx'} ${first?.message ?? 'invalid regions'}`, idx.diagnostics);
  }
  return idx.sources.map((s) => ({ id: s.id, source: s.source, start: s.comment.start, end: s.comment.end }));
}

export function renderTag(id: string, light: string, dark: string, alt: string): string {
  const esc = (s: string) => escapeXmlText(s).replace(/"/g, '&quot;');
  return `<!-- archmark-render:start ${id} -->\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${esc(dark)}" />\n  <img alt="${esc(alt)}" src="${esc(light)}" />\n</picture>\n<!-- archmark-render:end ${id} -->`;
}

export class PatchError extends Error {
  diagnostics: MarkdownRegionIndex['diagnostics'];
  constructor(message: string, diagnostics: MarkdownRegionIndex['diagnostics']) {
    super(message);
    this.diagnostics = diagnostics;
  }
}

export function patchReadme(md: string, id: string, tag: string): string {
  const idx = scan(md);
  if (idx.fatal) {
    const first = idx.diagnostics.find((d) => d.severity === 'error');
    throw new PatchError(`Refusing to patch: ${first?.code ?? 'AM21xx'} ${first?.message ?? 'invalid regions'}`, idx.diagnostics);
  }
  const g = idx.generated.find((x) => x.id === id);
  if (g) {
    return md.slice(0, g.startComment.start) + tag + md.slice(g.endComment.end);
  }
  const src = idx.sources.find((x) => x.id === id) ?? idx.sources[idx.sources.length - 1];
  if (src) {
    return `${md.slice(0, src.comment.end)}\n\n${tag}\n${md.slice(src.comment.end)}`;
  }
  return `${md.trimEnd()}\n\n${tag}\n`;
}

const SAFE_SVG = /^[A-Za-z0-9][A-Za-z0-9._-]*\.svg$/;
// Windows reserved device names (case-insensitive stem, no extension).
const RESERVED = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

export function validateSvgName(out: string): string {
  if (out.includes('\0') || out.includes(':')) throw new Error(`Unsafe output name "${out}".`);
  if (out.includes('..') || out.includes('/') || out.includes('\\'))
    throw new Error(`Unsafe output path "${out}". Use a bare file name like archmark.light.svg.`);
  if (!SAFE_SVG.test(out)) throw new Error(`Output must match ${SAFE_SVG}, got "${out}".`);
  const stem = out.slice(0, -4).toLowerCase();
  if (RESERVED.has(stem) || /[. ]$/.test(stem)) throw new Error(`Unsafe output name "${out}" (reserved/canonicalization risk).`);
  return out;
}

export function resolveReadmeInCwd(target: string): string {
  const cwd = process.cwd();
  const abs = resolve(cwd, target);
  if (abs !== cwd && !abs.startsWith(cwd + sep)) throw new Error(`Refusing README outside working directory: ${target}.`);
  return abs;
}
