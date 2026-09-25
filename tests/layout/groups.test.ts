import { describe, it, expect } from 'vitest';
import { parse } from '../../src/language/parser.js';
import { compile } from '../../src/core/compiler.js';
import { ElkLayout, toScene } from '../../src/core/layout.js';

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
    const g = scene.groups[0]!;
    const b = scene.nodes.find((n) => n.id === 'b')!;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const inside = cx > g.x && cx < g.x + g.w && cy > g.y && cy < g.y + g.h;
    expect(inside).toBe(false);
    for (const m of ['a', 'c']) {
      const n = scene.nodes.find((x) => x.id === m)!;
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
    expect(ss.edges[0]!.d.startsWith('M')).toBe(true);
  }, 30000);
});
