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
  /** 1-based file line where the block's DSL content starts (for file-relative diagnostics). */
  contentStartLine: number;
}
export const MAX_BLOCKS = 50;

export function scan(md: string): MarkdownRegionIndex {
  // Primitive: always returns the index with diagnostics + fatal flag, never throws.
  // Callers that need fail-closed behavior use extractBlocks/patchRegion (which throw
  // PatchError on fatal) or check `fatal` themselves (as the CLI pre-scan gate does).
  return scanMarkdown(md);
}

export function extractBlocks(md: string): ArchBlock[] {
  // Fail-closed convenience over scan(): throws PatchError on fatal conditions.
  // Use scan() directly when diagnostics-without-throwing are needed.
  const idx = scan(md);
  if (idx.fatal) {
    const first = idx.diagnostics.find((d) => d.severity === 'error');
    throw new PatchError(`Refusing to extract: ${first?.code ?? 'AM21xx'} ${first?.message ?? 'invalid regions'}`, idx.diagnostics);
  }
  return idx.sources.map((s) => ({
    id: s.id,
    source: s.source,
    start: s.comment.start,
    end: s.comment.end,
    contentStartLine: s.contentStartLine,
  }));
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

// Typed generated-region identity. Markdown understands ownership (which diagram a region
// belongs to) and kind (static vs flow) — never flow semantics like request/response.
// A region id with a '.' is always a flow region; diagram (source) ids never contain dots.
export interface GeneratedRegionKey {
  diagramId: string;
  kind: 'static' | 'flow';
  flowId?: string;
}

export function regionIdFor(key: GeneratedRegionKey): string {
  if (key.kind === 'static') return key.diagramId;
  if (!key.flowId) throw new Error('regionIdFor: flow region key requires flowId');
  return `${key.diagramId}.${key.flowId}`;
}

// Inverse of regionIdFor (single place that understands the encoding): split a generated
// region id back into its typed key. Diagram ids never contain dots, so the first dot
// separates owner from flow. Returns null for malformed ids.
export function parseRegionKey(rid: string): GeneratedRegionKey | null {
  const dot = rid.indexOf('.');
  if (dot <= 0 || dot === rid.length - 1) return null;
  const diagramId = rid.slice(0, dot);
  const flowId = rid.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(diagramId) || !/^[A-Za-z0-9_-]+$/.test(flowId)) return null;
  return { diagramId, kind: 'flow', flowId };
}

// True when a generated region id belongs to the given diagram (static region itself
// or one of its flow regions). Uses parseRegionKey, never ad-hoc string surgery.
export function isOwnerRegion(rid: string, diagramId: string): boolean {
  if (rid === diagramId) return true;
  const key = parseRegionKey(rid);
  return key !== null && key.diagramId === diagramId;
}

function failClosed(md: string): MarkdownRegionIndex {
  const idx = scan(md);
  if (idx.fatal) {
    const first = idx.diagnostics.find((d) => d.severity === 'error');
    throw new PatchError(`Refusing to patch: ${first?.code ?? 'AM21xx'} ${first?.message ?? 'invalid regions'}`, idx.diagnostics);
  }
  return idx;
}

export function patchRegion(md: string, key: GeneratedRegionKey, tag: string): string {
  const idx = failClosed(md);
  const rid = regionIdFor(key);
  const existing = idx.generated.find((x) => x.id === rid);
  if (existing) {
    return md.slice(0, existing.startComment.start) + tag + md.slice(existing.endComment.end);
  }
  if (key.kind === 'static') {
    const src = idx.sources.find((x) => x.id === key.diagramId) ?? idx.sources[idx.sources.length - 1];
    if (src) {
      return `${md.slice(0, src.comment.end)}\n\n${tag}\n${md.slice(src.comment.end)}`;
    }
    return `${md.trimEnd()}\n\n${tag}\n`;
  }
  // Flow region, first build: anchor beside the OWNER diagram — after the owner's static
  // generated region if present, else after the owner's source block (plus any already
  // placed same-owner flow regions, preserving model order). Never after another diagram.
  const ownerSrc = idx.sources.find((x) => x.id === key.diagramId);
  if (!ownerSrc) {
    throw new PatchError(`Refusing to patch: flow region "${rid}" has no owning source block "${key.diagramId}"`, idx.diagnostics);
  }
  let anchor = ownerSrc.comment.end;
  for (const g of idx.generated) {
    if (isOwnerRegion(g.id, key.diagramId)) anchor = Math.max(anchor, g.endComment.end);
  }
  return `${md.slice(0, anchor)}\n\n${tag}\n${md.slice(anchor)}`;
}

export function patchReadme(md: string, id: string, tag: string): string {
  // Legacy static-region entry point: every plain id is a diagram (static) region.
  // Flow callers must use patchRegion with a typed key so ownership is explicit.
  return patchRegion(md, { diagramId: id, kind: 'static' }, tag);
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
