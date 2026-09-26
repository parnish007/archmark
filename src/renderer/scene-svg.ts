// Shared scene serialization: static scene layer used by ALL renderers.
// Animated backends add overlays/animations; they never fork node/edge/group/icon code.
import type { Scene } from '../core/layout.js';
import { escapeXmlAttr, escapeXmlText, truncateGraphemes } from '../core/suggest.js';
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
  // Single shared grapheme-safe truncation (core-owned; no new utility).
  return truncateGraphemes(label, max);
}

// Orthogonal corner rounding (renderer-owned geometry): replaces sharp L-joints
// with quadratic blends of the given radius, clamped to half the shortest
// adjacent segment so short stubs never invert. M/L-only input (ELK emits
// orthogonal segments); anything else passes through untouched. Deterministic.
export function roundOrthogonalCorners(d: string, radius: number): string {
  if (radius <= 0) return d;
  const tokens = d.trim().split(/\s+/);
  // M x y (L x y)* — strict shape; anything else passes through untouched.
  if (tokens.length < 4 || tokens.length % 2 !== 0) return d;
  const pts: [number, number][] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const raw = tokens[i] as string;
    const want = i === 0 ? 'M' : 'L';
    if (!raw.startsWith(want)) return d;
    const x = Number(raw.slice(1));
    const y = Number(tokens[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return d;
    pts.push([x, y]);
  }
  if (pts.length < 3) return d;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  let out = `M${r2((pts[0] as [number, number])[0])} ${r2((pts[0] as [number, number])[1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i] as [number, number];
    const prev = pts[i - 1] as [number, number];
    const next = pts[i + 1] as [number, number];
    const v1 = [p[0] - prev[0], p[1] - prev[1]];
    const v2 = [next[0] - p[0], next[1] - p[1]];
    const l1 = Math.hypot(v1[0], v1[1]);
    const l2 = Math.hypot(v2[0], v2[1]);
    if (l1 === 0 || l2 === 0) {
      out += ` L${r2(p[0])} ${r2(p[1])}`;
      continue;
    }
    // Orthogonal joints only; non-right angles pass through sharp.
    const dot = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2);
    if (Math.abs(dot) > 1e-9) {
      out += ` L${r2(p[0])} ${r2(p[1])}`;
      continue;
    }
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const a = [p[0] - (v1[0] / l1) * r, p[1] - (v1[1] / l1) * r];
    const b = [p[0] + (v2[0] / l2) * r, p[1] + (v2[1] / l2) * r];
    out += ` L${r2(a[0])} ${r2(a[1])} Q${r2(p[0])} ${r2(p[1])} ${r2(b[0])} ${r2(b[1])}`;
  }
  const last = pts[pts.length - 1] as [number, number];
  out += ` L${r2(last[0])} ${r2(last[1])}`;
  return out;
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
    const glabel = escapeXmlText(g.label.toLocaleUpperCase('en').slice(0, 40));
    let labelSvg: string;
    if (t.groupBadge) {
      // Pill badge: ink chip with inverse text, top-left inside the container.
      const bw = Math.ceil(glabel.length * 6.4 + 20);
      const bx = g.x + 12;
      const by = g.y + 10;
      labelSvg = `<rect x="${bx}" y="${by}" width="${bw}" height="18" rx="9" fill="${t.badgeFill}"/><text x="${bx + bw / 2}" y="${by + 13}" text-anchor="middle" font-family="${FONT_UI}" font-size="${t.groupLabelSize}" font-weight="600" letter-spacing="0.06em" fill="${t.badgeInk}">${glabel}</text>`;
    } else {
      labelSvg = `<text x="${g.x + 16}" y="${g.y + 22}" font-family="${FONT_UI}" font-size="${t.groupLabelSize}" font-weight="600" letter-spacing="0.06em" fill="${t.muted}">${glabel}</text>`;
    }
    parts.push(
      `<g id="${gid}"><title>${escapeXmlText(g.label)} (group)</title><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="${t.groupRadius}" fill="${t.groupWash}" opacity="${t.groupWashOpacity}" stroke="${t.groupBorder}" stroke-width="${t.groupStroke}" stroke-dasharray="${t.groupDash}"/>${labelSvg}</g>`,
    );
  }
  for (const e of [...scene.edges].sort((a, b) => a.id.localeCompare(b.id))) {
    const pid = ids.unique('edge', e.id);
    edgePathIds.set(e.id, pid);
    const dd = t.cornerRadius > 0 ? roundOrthogonalCorners(e.d, t.cornerRadius) : e.d;
    parts.push(
      `<path id="${pid}" d="${escapeXmlAttr(dd)}" fill="none" stroke="${t.edge}" stroke-width="${t.edgeStroke}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${arrowId})"/>`,
    );
    if (e.label) {
      const m = edgeMidpoint(e.d);
      parts.push(
        `<text x="${Math.round(m.x * 100) / 100}" y="${Math.round((m.y - 6) * 100) / 100}" font-family="${FONT_UI}" font-size="${t.edgeLabelSize}" fill="${t.muted}" text-anchor="middle" stroke="${t.bg}" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${escapeXmlText(e.label)}</text>`,
      );
    }
  }
  for (const n of [...scene.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    const nid = ids.unique('node', n.id);
    nodeIds.set(n.id, nid);
    const short = truncate(n.label);
    parts.push(`<g id="${nid}">`);
    parts.push(`<title>${escapeXmlText(n.label)} (${escapeXmlText(n.kind)})</title>`);
    parts.push(nodeBody(n, short, t));
    parts.push('</g>');
  }
  const defs = `<marker id="${arrowId}" viewBox="0 0 ${t.arrowSize} ${Math.round(t.arrowSize * 0.75 * 100) / 100}" refX="${t.arrowSize - 1}" refY="${Math.round(t.arrowSize * 0.375 * 100) / 100}" markerWidth="${t.arrowSize}" markerHeight="${Math.round(t.arrowSize * 0.75 * 100) / 100}" orient="auto-start-reverse">${arrowHead(t)}</marker>`;
  return { defs, body: parts.join(''), edgePathIds, nodeIds };
}

// Store kinds read as vessels: cylinder body drawn inside the layout footprint
// (no layout change). Everything else is a rounded rect. Rule lives here with
// the geometry, not scattered at call sites.
const CYLINDER_KINDS = new Set(['database', 'storage']);

function cylinderBody(n: { x: number; y: number; w: number; h: number }, t: Theme): string {
  const rim = 8;
  const cx = n.x + n.w / 2;
  return (
    `<path d="M${n.x} ${n.y + rim} A${n.w / 2} ${rim} 0 0 1 ${n.x + n.w} ${n.y + rim} ` +
    `L${n.x + n.w} ${n.y + n.h - rim} A${n.w / 2} ${rim} 0 0 1 ${n.x} ${n.y + n.h - rim} Z" ` +
    `fill="${t.nodeFill}" stroke="${t.nodeBorder}" stroke-width="${t.nodeStroke}"/>` +
    `<ellipse cx="${cx}" cy="${n.y + rim}" rx="${n.w / 2}" ry="${rim}" fill="none" stroke="${t.nodeBorder}" stroke-width="${t.nodeStroke}"/>`
  );
}

// Node interior: icon + label row. Flattened icon, no nested <svg>.
function nodeBody(n: { x: number; y: number; w: number; h: number; kind: string }, short: string, t: Theme): string {
  const body =
    t.cylinderStores && CYLINDER_KINDS.has(n.kind)
      ? cylinderBody(n, t)
      : `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${t.nodeRadius}" fill="${t.nodeFill}" stroke="${t.nodeBorder}" stroke-width="${t.nodeStroke}"/>`;
  const label = escapeXmlText(short);
  const cx = n.x + 14 + 10;
  const cy = n.y + n.h / 2;
  return (
    `${body}` +
    `<g transform="translate(${cx},${cy}) scale(${t.iconScale}) translate(-12,-12)" color="${t.ink}">${iconFor(n.kind)}</g>` +
    `<text x="${n.x + 44}" y="${n.y + n.h / 2 + 4.5}" font-family="${FONT_UI}" font-size="${t.nodeLabelSize}" font-weight="${t.nodeLabelWeight}" fill="${t.ink}">${label}</text>`
  );
}

function arrowHead(t: Theme): string {
  if (t.arrowKind === 'chevron') {
    const s = t.arrowSize;
    const h = Math.round(s * 0.75 * 100) / 100;
    return `<path d="M1,${Math.round(h * 0.125 * 100) / 100} L${s - 1},${Math.round((h / 2) * 100) / 100} L1,${Math.round(h * 0.875 * 100) / 100}" fill="none" stroke="${t.edge}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<polygon points="0,0 ${t.arrowSize},${Math.round(t.arrowSize * 0.375 * 100) / 100} 0,${Math.round(t.arrowSize * 0.75 * 100) / 100}" fill="${t.edge}"/>`;
}
