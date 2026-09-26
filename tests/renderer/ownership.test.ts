import { describe, it, expect } from 'vitest';
import { isOwnedBy, ownershipMarker, parseOwnership } from '../../src/renderer/ownership.js';

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
});
