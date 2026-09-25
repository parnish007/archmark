// Shared scene serialization: static scene layer used by ALL renderers.
// Animated backends add overlays/animations; they never fork node/edge/group/icon code.
import type { Scene } from '../core/layout.js';
import { escapeXmlAttr, escapeXmlText } from '../core/suggest.js';
import { iconFor } from './icons.js';
import type { IdScope } from './ids.js';
import { FONT_UI, type Theme } from './tokens.js';

export interface SceneLayer {
  defs: string;
  body: string;
  edgePathIds: Map<string, string>; // semantic edge id → path element id (for mpath refs)
  nodeIds: Map<string, string>;
}

export function truncate(label: string, max = 22): string {
  return [...label].length > max ? `${[...label].slice(0, max - 1).join('')}…` : label;
}

export function edgeMidpoint(d: string): { x: number; y: number } {
  // Length-weighted midpoint over segments (stable labels on long orthogonal edges).
  // Empty/invalid path data is corrupt layout input: fail loudly, never label at origin.
  const nums = d
    .replace(/^[M]/, '')
    .split('L')
    .map((s) => s.trim().split(/\s+/).map(Number))
    .filter((p): p is [number, number] => p.length === 2 && p.every((v) => Number.isFinite(v)));
  if (nums.length === 0) throw new Error('edgeMidpoint: empty path data');
  const first = nums[0] as [number, number];
  if (nums.length === 1) return { x: first[0], y: first[1] };
  let total = 0;
  const segs: { ax: number; ay: number; bx: number; by: number; len: number }[] = [];
  for (let i = 1; i < nums.length; i++) {
    const a = nums[i - 1] as [number, number];
    const b = nums[i] as [number, number];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], len });
    total += len;
  }
  if (total === 0) return { x: first[0], y: first[1] };
  let target = total / 2;
  for (const s of segs) {
    if (target <= s.len) {
      const f = s.len === 0 ? 0 : target / s.len;
      return { x: s.ax + (s.bx - s.ax) * f, y: s.ay + (s.by - s.ay) * f };
    }
    target -= s.len;
  }
  const last = segs[segs.length - 1] as { bx: number; by: number };
  return { x: last.bx, y: last.by };
}

export function renderSceneLayer(scene: Scene, t: Theme, ids: IdScope, arrowId: string): SceneLayer {
  const parts: string[] = [];
  const edgePathIds = new Map<string, string>();
  const nodeIds = new Map<string, string>();
  for (const g of [...(scene.groups ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!g.truthful) continue; // suppressed: never render false grouping
    const gid = ids.unique('group', g.id);
    parts.push(
      `<g id="${gid}"><title>${escapeXmlText(g.label)} (group)</title><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" fill="${t.grid}" opacity="0.35" stroke="${t.muted}" stroke-width="1" stroke-dasharray="6 4"/><text x="${g.x + 16}" y="${g.y + 22}" font-family="${FONT_UI}" font-size="10" font-weight="600" letter-spacing="0.06em" fill="${t.muted}">${escapeXmlText(g.label.toLocaleUpperCase('en').slice(0, 40))}</text></g>`,
    );
  }
  for (const e of [...scene.edges].sort((a, b) => a.id.localeCompare(b.id))) {
    const pid = ids.unique('edge', e.id);
    edgePathIds.set(e.id, pid);
    parts.push(
      `<path id="${pid}" d="${escapeXmlAttr(e.d)}" fill="none" stroke="${t.edge}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${arrowId})"/>`,
    );
    if (e.label) {
      const m = edgeMidpoint(e.d);
      parts.push(
        `<text x="${Math.round(m.x * 100) / 100}" y="${Math.round((m.y - 6) * 100) / 100}" font-family="${FONT_UI}" font-size="10.5" fill="${t.muted}" text-anchor="middle" stroke="${t.bg}" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${escapeXmlText(e.label)}</text>`,
      );
    }
  }
  for (const n of [...scene.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    const nid = ids.unique('node', n.id);
    nodeIds.set(n.id, nid);
    const short = truncate(n.label);
    const cx = n.x + 14 + 10;
    const cy = n.y + n.h / 2;
    parts.push(`<g id="${nid}">`);
    parts.push(`<title>${escapeXmlText(n.label)} (${escapeXmlText(n.kind)})</title>`);
    parts.push(
      `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${t.nodeFill}" stroke="${t.ink}" stroke-width="1.5"/>`,
    );
    // Flattened icon: translate(center) scale(20/24) translate(-12,-12), no nested <svg>.
    parts.push(`<g transform="translate(${cx},${cy}) scale(0.833) translate(-12,-12)" color="${t.ink}">${iconFor(n.kind)}</g>`);
    parts.push(
      `<text x="${n.x + 44}" y="${n.y + n.h / 2 + 4.5}" font-family="${FONT_UI}" font-size="12.5" font-weight="600" fill="${t.ink}">${escapeXmlText(short)}</text>`,
    );
    parts.push('</g>');
  }
  const defs = `<marker id="${arrowId}" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0,0 8,3 0,6" fill="${t.edge}"/></marker>`;
  return { defs, body: parts.join(''), edgePathIds, nodeIds };
}
