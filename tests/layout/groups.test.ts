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
