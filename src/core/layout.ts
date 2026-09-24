// LayoutEngine abstraction (ELK behind interface) + SceneGraph conversion.
// elkjs ships CJS with a default-exported constructor; NodeNext interop
// resolves it as a namespace in some configs, so handle both shapes.
import ElkModule from 'elkjs';
import type { ArchModel } from './ir.js';

export interface PlacedNode { id: string; x: number; y: number; w: number; h: number }
export interface PlacedEdge { id: string; points: { x: number; y: number }[] }
export interface PlacedGraph { w: number; h: number; nodes: PlacedNode[]; edges: PlacedEdge[] }
export interface LayoutEngine { layout(model: ArchModel, opts?: { timeoutMs?: number }): Promise<PlacedGraph> }

export function measureNode(label: string): { w: number; h: number } {
  // Deterministic headless measure: CJK/emoji ~1.8×, ellipsis included.
  const segs = [...label].slice(0, 22);
  let units = 0;
  for (const ch of segs) units += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(ch) ? 1.8 : 1;
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
    const children = [...model.nodes].sort((a, b) => a.id.localeCompare(b.id)).map(n => {
      const { w, h } = measureNode(n.label);
      return { id: n.id, width: w, height: h };
    });
    // Skip self-edges in ELK input (drawn as loops by renderer); ELK cannot route them.
    const edges = [...model.edges].filter(e => e.from !== e.to).sort((a, b) => a.id.localeCompare(b.id)).map(e => ({
      id: e.id, sources: [e.from], targets: [e.to],
    }));
    const layoutP = this.elk.layout({
      id: 'root', layoutOptions: {
        'elk.algorithm': 'layered', 'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '48', 'elk.layered.spacing.nodeNodeBetweenLayers': '72',
        'elk.edgeRouting': 'ORTHOGONAL', 'org.eclipse.elk.randomSeed': '42',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      },
      children, edges,
    } as never) as Promise<{ width?: number; height?: number; children?: { id: string; x?: number; y?: number; width?: number; height?: number }[]; edges?: { id: string; sections?: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; bendPoints?: { x: number; y: number }[] }[] }[] }>;
    const g = await Promise.race([
      layoutP,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`ELK layout timed out after ${timeoutMs}ms`)), timeoutMs)),
    ]);
    const nodes: PlacedNode[] = (g.children ?? []).map(c => ({
      id: c.id, x: Math.round((c.x ?? 0) * 100) / 100, y: Math.round((c.y ?? 0) * 100) / 100,
      w: c.width ?? 140, h: c.height ?? 60,
    }));
    const pedges: PlacedEdge[] = (g.edges ?? []).map(e => {
      const s = e.sections?.[0];
      const pts = s ? [s.startPoint, ...(s.bendPoints ?? []), s.endPoint] : [{ x: 0, y: 0 }];
      return { id: e.id, points: pts.map(p => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })) };
    });
    // Canvas: bounding box + padding, snapped to 8px grid.
    let maxX = 0; let maxY = 0;
    for (const n of nodes) { maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h); }
    const snap = (v: number) => Math.ceil(v / 8) * 8;
    return { w: snap(maxX + 48), h: snap(maxY + 48), nodes, edges: pedges };
  }
}

// SceneGraph: renderer input (grid-snapped, sorted, 2dp).
export interface SceneNode { id: string; kind: string; label: string; x: number; y: number; w: number; h: number }
export interface SceneEdge { id: string; from: string; to: string; label?: string; d: string }
export interface Scene { w: number; h: number; nodes: SceneNode[]; edges: SceneEdge[]; title?: string }

function edgePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  // Orthogonal: ELK already returns H/V segments; emit M/L, round 2dp.
  const r = (v: number) => Math.round(v * 100) / 100;
  return 'M' + pts.map(p => `${r(p.x)} ${r(p.y)}`).join(' L');
}

export function toScene(model: ArchModel, placed: PlacedGraph, title?: string): Scene {
  const byId = new Map(placed.nodes.map(n => [n.id, n]));
  const nodes: SceneNode[] = [...model.nodes].sort((a, b) => a.id.localeCompare(b.id)).map(n => {
    const p = byId.get(n.id) ?? { x: 0, y: 0, w: 140, h: 60 };
    return { id: n.id, kind: n.kind, label: n.label, x: p.x, y: p.y, w: p.w, h: p.h };
  });
  const pe = new Map(placed.edges.map(e => [e.id, e]));
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const edges: SceneEdge[] = [...model.edges].sort((a, b) => a.id.localeCompare(b.id)).map(e => {
    const pts = pe.get(e.id)?.points;
    let d = edgePath(pts ?? []);
    if (e.from === e.to) {
      // Explicit loop on right side; ELK skipped self-edges.
      const n = nodeById.get(e.from) ?? { x: 0, y: 0, w: 140, h: 60 };
      const x = n.x + n.w; const y = n.y + n.h / 2;
      d = `M${r2(x)} ${r2(y - 10)} L${r2(x + 18)} ${r2(y - 10)} L${r2(x + 18)} ${r2(y + 10)} L${r2(x)} ${r2(y + 10)}`;
    }
    return { id: e.id, from: e.from, to: e.to, ...(e.label ? { label: e.label } : {}), d };
  });
  return { w: placed.w, h: placed.h, nodes, edges, ...(title ? { title } : {}) };
}
function r2(v: number): number { return Math.round(v * 100) / 100; }
