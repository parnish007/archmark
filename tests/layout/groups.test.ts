import { describe, it, expect } from 'vitest';
import { parse } from '../../src/language/parser.js';
import { compile } from '../../src/core/compiler.js';
import { ElkLayout, toScene } from '../../src/core/layout.js';

function need<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`test fixture missing ${what}`);
  return v;
}

function build(src: string) {
  const { ast } = parse(src);
  const { model, diagnostics, fatal } = compile(ast);
  return { model, diagnostics, fatal };
}

describe('group truthfulness (adversarial)', () => {
  it('nonmember between members is not enclosed (H1b)', async () => {
    const src = 'service b "B"\ngroup g "G" {\nservice a "A"\nservice c "C"\n}\na -> b\nb -> c\n';
    const { model, fatal } = build(src);
    expect(fatal).toBe(false);
    const placed = await new ElkLayout().layout(model);
    const scene = toScene(model, placed);
    const g = need(scene.groups[0], 'group');
    const b = need(
      scene.nodes.find((n) => n.id === 'b'),
      'node b',
    );
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const inside = cx > g.x && cx < g.x + g.w && cy > g.y && cy < g.y + g.h;
    expect(inside).toBe(false);
    for (const m of ['a', 'c']) {
      const n = need(
        scene.nodes.find((x) => x.id === m),
        `node ${m}`,
      );
      expect(n.x).toBeGreaterThanOrEqual(g.x - 1);
      expect(n.x + n.w).toBeLessThanOrEqual(g.x + g.w + 1);
    }
  }, 30000);

  it('duplicate ids across group boundary flagged (H1)', () => {
    const src = 'service a "A"\nservice b "B"\nservice c "C"\ngroup g "G" {\nservice a "A"\nservice c "C"\n}\na -> b\nb -> c\n';
    const { ast } = parse(src);
    expect(ast.components.map((c) => c.id)).toContain('a');
    const { diagnostics } = compile(ast);
    expect(diagnostics.some((d) => d.code === 'AM1001')).toBe(true);
  });

  it('parallel duplicate edges get distinct stable ids (H2)', () => {
    const { model } = build('service a "A"\nservice q "Q"\na -> q\na -> q\n');
    const ids = model.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('a--q');
    expect(ids).toContain('a--q#2');
  });

  it('architecture cycles lay out (H4), self-loops draw (H5)', async () => {
    const cyc = build('service a "A"\nservice b "B"\na -> b\nb -> a\n');
    expect(cyc.fatal).toBe(false);
    const p = await new ElkLayout().layout(cyc.model);
    expect(p.nodes.length).toBe(2);
    const self = build('service a "A"\na -> a\n');
    const ps = await new ElkLayout().layout(self.model);
    const ss = toScene(self.model, ps);
    expect(need(ss.edges[0], 'edge').d.startsWith('M')).toBe(true);
  }, 30000);

  it('stress: 3 siblings, cross-boundary cycle, self-edge, solo member (round 2)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('fixtures/groups-stress.archmark', 'utf8');
    const { model, fatal } = build(src);
    expect(fatal).toBe(false);
    const placed = await new ElkLayout().layout(model);
    const scene = toScene(model, placed);
    // Invariants hold on output: every group truthful, members inside, overlap <5%.
    expect(scene.groups.length).toBe(3);
    for (const g of scene.groups) {
      expect(g.truthful).toBe(true);
      expect(Number.isFinite(g.x + g.y + g.w + g.h)).toBe(true);
      expect(g.w).toBeGreaterThan(0);
    }
    const byId = new Map(scene.nodes.map((n) => [n.id, n]));
    const members: Record<string, string[]> = { alpha: ['a1', 'a2'], beta: ['b1'], gamma: ['g1'] };
    for (const g of scene.groups) {
      for (const m of members[g.id] ?? []) {
        const n = need(byId.get(m), m);
        expect(n.x).toBeGreaterThanOrEqual(g.x - 1);
        expect(n.x + n.w).toBeLessThanOrEqual(g.x + g.w + 1);
      }
    }
    // Nonmember 'edge' and 'shared' must not significantly overlap any group.
    for (const id of ['edge', 'shared']) {
      const n = need(byId.get(id), id);
      for (const g of scene.groups) {
        const ix = Math.max(0, Math.min(n.x + n.w, g.x + g.w) - Math.max(n.x, g.x));
        const iy = Math.max(0, Math.min(n.y + n.h, g.y + g.h) - Math.max(n.y, g.y));
        const frac = (ix * iy) / Math.min(n.w * n.h, g.w * g.h);
        expect(frac).toBeLessThan(0.05);
      }
    }
  }, 60000);
});

describe('layout internal identity namespace (F-B-1)', () => {
  // Semantic IDs that resemble (or equal) internal layout identities must lay out
  // truthfully. Semantic IDs are NEVER modified; only the layout adapter remaps.
  const CASES: [string, string][] = [
    ['node collides with group container id', 'service __group__p "Ghost"\ngroup p "P" {\nservice w "W"\n}\n__group__p -> w\n'],
    [
      'node resembles group container of another group',
      'service __group__backend "X"\ngroup backend "B" {\nservice v "V"\n}\n__group__backend -> v\n',
    ],
    ['node resembles node-namespace prefix', 'service __node__x "X"\nservice y "Y"\n__node__x -> y\n'],
    ['plain reserved-looking words', 'service group "G"\nservice node "N"\nservice root "R"\ngroup -> node\nnode -> root\n'],
    [
      'dunder edge cases',
      'service __root__ "R"\nservice _group "G"\nservice ___ "U"\nservice node_group "NG"\nservice group_node "GN"\n__root__ -> _group\n_group -> ___\n___ -> node_group\nnode_group -> group_node\n',
    ],
    [
      'single letters incl. kind initials',
      'service A "A"\nservice a "a"\nservice n "n"\nservice g "g"\nservice e "e"\nA -> a\na -> n\nn -> g\ng -> e\n',
    ],
    ['group id that looks like a node id', 'service u "U"\ngroup w "WG" {\nservice v "V"\n}\nu -> v\n'],
  ];
  for (const [name, src] of CASES) {
    it(`lays out truthfully: ${name}`, async () => {
      const { model, fatal } = build(src);
      expect(fatal).toBe(false);
      const placed = await new ElkLayout().layout(model);
      // Every semantic node id survives layout untouched (no renaming, no loss).
      const wantNodes = new Set(model.nodes.map((n) => n.id));
      const gotNodes = new Set(placed.nodes.map((n) => n.id));
      expect(gotNodes).toEqual(wantNodes);
      // Every group survives with its semantic id and contains exactly its members.
      expect(new Set(placed.groups.map((g) => g.id))).toEqual(new Set(model.groups.map((g) => g.id)));
      const scene = toScene(model, placed);
      expect(scene.groups.every((g) => g.truthful)).toBe(true);
    }, 30000);
  }

  it('member ids resembling group ids stay with their own group', async () => {
    const src =
      'group alpha "A" {\nservice __group__beta "M"\n}\ngroup beta "B" {\nservice v "V"\n}\nservice solo "S"\n__group__beta -> v\nv -> solo\n';
    const { model, fatal } = build(src);
    expect(fatal).toBe(false);
    const placed = await new ElkLayout().layout(model);
    const scene = toScene(model, placed);
    const byId = new Map(scene.nodes.map((n) => [n.id, n]));
    const alpha = need(
      scene.groups.find((g) => g.id === 'alpha'),
      'alpha',
    );
    const m = need(byId.get('__group__beta'), 'member');
    expect(m.x).toBeGreaterThanOrEqual(alpha.x - 1);
    expect(m.x + m.w).toBeLessThanOrEqual(alpha.x + alpha.w + 1);
  }, 30000);

  it('intra-group edges terminate on their endpoint nodes (H6)', async () => {
    // Regression: ELK expresses same-group edge sections group-relative; without
    // LCA translation they rendered at unrelated positions (false diagram).
    const src = 'group g "G" {\nservice a "A"\nservice b "B"\n}\na -> b\n';
    const { model, fatal } = build(src);
    expect(fatal).toBe(false);
    const placed = await new ElkLayout().layout(model);
    const scene = toScene(model, placed);
    const edge = need(
      scene.edges.find((e) => e.id === 'a--b'),
      'edge a--b',
    );
    const pts = edge.d
      .replace(/^M/, '')
      .split('L')
      .map((s) => s.trim().split(/\s+/).map(Number));
    const onNode = (p: number[], id: string): boolean => {
      const n = need(
        scene.nodes.find((x) => x.id === id),
        `node ${id}`,
      );
      return (
        (p[0] as number) >= n.x - 2 && (p[0] as number) <= n.x + n.w + 2 && (p[1] as number) >= n.y - 2 && (p[1] as number) <= n.y + n.h + 2
      );
    };
    expect(onNode(need(pts[0], 'first'), 'a')).toBe(true);
    expect(onNode(need(pts[pts.length - 1], 'last'), 'b')).toBe(true);
  }, 30000);
});
