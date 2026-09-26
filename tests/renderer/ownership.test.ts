import { describe, it, expect } from 'vitest';
import { isOwnedBy, ownershipMarker, parseOwnership } from '../../src/renderer/ownership.js';
import { describeFlowAlt, SmilRenderer } from '../../src/renderer/smil.js';
import { summarizeList, truncateGraphemes } from '../../src/core/suggest.js';
import { ElkLayout, toScene } from '../../src/core/layout.js';
import { parse } from '../../src/language/parser.js';
import { compile } from '../../src/core/compiler.js';

const STATIC = { owner: 'system', kind: 'static', variant: 'light', version: '0.1.0' } as const;
const FLOW = { owner: 'shop', kind: 'flow', flow: 'order', variant: 'dark', version: '0.1.0' } as const;

describe('ownership marker round-trip', () => {
  it('emits deterministic markup recognized for the exact logical output', () => {
    const svg = `<svg>${ownershipMarker({ ...STATIC })}</svg>`;
    expect(parseOwnership(svg)).toEqual({ ...STATIC });
    expect(isOwnedBy(svg, { ...STATIC })).toBe(true);
    const fsvg = `<svg>${ownershipMarker({ ...FLOW })}</svg>`;
    expect(isOwnedBy(fsvg, { ...FLOW })).toBe(true);
  });

  it('rejects wrong owner, kind, flow, and variant', () => {
    const svg = `<svg>${ownershipMarker({ ...STATIC })}</svg>`;
    expect(isOwnedBy(svg, { ...STATIC, owner: 'other' })).toBe(false);
    expect(isOwnedBy(svg, { ...STATIC, kind: 'flow', flow: 'x' })).toBe(false);
    expect(isOwnedBy(svg, { ...STATIC, variant: 'dark' })).toBe(false);
    const fsvg = `<svg>${ownershipMarker({ ...FLOW })}</svg>`;
    expect(isOwnedBy(fsvg, { ...FLOW, flow: 'other' })).toBe(false);
    expect(isOwnedBy(fsvg, { ...FLOW, owner: 'system' })).toBe(false);
  });

  it('rejects arbitrary content, partial markers, and tampered attributes', () => {
    expect(isOwnedBy('<svg><circle/></svg>', { ...STATIC })).toBe(false);
    expect(isOwnedBy('not svg at all', { ...STATIC })).toBe(false);
    expect(isOwnedBy('<svg><metadata data-archmark="generated"/></svg>', { ...STATIC })).toBe(false);
    expect(isOwnedBy(`<svg>${ownershipMarker({ ...STATIC }).slice(0, 40)}</svg>`, { ...STATIC })).toBe(false);
    // Tampered owner value inside an otherwise valid marker.
    const tampered = ownershipMarker({ ...STATIC }).replace('system', 'attacker');
    expect(isOwnedBy(`<svg>${tampered}</svg>`, { ...STATIC })).toBe(false);
  });

  it('accepts any tool version (lineage, not exact-version match)', () => {
    const svg = `<svg>${ownershipMarker({ ...STATIC, version: '0.0.1' })}</svg>`;
    expect(isOwnedBy(svg, { ...STATIC })).toBe(true);
  });

  it('round-trips values needing XML escaping', () => {
    const id = { owner: 'a&b', kind: 'static', variant: 'light', version: '1<2' } as const;
    const svg = `<svg>${ownershipMarker({ ...id })}</svg>`;
    expect(parseOwnership(svg)).toEqual({ ...id });
  });

  it('tolerates reordered attributes, newlines, and expanded metadata form', () => {
    const reordered =
      '<metadata data-archmark-version="0.1.0" data-archmark-variant="light" data-archmark-kind="static" data-archmark-owner="system" data-archmark="generated"/>';
    expect(isOwnedBy(`<svg>${reordered}</svg>`, { ...STATIC })).toBe(true);
    const expanded =
      '<metadata\n  data-archmark="generated"\n  data-archmark-owner="system"\n  data-archmark-kind="static"\n  data-archmark-variant="light"\n  data-archmark-version="0.1.0"\n></metadata>';
    expect(isOwnedBy(`<svg>${expanded}</svg>`, { ...STATIC })).toBe(true);
  });
});

describe('bounded accessible descriptions (F-M-4)', () => {
  it('flow alt lists first 6 steps then counts the rest', () => {
    const steps = Array.from({ length: 100 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` }));
    const alt = describeFlowAlt('shop', 'order', steps);
    expect(alt).toContain('n0 → n1');
    expect(alt).toContain('(+94 more)');
    expect(alt.length).toBeLessThan(500);
  });

  it('truncation is grapheme-safe (no split surrogate pairs)', () => {
    expect(truncateGraphemes('🎉🎉🎉🎉🎉', 4)).toBe('🎉🎉🎉…');
    expect(summarizeList(['a', 'b', 'c'], 5)).toBe('a, b, c');
    expect(summarizeList(['a', 'b', 'c'], 2)).toBe('a, b (+1 more)');
  });

  it('never splits ZWJ grapheme clusters', () => {
    // Family emoji is one grapheme (7 code points): truncating to 1 keeps it whole.
    expect(truncateGraphemes('👨‍👩‍👧‍👦AB', 2)).toBe('👨‍👩‍👧‍👦…');
  });
});

describe('renderer fail-loud contract (F-L-1)', () => {
  it('unsupported animation operations throw instead of emitting comments', async () => {
    const { ast } = parse('service a "A"\nservice b "B"\na -> b\n');
    const { model } = compile(ast);
    const scene = toScene(model, await new ElkLayout().layout(model));
    const anim = {
      flowId: 'f',
      archId: 't',
      totalMs: 0,
      ops: [{ id: 'x', kind: 'bogus', target: 'a', token: 'activation', startMs: 0, durMs: 1, style: '' } as never],
    };
    expect(() => new SmilRenderer().render(scene, anim, 'light')).toThrow(/unsupported animation operation/);
  });
});
