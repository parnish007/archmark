import { describe, it, expect } from 'vitest';
import { NODE_KINDS } from '../../src/core/ir.js';
import { ICONS, iconFor, iconIds } from '../../src/renderer/icons.js';

// Hard completeness invariant: every supported NodeKind must have an EXPLICIT
// production icon. Adding a NodeKind without an icon fails this test by design.
// The service fallback in iconFor() is defensive runtime behavior for invalid
// JS input only — no valid NodeKind may reach it.
describe('icon family completeness', () => {
  it('NODE_KINDS and explicit icon ids are exactly equal sets', () => {
    expect(new Set(iconIds())).toEqual(new Set(NODE_KINDS));
    expect(iconIds()).toHaveLength(NODE_KINDS.length);
  });

  it('no valid NodeKind reaches the generic fallback', () => {
    for (const kind of NODE_KINDS) {
      const explicit = ICONS[kind];
      expect(explicit, `${kind} has no explicit icon`).toBeDefined();
      expect(iconFor(kind), `${kind} falls through to fallback`).toBe(explicit);
    }
  });

  it('unknown kinds still fall back defensively (invalid input only)', () => {
    expect(iconFor('__not-a-kind__')).toBe(ICONS.service);
  });

  it('every icon is non-empty currentColor line art (no hardcoded colors)', () => {
    for (const kind of NODE_KINDS) {
      const svg = ICONS[kind] as string;
      expect(svg.length, kind).toBeGreaterThan(0);
      expect(svg, `${kind} draws nothing`).toMatch(/<(circle|rect|path|ellipse|g)[\s>]/);
      expect(svg, `${kind} hardcodes a color`).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(svg, `${kind} missing currentColor`).toContain('currentColor');
    }
  });
});
