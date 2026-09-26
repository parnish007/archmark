import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileAnimation } from '../../src/animation/ir.js';
import { MOTION_TOKENS } from '../../src/animation/tokens.js';
import { compile } from '../../src/core/compiler.js';
import { ElkLayout, toScene } from '../../src/core/layout.js';
import { planFlow } from '../../src/flow/plan.js';
import { compileTimeline } from '../../src/flow/timeline.js';
import { parse } from '../../src/language/parser.js';
import { IdScope, slugSvg } from '../../src/renderer/ids.js';
import { SmilRenderer } from '../../src/renderer/smil.js';

function need<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`test fixture missing ${what}`);
  return v;
}

function modelOf(src: string) {
  const { ast } = parse(src);
  const { model, diagnostics, fatal } = compile(ast);
  if (fatal) throw new Error(`fixture fatal: ${diagnostics.map((d) => d.message).join('; ')}`);
  return model;
}

const SRC = `actor user "User"\nservice api "API"\ndatabase db "PostgreSQL"\n\nuser -> api\napi -> db\n\nflow request {\n user -> api\n api -> db { type: write }\n}\n`;

describe('flow semantics', () => {
  it('rejects undeclared topology (AM3102)', () => {
    const { ast } = parse('service a "A"\nservice b "B"\nflow f {\n a -> b\n}\n');
    const { diagnostics, fatal } = compile(ast);
    expect(fatal).toBe(true);
    expect(diagnostics.some((d) => d.code === 'AM3102')).toBe(true);
  });
  it('expands request/write into semantic ops (no timing)', () => {
    const model = modelOf(SRC);
    const flow = need(model.flows[0], 'flow');
    const { plan, fatal } = planFlow(flow, model, 'system');
    expect(fatal).toBe(false);
    expect(plan.steps[0]?.ops).toEqual([
      { op: 'activate', node: 'user' },
      { op: 'traverse', edge: plan.steps[0]?.ops[1] && 'user--api', style: 'solid' },
      { op: 'pulse', node: 'api', style: 'receive' },
    ]);
    expect(plan.steps[1]?.ops[2]).toEqual({ op: 'pulse', node: 'db', style: 'store' });
    // No timing info leaks into the plan.
    expect(JSON.stringify(plan)).not.toMatch(/ms|dur|easing|svg|smil/i);
  });
  it('stable edge ids under input reorder', () => {
    const a = modelOf('service x "X"\nservice y "Y"\nx -> y\ny -> x\n')
      .edges.map((e) => e.id)
      .sort();
    const b = modelOf('service y "Y"\nservice x "X"\ny -> x\nx -> y\n')
      .edges.map((e) => e.id)
      .sort();
    expect(a).toEqual(b);
  });
  it('edge identity survives label changes and member removal', () => {
    const v1 = modelOf('service a "A"\nservice q "Q"\na -> q { label: "commands" }\na -> q { label: "events" }\n');
    const v2 = modelOf('service a "A"\nservice q "Q"\na -> q { label: "renamed" }\na -> q { label: "events" }\n');
    // Pair ordinals (not labels) determine identity: ids stable across renames.
    expect(v1.edges.map((e) => e.id)).toEqual(v2.edges.map((e) => e.id));
    const v3 = modelOf('service a "A"\nservice q "Q"\na -> q { label: "events" }\n');
    expect(v3.edges.map((e) => e.id)).toEqual(['a--q']);
  });
});

describe('timeline', () => {
  it('derives timing from motion tokens with chained deps', () => {
    const model = modelOf(SRC);
    const { plan } = planFlow(need(model.flows[0], 'flow'), model, 'system');
    const { timeline, fatal } = compileTimeline(plan);
    expect(fatal).toBe(false);
    expect(need(timeline.nodes[0], 'node')).toEqual({ id: 'request.s0.o0', startMs: 0, durMs: MOTION_TOKENS.activation.durMs, deps: [], line: 9 });
    expect(timeline.nodes[1]?.deps).toEqual(['request.s0.o0']);
    expect(timeline.totalMs).toBe(timeline.nodes.reduce((m, n) => Math.max(m, n.startMs + n.durMs), 0));
    expect(JSON.stringify(timeline)).not.toMatch(/svg|smil|mpath/i);
  });
  it('enforces step and event caps (AM3201/AM3203)', () => {
    const model = modelOf(SRC);
    const big = { ...need(model.flows[0], 'flow'), steps: Array.from({ length: 101 }, () => ({ from: 'user', to: 'api' as const })) };
    const r = planFlow(big as never, model, 'system');
    expect(r.fatal).toBe(true);
    expect(r.diagnostics.some((d) => d.code === 'AM3201')).toBe(true);
  });
});

describe('flow diagnostic positions (F-M-2)', () => {
  // Multiline flow; the invalid step is the LAST line. Diagnostics must point at the
  // step, not at the block head.
  const SRC_POS = 'service a "A"\nservice b "B"\nservice c "C"\na -> b\nb -> c\nflow f {\n a -> b\n b -> c\n c -> a\n}\n';
  it('invalid middle and last steps report their own lines', () => {
    const { ast } = parse(SRC_POS);
    const { diagnostics } = compile(ast);
    // c -> a undeclared (line 9): compiler AM3102 carries the step line.
    const d = diagnostics.find((x) => x.code === 'AM3102');
    expect(d?.line).toBe(9);
  });
  it('planFlow step diagnostics carry step lines, flow diagnostics carry the header', () => {
    const { ast } = parse('service a "A"\nservice b "B"\na -> b\nflow f {\n a -> b\n a -> nope\n}\n');
    const { model } = compile(ast);
    const flow = need(model.flows[0], 'flow');
    expect(flow.line).toBe(4);
    const { diagnostics } = planFlow(flow, model, 'system');
    const d = diagnostics.find((x) => x.code === 'AM3103');
    expect(d?.line).toBe(6);
  });
  it('first/middle/last plan steps keep their lines through timeline', () => {
    const { ast } = parse('service a "A"\nservice b "B"\nservice c "C"\na -> b\nb -> c\nc -> a\nflow f {\n a -> b\n b -> c\n c -> a\n}\n');
    const { model } = compile(ast);
    const { plan } = planFlow(need(model.flows[0], 'flow'), model, 'system');
    expect(plan.steps.map((s) => s.line)).toEqual([8, 9, 10]);
    const { timeline } = compileTimeline(plan);
    const firsts = [timeline.nodes[0], timeline.nodes[3], timeline.nodes[6]].map((n) => need(n, 'node').line);
    expect(firsts).toEqual([8, 9, 10]);
  });
});

describe('animation IR + SMIL', () => {
  it('compiles ops with tokens and renders verified-subset SMIL only', async () => {
    const model = modelOf(SRC);
    const { plan } = planFlow(need(model.flows[0], 'flow'), model, 'system');
    const { timeline } = compileTimeline(plan);
    const anim = compileAnimation(plan, timeline);
    expect(anim.ops.length).toBeGreaterThan(0);
    expect(anim.ops.every((o) => o.token in MOTION_TOKENS)).toBe(true);
    const placed = await new ElkLayout().layout(model);
    const scene = toScene(model, placed);
    const svg = new SmilRenderer().render(scene, anim, 'light');
    expect(svg).toContain('<animateMotion');
    expect(svg).toContain('<mpath href="#am-edge-');
    expect(svg).not.toMatch(/<script|onload|javascript:|foreignObject|<style/);
    // Static base present (first frame complete).
    expect(svg).toContain('role="img"');
  }, 30000);
  it('fades traverse heads, doubles fail rings, wires token easing', async () => {
    const model = modelOf(SRC);
    const { plan } = planFlow(need(model.flows[0], 'flow'), model, 'system');
    const { timeline } = compileTimeline(plan);
    const placed = await new ElkLayout().layout(model);
    const scene = toScene(model, placed);
    const svg = new SmilRenderer().render(scene, compileAnimation(plan, timeline), 'light');
    expect(svg).toMatch(/values="1;1;0"/); // packet fade-out (no parked dots)
    expect(svg).toMatch(/keySplines="0\.2 0 0 1/); // token easing wired
    // Hollow response + fail/recover redundancy via dedicated model:
    const m2 = modelOf(
      'service a "A"\nservice b "B"\na -> b\nb -> a\nflow f {\n a -> b { type: response }\n b -> a { type: failure }\n a -> b { type: recovery }\n}\n',
    );
    const { plan: p2 } = planFlow(need(m2.flows[0], 'flow'), m2, 'system');
    const { timeline: t2 } = compileTimeline(p2);
    const p2l = await new ElkLayout().layout(m2);
    const s2 = new SmilRenderer().render(toScene(m2, p2l), compileAnimation(p2, t2), 'light');
    expect(s2).toMatch(/fill="none" stroke="#[0-9A-Fa-f]{6}" stroke-width="2"/); // hollow response packet
    const failRings = (s2.match(/#C0392B/g) || []).length;
    expect(failRings).toBeGreaterThanOrEqual(2); // double ring, not color-only
    expect(s2).toMatch(/stroke-width="3"/); // thick recover ring
  }, 30000);
});

describe('settle semantics (timing-only, no renderer protocol)', () => {
  it('compileAnimation emits no settle ops; SVG has no settle comments', async () => {
    const model = modelOf(SRC);
    const { plan } = planFlow(need(model.flows[0], 'flow'), model, 'system');
    const { timeline } = compileTimeline(plan);
    expect(timeline.nodes.some((n) => n.id.endsWith('.settle'))).toBe(true); // timing covered
    expect(timeline.totalMs).toBeGreaterThan(0);
    const anim = compileAnimation(plan, timeline);
    expect(anim.ops.some((o) => o.style === 'settle' || o.token === 'settle')).toBe(false);
    const placed = await new ElkLayout().layout(model);
    const svg = new SmilRenderer().render(toScene(model, placed), anim, 'light');
    expect(svg).not.toMatch(/settle/);
  }, 30000);

  it('ambiguous duplicate-pair flow resolves deterministically to first sorted edge', () => {
    const model = modelOf('service a "A"\nservice q "Q"\na -> q\na -> q\nflow f {\n a -> q\n}\n');
    const { plan } = planFlow(need(model.flows[0], 'flow'), model, 'system');
    // Documented v0 semantic: first edge in (from,to,label) sorted order wins (never silent random).
    const traverse = need(plan.steps[0], 'step').ops.find((o) => o.op === 'traverse');
    expect(traverse).toBeDefined();
    if (traverse?.op === 'traverse') expect(traverse.edge).toBe('a--q');
  });
});

describe('svg id model', () => {
  it('sanitizes and namespaces deterministically with collision suffixes', () => {
    expect(slugSvg('a-b')).toBe('a-b');
    expect(slugSvg('a_b')).toBe('a-b'); // documented collision domain
    expect(slugSvg('9lives')).toMatch(/^n-/);
    const s1 = new IdScope('am');
    const a = s1.unique('edge', 'a-b');
    const b = s1.unique('edge', 'a_b');
    expect(a).not.toBe(b); // collision-safe via suffix
    const s2 = new IdScope('am');
    expect(s2.unique('edge', 'a-b')).toBe(a); // deterministic
    expect(a).toMatch(/^am-edge-[a-z0-9-]+$/);
  });
});

describe('no-glue boundaries', () => {
  const importsOf = (f: string) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .filter((l) => /^\s*import/.test(l))
      .join('\n');
  it('flow/timeline never import rendering; renderer never parses', () => {
    for (const f of ['src/flow/plan.ts', 'src/flow/timeline.ts', 'src/animation/ir.ts', 'src/animation/tokens.ts']) {
      expect(importsOf(f)).not.toMatch(/renderer|smil|scene-svg|markdown|\/cli/);
    }
    for (const f of ['src/renderer/smil.ts', 'src/renderer/svg.ts', 'src/renderer/scene-svg.ts']) {
      // No semantic logic imports: renderer consumes Scene/AnimationIR *data* and the shared
      // motion-token *timing table* via typed contracts — never plan/timeline compilers,
      // parsers, or markdown. (animation/tokens has zero imports: pure data.)
      expect(importsOf(f)).not.toMatch(/language\/|markdown\/|flow\/plan|flow\/timeline/);
      const t = readFileSync(f, 'utf8');
      expect(t).not.toMatch(/planFlow|compileTimeline|compileAnimation|[^.]parse\(/);
    }
    expect(importsOf('src/language/parser.ts')).not.toMatch(/renderer|svg|smil|markdown|flow|animation/);
  });
});
