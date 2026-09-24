// Visual candidates V1/V2/V3 — same geometry, different surface paint. All Calm direction.
import type { Scene } from '../core/layout.js';
import { LIGHT, DARK, FONT_UI, type Theme } from './tokens.js';
import { iconFor } from './icons.js';
import { escapeXmlText, escapeXmlAttr } from '../core/suggest.js';

export type VisualName = 'V1' | 'V2' | 'V3';
export type ThemeName = 'light' | 'dark';
const themeFor = (n: ThemeName): Theme => (n === 'dark' ? DARK : LIGHT);
const trunc = (s: string, m = 22): string => ([...s].length > m ? [...s].slice(0, m - 1).join('') + '…' : s);

function mid(d: string): { x: number; y: number } {
  const nums = d.replace(/^[M]/, '').split('L').map(s => s.trim().split(/\s+/).map(Number));
  if (!nums[0] || nums[0].length !== 2) return { x: 0, y: 0 };
  const a = nums[Math.max(0, Math.floor(nums.length / 2) - 1)] as [number, number];
  const b = nums[Math.floor(nums.length / 2)] as [number, number];
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
}

export function renderCandidate(scene: Scene, visual: VisualName, themeName: ThemeName, title = 'Architecture'): string {
  const t = themeFor(themeName);
  const p: string[] = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${scene.w}" height="${scene.h}" viewBox="0 0 ${scene.w} ${scene.h}" role="img">`);
  p.push(`<title>${escapeXmlText(title)} (${visual} ${themeName})</title><rect width="${scene.w}" height="${scene.h}" fill="${t.bg}"/>`);
  p.push(`<defs><marker id="a-${visual}" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0,0 8,3 0,6" fill="${t.edge}"/></marker></defs>`);
  for (const e of [...scene.edges].sort((a, b) => a.id.localeCompare(b.id))) {
    const w = visual === 'V2' ? 1.5 : 1.75;
    p.push(`<path d="${escapeXmlAttr(e.d)}" fill="none" stroke="${t.edge}" stroke-width="${w}" marker-end="url(#a-${visual})"/>`);
    if (e.label) { const m = mid(e.d); p.push(`<text x="${m.x}" y="${m.y - 6}" font-family="${FONT_UI}" font-size="10.5" fill="${t.muted}" text-anchor="middle" stroke="${t.bg}" stroke-width="3" paint-order="stroke">${escapeXmlText(e.label)}</text>`); }
  }
  for (const n of [...scene.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    const cx = n.x + 24; const cy = n.y + n.h / 2;
    if (visual === 'V1') {
      p.push(`<g><title>${escapeXmlText(n.label)}</title><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${t.nodeFill}" stroke="${t.ink}" stroke-width="1.5"/><g transform="translate(${cx},${cy}) scale(0.833) translate(-12,-12)" color="${t.ink}">${iconFor(n.kind)}</g><text x="${n.x + 44}" y="${n.y + n.h / 2 + 4.5}" font-family="${FONT_UI}" font-size="12.5" font-weight="600" fill="${t.ink}">${escapeXmlText(trunc(n.label))}</text></g>`);
    } else if (visual === 'V2') {
      p.push(`<g><title>${escapeXmlText(n.label)}</title><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10" fill="${t.nodeFill}" stroke="${t.muted}" stroke-width="1"/><g transform="translate(${cx},${cy}) scale(0.833) translate(-12,-12)" color="${t.muted}">${iconFor(n.kind)}</g><text x="${n.x + 44}" y="${n.y + n.h / 2 + 4.5}" font-family="${FONT_UI}" font-size="12.5" font-weight="500" fill="${t.ink}">${escapeXmlText(trunc(n.label))}</text></g>`);
    } else {
      p.push(`<g><title>${escapeXmlText(n.label)}</title><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="6" fill="${t.nodeFill}" stroke="${t.ink}" stroke-width="1"/><rect x="${n.x}" y="${n.y}" width="3" height="${n.h}" rx="1.5" fill="${t.accent}"/><g transform="translate(${cx},${cy}) scale(0.833) translate(-12,-12)" color="${t.ink}">${iconFor(n.kind)}</g><text x="${n.x + 44}" y="${n.y + n.h / 2 + 4.5}" font-family="${FONT_UI}" font-size="12.5" font-weight="600" fill="${t.ink}">${escapeXmlText(trunc(n.label))}</text></g>`);
    }
  }
  p.push('</svg>');
  return p.join('');
}
