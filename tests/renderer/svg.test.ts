import { describe, it, expect } from 'vitest';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parse } from '../../src/language/parser.js';
import { compile } from '../../src/core/compiler.js';
import { ElkLayout, toScene } from '../../src/core/layout.js';
import { planFlow } from '../../src/flow/plan.js';
import { compileTimeline } from '../../src/flow/timeline.js';
import { compileAnimation } from '../../src/animation/ir.js';
import { SmilRenderer } from '../../src/renderer/smil.js';
import { renderStatic } from '../../src/renderer/svg.js';

function need<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`test fixture missing ${what}`);
  return v;
}

const SRC = `actor user "User"\nservice api "API"\ndatabase db "PostgreSQL"\n\ngroup prod "Production" {\nservice api "API"\ndatabase db "PostgreSQL"\n}\nuser -> api\napi -> db\n\nflow request {\n user -> api\n api -> db { type: write }\n}\n`;

async function built() {
  const { ast } = parse(SRC);
  const { model } = compile(ast);
  const placed = await new ElkLayout().layout(model);
  const scene = toScene(model, placed);
  const flow = need(model.flows[0], 'flow');
  const { plan } = planFlow(flow, model, 'system');
  const { timeline } = compileTimeline(plan);
  const anim = compileAnimation(plan, timeline);
  return {
    stat: renderStatic(scene, 'light'),
    statDark: renderStatic(scene, 'dark'),
    animated: new SmilRenderer().render(scene, anim, 'light'),
  };
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@' });

function refs(svg: string): { ids: string[]; hrefs: string[]; begins: string[]; arias: string[] } {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] as string);
  const hrefs = [...svg.matchAll(/(?:href|xlink:href)="#([^"]+)"/g)].map((m) => m[1] as string);
  const begins = [...svg.matchAll(/\sbegin="([^"\s]+)"/g)]
    .map((m) => m[1] as string)
    .filter((b) => !/^[0-9.]+m?s$/.test(b) && b !== 'indefinite');
  const arias = [...svg.matchAll(/aria-labelledby="([^"]+)"/g)].flatMap((m) => (m[1] as string).split(/\s+/));
  return { ids, hrefs, begins, arias };
}

describe('xml structural validation', () => {
  it('static + animated outputs are well-formed XML with resolving references', async () => {
    const { stat, statDark, animated } = await built();
    for (const [name, svg] of Object.entries({ stat, statDark, animated })) {
      expect(XMLValidator.validate(svg), name).toBe(true);
      parser.parse(svg); // throws on malformed
      const { ids, hrefs, begins, arias } = refs(svg);
      expect(new Set(ids).size, `${name} duplicate ids`).toBe(ids.length);
      for (const h of hrefs) expect(ids, `${name} dangling #${h}`).toContain(h);
      for (const a of arias) expect(ids, `${name} dangling aria ${a}`).toContain(a);
      void begins; // begin values are absolute ms or chained ids; chained ids resolve below
    }
    // Chained begin references (e.g. "csend.end") resolve to an existing animation element id.
    // Generated output uses absolute ms begins; assert no id-style begins dangle.
    const { begins } = refs(animated);
    const animIds = [...animated.matchAll(/\s(id)="([^"]+)"/g)].map((m) => m[2] as string);
    for (const b of begins) {
      const base = b.replace(/\.end$|\.begin$/, '');
      if (!/^[0-9]/.test(b)) expect(animIds, `dangling begin ${b}`).toContain(base);
    }
  }, 30000);
});

describe('visual semantic invariants (theme-independent)', () => {
  it('request solid / static fallback complete', async () => {
    const { animated, stat } = await built();
    expect(animated).toMatch(/<circle r="6" fill="#[0-9A-Fa-f]{6}"/);
    expect(stat).not.toMatch(/animateMotion|<animate /);
    expect(stat).toContain('role="img"');
  }, 30000);

  it('fail/recover distinguishable with all color removed (monochrome)', async () => {
    const src = 'service a "A"\nservice b "B"\na -> b\nb -> a\nflow f {\n b -> a { type: failure }\n a -> b { type: recovery }\n}\n';
    const { ast } = parse(src);
    const { model } = compile(ast);
    const placed = await new ElkLayout().layout(model);
    const scene = toScene(model, placed);
    const flow = need(model.flows[0], 'flow');
    const { plan } = planFlow(flow, model, 'system');
    const { timeline } = compileTimeline(plan);
    const svg = new SmilRenderer().render(scene, compileAnimation(plan, timeline), 'light');
    const mono = svg.replace(/#[0-9A-Fa-f]{6}/g, '#808080');
    // Fail = TWO rings (second echo at 1.5px), recover = ONE thick ring (3px): geometry differs.
    const rings3px = (mono.match(/stroke-width="3"/g) || []).length;
    const rings15px = (mono.match(/stroke-width="1\.5"/g) || []).length;
    expect(rings3px).toBeGreaterThanOrEqual(1); // thick recover ring
    expect(rings15px).toBeGreaterThanOrEqual(1); // fail echo ring (1.5px) proves double-ring
  }, 30000);
});

describe('scene label graphemes (F-NEW-3)', () => {
  it('long emoji/ZWJ/combining labels truncate without splitting graphemes', async () => {
    // 25 party + family (1 grapheme) + precomposed é + e+combining-acute + b = 29 graphemes > 22.
    const label = `${'🎉'.repeat(25)}👨‍👩‍👧‍👦ééb`;
    const src = `service a "${label}"\nservice b "B"\na -> b\n`;
    const { ast } = parse(src);
    const { model } = compile(ast);
    const placed = await new ElkLayout().layout(model);
    const svg = renderStatic(toScene(model, placed), 'light');
    // Extract rendered node label text (escaped) and assert no lone surrogates / dangling marks.
    const texts = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1] as string);
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
      expect(t).not.toMatch(/[\u200D]…$/); // no dangling joiner before ellipsis
    }
    expect(texts.some((t) => t.endsWith('…'))).toBe(true);
  }, 30000);
});
