// LayoutEngine abstraction (ELK behind interface) + SceneGraph conversion.
// elkjs ships CJS with a default-exported constructor; NodeNext interop
// resolves it as a namespace in some configs, so handle both shapes.
import ElkModule from 'elkjs';
import type { ArchModel } from './ir.js';

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface PlacedEdge {
  id: string;
  points: { x: number; y: number }[];
}
export interface PlacedGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  truthful: boolean;
}
export interface PlacedGraph {
  w: number;
  h: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  groups: PlacedGroup[];
}
export interface LayoutEngine {
  layout(model: ArchModel, opts?: { timeoutMs?: number }): Promise<PlacedGraph>;
}
export class LayoutError extends Error {}

// Compound group padding (deterministic): label band 40 top, 24 elsewhere.
const GROUP_PAD = { top: 40, left: 24, bottom: 24, right: 24 };

export function measureNode(label: string): { w: number; h: number } {
  // Deterministic headless measure: CJK/emoji ~1.8×, ellipsis included.
  const segs = [...label].slice(0, 22);
  let units = 0;
  for (const ch of segs)
    units += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(ch) ? 1.8 : 1;
  const w = Math.max(140, 44 + units * 7.2 + 24);
  return { w: Math.round(w), h: 60 };
}

export class ElkLayout implements LayoutEngine {
  private elk: { layout: (g: never, args?: never) => Promise<never> };
  constructor() {
    const Ctor = (ElkModule as unknown as { default?: unknown })?.default ?? ElkModule;
    const C = Ctor as unknown as new (args?: unknown) => { layout: (g: never, args?: never) => Promise<never> };
    this.elk = new C();
  }
  async layout(model: ArchModel, opts: { timeoutMs?: number } = {}): Promise<PlacedGraph> {
    const timeoutMs = opts.timeoutMs ?? 10000;
    // Partition check P1: members belong to exactly one group (compiler guarantees single membership
    // structurally; verify defensively since truthfulness depends on it).
    const memberOf = new Map<string, string>();
    for (const g of model.groups) {
      if (g.members.length === 0) throw new LayoutError(`Group "${g.id}" is empty; declare members or remove it.`);
      for (const m of g.members) {
        const prev = memberOf.get(m);
        if (prev) throw new LayoutError(`Node "${m}" is in groups "${prev}" and "${g.id}"; v0 supports one group per node.`);
        memberOf.set(m, g.id);
      }
    }
    const sizeOf = (label: string) => {
      const { w, h } = measureNode(label);
      return { width: w, height: h };
    };
    const byId = new Map(model.nodes.map((n) => [n.id, n]));
    const leaf = (id: string) => ({ id, ...sizeOf(byId.get(id)?.label ?? id) });
    const grouped = new Set(memberOf.keys());
    // ELK compound tree: groups become container nodes; members parent-relative.
    interface ElkN {
      id: string;
      width?: number;
      height?: number;
      children?: ElkN[];
      layoutOptions?: Record<string, string>;
    }
    const groupNodes: ElkN[] = [...model.groups]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((g) => ({
        id: `__group__${g.id}`,
        children: [...g.members].sort().map(leaf),
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.padding': `[top=${GROUP_PAD.top},left=${GROUP_PAD.left},bottom=${GROUP_PAD.bottom},right=${GROUP_PAD.right}]`,
          'elk.edgeRouting': 'ORTHOGONAL',
        },
      }));
    const rootChildren: ElkN[] = [
      ...[...model.nodes]
        .filter((n) => !grouped.has(n.id))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((n) => leaf(n.id)),
      ...groupNodes,
    ];
    // Skip self-edges in ELK input (drawn as loops by renderer); ELK cannot route them.
    const elkEdges = [...model.edges]
      .filter((e) => e.from !== e.to)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((e) => ({
        id: e.id,
        sources: [e.from],
        targets: [e.to],
      }));
    const layoutP = this.elk.layout({
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        'elk.spacing.nodeNode': '48',
        'elk.layered.spacing.nodeNodeBetweenLayers': '72',
        'elk.edgeRouting': 'ORTHOGONAL',
        'org.eclipse.elk.randomSeed': '42',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      },
      children: rootChildren,
      edges: elkEdges,
    } as never) as Promise<{ width?: number; height?: number; children?: ElkOut[]; edges?: ElkEdgeOut[] }>;
    // Timeout is fail-closed abandonment, NOT hard cancellation: on expiry we reject while the
    // underlying ELK promise may still settle later (its result is then ignored). Timer is cleared on
    // success to avoid leakage. True cancellation (worker/child isolation) is deferred — see ADR.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutP = new Promise<never>((_, rej) => {
      timer = setTimeout(() => rej(new Error(`ELK layout timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    // Prevent unhandled rejection noise if ELK settles after we abandoned it.
    layoutP.then(
      () => {
        if (timer) clearTimeout(timer);
      },
      () => {
        if (timer) clearTimeout(timer);
      },
    );
    const g = await Promise.race([layoutP, timeoutP]);
    if (timer) clearTimeout(timer);
    const r1 = (v: number | undefined) => Math.round((v ?? 0) * 100) / 100;
    // Flatten compound tree: member coords are parent-relative → accumulate offsets.
    // Edge sections are consumed as returned (absolute per ELK); P5/P6 gates verify truthfulness.
    const nodes: PlacedNode[] = [];
    const groups: PlacedGroup[] = [];
    const groupByElkId = new Map(model.groups.map((x) => [`__group__${x.id}`, x]));
    const walk = (kids: ElkOut[] | undefined, ox: number, oy: number) => {
      for (const c of kids ?? []) {
        const gx = groupByElkId.get(c.id);
        if (gx) {
          const ax = ox + (c.x ?? 0);
          const ay = oy + (c.y ?? 0);
          if (c.width === undefined || c.height === undefined) {
            throw new LayoutError(`Group "${gx.id}" has no size from layout; refusing false grouping.`);
          }
          groups.push({ id: gx.id, label: gx.label, x: r1(ax), y: r1(ay), w: r1(c.width), h: r1(c.height), truthful: true });
          walk(c.children, ax, ay);
        } else {
          nodes.push({ id: c.id, x: r1(ox + (c.x ?? 0)), y: r1(oy + (c.y ?? 0)), w: c.width ?? 140, h: c.height ?? 60 });
        }
      }
    };
    walk(g.children, 0, 0);
    const pedges: PlacedEdge[] = (g.edges ?? []).map((e) => {
      // Hierarchical ELK edges can return MULTIPLE sections; concatenate only when joints
      // meet (end[i] == start[i+1] within epsilon). Disjoint sections would draw false
      // topology, so they fail closed instead.
      const sections = e.sections ?? [];
      if (sections.length === 0) throw new LayoutError(`Edge "${e.id}" has no geometry from layout.`);
      const pts: { x: number; y: number }[] = [];
      sections.forEach((s, i) => {
        const chain: { x: number; y: number }[] = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint];
        if (i > 0) {
          const prev = pts[pts.length - 1] as { x: number; y: number };
          const joint = chain[0] as { x: number; y: number };
          if (Math.hypot(joint.x - prev.x, joint.y - prev.y) > 0.5) {
            throw new LayoutError(`Edge "${e.id}" has disjoint route sections; refusing false path.`);
          }
          chain.shift();
        }
        pts.push(...chain);
      });
      return { id: e.id, points: pts.map((p) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })) };
    });
    // Float validation: no NaN/Infinity/non-positive dimensions reach the scene graph.
    // Missing nodes or corrupt geometry fail closed — never a plausible false diagram.
    for (const n of [...nodes, ...groups]) {
      for (const v of [n.x, n.y, n.w, n.h]) {
        if (!Number.isFinite(v)) throw new LayoutError(`Non-finite geometry for "${n.id}"; refusing corrupt layout.`);
      }
      if (n.w <= 0 || n.h <= 0) throw new LayoutError(`Non-positive size for "${n.id}"; refusing corrupt layout.`);
      for (const v of [n.x, n.y, n.w, n.h]) {
        if (Math.abs(v) > 1e6) throw new LayoutError(`Geometry magnitude overflow for "${n.id}"; refusing corrupt layout.`);
      }
    }
    for (const e of pedges) {
      for (const p of e.points) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 1e6 || Math.abs(p.y) > 1e6) {
          throw new LayoutError(`Non-finite path geometry for edge "${e.id}"; refusing corrupt layout.`);
        }
      }
    }
    // Invariant gates P5/P6 (fail-closed truthfulness): members strictly inside group rect;
    // no nonmember center inside any group rect. Violation → LayoutError (build fails, no false render).
    {
      const nodeById = new Map(nodes.map((n) => [n.id, n]));
      const memberSet = new Set<string>();
      for (const gr of model.groups) for (const m of gr.members) memberSet.add(m);
      for (const gr of model.groups) {
        const pg = groups.find((x) => x.id === gr.id);
        if (!pg) throw new LayoutError(`Group "${gr.id}" missing from layout output.`);
        for (const m of gr.members) {
          const n = nodeById.get(m);
          if (!n) throw new LayoutError(`Group member "${m}" missing from layout output.`);
          if (!(n.x >= pg.x - 1 && n.y >= pg.y - 1 && n.x + n.w <= pg.x + pg.w + 1 && n.y + n.h <= pg.y + pg.h + 1)) {
            throw new LayoutError(`Group "${gr.id}" does not contain member "${m}"; refusing false grouping.`);
          }
        }
      }
      for (const n of nodes) {
        if (memberSet.has(n.id)) continue;
        const cx = n.x + n.w / 2;
        const cy = n.y + n.h / 2;
        for (const pg of groups) {
          if (cx > pg.x && cx < pg.x + pg.w && cy > pg.y && cy < pg.y + pg.h) {
            throw new LayoutError(`Nonmember "${n.id}" falls inside group "${pg.id}"; refusing false grouping.`);
          }
          // Area overlap invariant (stronger than center): a nonmember rectangle must not
          // significantly overlap a group even when its center lies outside.
          const ix = Math.max(0, Math.min(n.x + n.w, pg.x + pg.w) - Math.max(n.x, pg.x));
          const iy = Math.max(0, Math.min(n.y + n.h, pg.y + pg.h) - Math.max(n.y, pg.y));
          const overlap = ix * iy;
          const denom = Math.min(n.w * n.h, pg.w * pg.h);
          if (denom > 0 && overlap / denom >= 0.05) {
            throw new LayoutError(
              `Nonmember "${n.id}" overlaps group "${pg.id}" by ${Math.round((overlap / denom) * 100)}%; refusing false grouping.`,
            );
          }
        }
      }
    }
    // Canvas: bounding box over nodes AND groups (ELK may emit negative coords),
    // shifted to a non-negative origin, padded, snapped to 8px grid.
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    for (const gr of groups) {
      minX = Math.min(minX, gr.x);
      minY = Math.min(minY, gr.y);
      maxX = Math.max(maxX, gr.x + gr.w);
      maxY = Math.max(maxY, gr.y + gr.h);
    }
    const ox = minX < 0 ? -minX : 0;
    const oy = minY < 0 ? -minY : 0;
    if (ox !== 0 || oy !== 0) {
      for (const n of nodes) {
        n.x = Math.round((n.x + ox) * 100) / 100;
        n.y = Math.round((n.y + oy) * 100) / 100;
      }
      for (const gr of groups) {
        gr.x = Math.round((gr.x + ox) * 100) / 100;
        gr.y = Math.round((gr.y + oy) * 100) / 100;
      }
      for (const e of pedges) {
        for (const p of e.points) {
          p.x = Math.round((p.x + ox) * 100) / 100;
          p.y = Math.round((p.y + oy) * 100) / 100;
        }
      }
      maxX += ox;
      maxY += oy;
    }
    const snap = (v: number) => Math.ceil(v / 8) * 8;
    return { w: snap(maxX + 48), h: snap(maxY + 48), nodes, edges: pedges, groups };
  }
}

interface ElkOut {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkOut[];
}
interface ElkEdgeOut {
  id: string;
  sections?: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; bendPoints?: { x: number; y: number }[] }[];
}

// SceneGraph: renderer input (grid-snapped, sorted, 2dp).
export interface SceneNode {
  id: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface SceneEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  d: string;
}
export interface SceneGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  truthful: boolean;
}
export interface Scene {
  w: number;
  h: number;
  nodes: SceneNode[];
  edges: SceneEdge[];
  groups: SceneGroup[];
  title?: string;
}

function edgePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  // Orthogonal: ELK already returns H/V segments; emit M/L, round 2dp.
  const r = (v: number) => Math.round(v * 100) / 100;
  return `M${pts.map((p) => `${r(p.x)} ${r(p.y)}`).join(' L')}`;
}

export function toScene(model: ArchModel, placed: PlacedGraph, title?: string): Scene {
  const byId = new Map(placed.nodes.map((n) => [n.id, n]));
  const nodes: SceneNode[] = [...model.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => {
      // No zero-coordinate fallback: a missing placed node is corrupt layout, fail closed.
      const p = byId.get(n.id);
      if (!p) throw new LayoutError(`Node "${n.id}" missing from layout output.`);
      for (const v of [p.x, p.y, p.w, p.h]) {
        if (!Number.isFinite(v)) throw new LayoutError(`Non-finite geometry for node "${n.id}".`);
      }
      if (p.w <= 0 || p.h <= 0) throw new LayoutError(`Non-positive size for node "${n.id}".`);
      return { id: n.id, kind: n.kind, label: n.label, x: p.x, y: p.y, w: p.w, h: p.h };
    });
  const pe = new Map(placed.edges.map((e) => [e.id, e]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges: SceneEdge[] = [...model.edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => {
      const pts = pe.get(e.id)?.points;
      let d = edgePath(pts ?? []);
      if (e.from === e.to) {
        // Explicit loop on right side; ELK skipped self-edges.
        const n = nodeById.get(e.from) ?? { x: 0, y: 0, w: 140, h: 60 };
        const x = n.x + n.w;
        const y = n.y + n.h / 2;
        d = `M${r2(x)} ${r2(y - 10)} L${r2(x + 18)} ${r2(y - 10)} L${r2(x + 18)} ${r2(y + 10)} L${r2(x)} ${r2(y + 10)}`;
      }
      return { id: e.id, from: e.from, to: e.to, ...(e.label ? { label: e.label } : {}), d };
    });
  // Groups come from ELK compound output (truthful by construction, P5/P6 gated).
  // truthful=false is reserved for future suppressed rendering; layout never emits it today
  // (violations throw LayoutError instead of rendering false grouping).
  const groups: SceneGroup[] = [...placed.groups]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((g) => ({
      id: g.id,
      label: g.label,
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
      truthful: g.truthful,
    }));
  // Expand canvas to include groups.
  let gw = placed.w;
  let gh = placed.h;
  for (const g of groups) {
    gw = Math.max(gw, g.x + g.w + 24);
    gh = Math.max(gh, g.y + g.h + 24);
  }
  const snap2 = (v: number) => Math.ceil(v / 8) * 8;
  return { w: snap2(gw), h: snap2(gh), nodes, edges, groups, ...(title ? { title } : {}) };
}
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}
