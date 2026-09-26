import { describe, it, expect } from 'vitest';
import { roundOrthogonalCorners } from '../../src/renderer/scene-svg.js';

describe('orthogonal corner rounding', () => {
  it('radius 0 returns input untouched', () => {
    const d = 'M0 0 L100 0 L100 100';
    expect(roundOrthogonalCorners(d, 0)).toBe(d);
  });

  it('straight paths pass through', () => {
    const d = 'M576 42 L648 42';
    expect(roundOrthogonalCorners(d, 8)).toBe(d);
  });

  it('right-angle joints blend with quadratic', () => {
    expect(roundOrthogonalCorners('M0 0 L100 0 L100 100', 8)).toBe('M0 0 L92 0 Q100 0 100 8 L100 100');
  });

  it('radius clamps to half the shortest adjacent segment', () => {
    expect(roundOrthogonalCorners('M0 0 L10 0 L10 100', 8)).toBe('M0 0 L5 0 Q10 0 10 5 L10 100');
  });

  it('non-orthogonal joints stay sharp', () => {
    const d = 'M0 0 L100 0 L50 50';
    expect(roundOrthogonalCorners(d, 8)).toBe(d);
  });

  it('collinear joints stay sharp', () => {
    const d = 'M0 0 L50 0 L100 0';
    expect(roundOrthogonalCorners(d, 8)).toBe(d);
  });

  it('malformed input passes through (never corrupts)', () => {
    for (const bad of ['', 'M0', 'M0 0', 'M0 0 L1', 'C0 0 1 1 2 2', 'M0 0 LNaN 4']) {
      expect(roundOrthogonalCorners(bad, 8)).toBe(bad);
    }
  });
});
