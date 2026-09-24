// Markdown integration: byte-range extract/patch only. No architecture semantics.
import { resolve, sep } from 'node:path';
import { escapeXmlText } from '../core/suggest.js';

export interface ArchBlock { id: string; source: string; start: number; end: number }

const RE_BLOCK = /<!--\s*archmark\s*(?:id\s*=\s*([A-Za-z0-9_-]+))?\s*\n([\s\S]*?)\n?\s*-->/g;

export function extractBlocks(md: string): ArchBlock[] {
  const blocks: ArchBlock[] = [];
  RE_BLOCK.lastIndex = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = RE_BLOCK.exec(md))) {
    blocks.push({ id: m[1] ?? (n === 0 ? 'system' : `system-${n}`), source: (m[2] ?? '').trim(), start: m.index, end: m.index + m[0].length });
    n++;
    if (n > 50) break; // DoS guard: max blocks per file
  }
  return blocks;
}

export function renderTag(id: string, light: string, dark: string, alt: string): string {
  const esc = (s: string) => escapeXmlText(s).replace(/"/g, '&quot;');
  return `<!-- archmark-render:start ${id} -->\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${esc(dark)}" />\n  <img alt="${esc(alt)}" src="${esc(light)}" />\n</picture>\n<!-- archmark-render:end ${id} -->`;
}

export function patchReadme(md: string, id: string, tag: string): string {
  const startM = `<!-- archmark-render:start ${id} -->`;
  const endM = `<!-- archmark-render:end ${id} -->`;
  const s = md.indexOf(startM); const e = md.indexOf(endM);
  if (s !== -1 && e !== -1 && e > s) {
    const end = e + endM.length;
    return md.slice(0, s) + tag + md.slice(end);
  }
  const blocks = extractBlocks(md);
  if (blocks.length > 0) {
    const last = blocks[blocks.length - 1] as ArchBlock;
    return md.slice(0, last.end) + '\n\n' + tag + '\n' + md.slice(last.end);
  }
  return md.trimEnd() + '\n\n' + tag + '\n';
}

const SAFE_SVG = /^[A-Za-z0-9][A-Za-z0-9._-]*\.svg$/;

export function validateSvgName(out: string): string {
  if (out.includes('\0') || out.includes(':')) throw new Error(`Unsafe output name "${out}".`);
  if (out.includes('..') || out.includes('/') || out.includes('\\')) throw new Error(`Unsafe output path "${out}". Use a bare file name like archmark.light.svg.`);
  if (!SAFE_SVG.test(out)) throw new Error(`Output must match ${SAFE_SVG}, got "${out}".`);
  return out;
}

export function resolveReadmeInCwd(target: string): string {
  const cwd = process.cwd();
  const abs = resolve(cwd, target);
  if (abs !== cwd && !abs.startsWith(cwd + sep)) throw new Error(`Refusing README outside working directory: ${target}.`);
  return abs;
}
