// Deterministic static SVG renderer from SceneGraph. Headless, no network.
// GitHub-safe: no nested <svg>, no textPath, midpoint labels with halo.
import type { Scene } from '../core/layout.js';
import { LIGHT, DARK, FONT_UI, type Theme } from './tokens.js';
import { iconFor } from './icons.js';
import { escapeXmlText, escapeXmlAttr } from '../core/suggest.js';

export type ThemeName = 'light' | 'dark';
export function themeFor(name: ThemeName): Theme { return name === 'dark' ? DARK : LIGHT; }

function truncate(label: string, max = 22): string {
  return [...label].length > max ? [...label].slice(0, max - 1).join('') + '…' : label;
}

function edgeMidpoint(d: string): { x: number; y: number } {
  // Parse "Mx y Lx y ..." and return middle segment midpoint.
  const nums = d.replace(/^[M]/, '').split('L').map(s => s.trim().split(/\s+/).map(Number));
  if (nums.length === 0 || nums[0]?.length !== 2) return { x: 0, y: 0 };
  const mid = Math.floor(nums.length / 2);
  const a = nums[Math.max(0, mid - 1)] as [number, number];
  const b = nums[mid] as [number, number];
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
}

export function renderStatic(scene: Scene, themeName: ThemeName, opts: { title?: string; desc?: string } = {}): string {
  const t = themeFor(themeName);
  const title = opts.title ?? 'Architecture diagram';
  const desc = opts.desc ?? `${scene.nodes.length} components, ${scene.edges.length} connections.`;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${scene.w}" height="${scene.h}" viewBox="0 0 ${scene.w} ${scene.h}" role="img" aria-labelledby="am-t am-d">`);
  parts.push(`<title id="am-t">${escapeXmlText(title)}</title><desc id="am-d">${escapeXmlText(desc)}</desc>`);
  parts.push(`<rect width="${scene.w}" height="${scene.h}" fill="${t.bg}"/>`);
  parts.push(`<defs><marker id="am-arrow" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0,0 8,3 0,6" fill="${t.edge}"/></marker></defs>`);
  for (const g of [...(scene.groups ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
    parts.push(`<g id="g-${escapeXmlAttr(g.id)}"><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" fill="${t.grid}" opacity="0.35" stroke="${t.muted}" stroke-width="1" stroke-dasharray="6 4"/><text x="${g.x + 16}" y="${g.y + 22}" font-family="${FONT_UI}" font-size="10" font-weight="600" letter-spacing="0.06em" fill="${t.muted}">${escapeXmlText(g.label.toUpperCase().slice(0, 40))}</text></g>`);
  }
  const edges = [...scene.edges].sort((a, b) => a.id.localeCompare(b.id));
  for (const e of edges) {
    parts.push(`<path id="e-${escapeXmlAttr(e.id)}" d="${escapeXmlAttr(e.d)}" fill="none" stroke="${t.edge}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#am-arrow)"/>`);
    if (e.label) {
      const m = edgeMidpoint(e.d);
      parts.push(`<text x="${Math.round(m.x * 100) / 100}" y="${Math.round((m.y - 6) * 100) / 100}" font-family="${FONT_UI}" font-size="10.5" fill="${t.muted}" text-anchor="middle" stroke="${t.bg}" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${escapeXmlText(e.label)}</text>`);
    }
  }
  const nodes = [...scene.nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const n of nodes) {
    const short = truncate(n.label);
    const cx = n.x + 14 + 10; const cy = n.y + n.h / 2;
    parts.push(`<g id="n-${escapeXmlAttr(n.id)}">`);
    parts.push(`<title>${escapeXmlText(n.label)} (${escapeXmlText(n.kind)})</title>`);
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${t.nodeFill}" stroke="${t.ink}" stroke-width="1.5"/>`);
    // Flattened icon: translate(center) scale(20/24) translate(-12,-12), no nested <svg>.
    parts.push(`<g transform="translate(${cx},${cy}) scale(0.833) translate(-12,-12)" color="${t.ink}">${iconFor(n.kind)}</g>`);
    parts.push(`<text x="${n.x + 44}" y="${n.y + n.h / 2 + 4.5}" font-family="${FONT_UI}" font-size="12.5" font-weight="600" fill="${t.ink}">${escapeXmlText(short)}</text>`);
    parts.push(`</g>`);
  }
  parts.push(`</svg>`);
  return parts.join('');
}
