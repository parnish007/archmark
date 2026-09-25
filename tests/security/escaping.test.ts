import { describe, it, expect } from 'vitest';
import { escapeXmlText, escapeXmlAttr } from '../../src/core/suggest.js';
import { slugSvg, IdScope } from '../../src/renderer/ids.js';
import { validateSvgName, resolveReadmeInCwd } from '../../src/markdown/extract.js';
import { parse } from '../../src/language/parser.js';

// Deterministic PRNG (mulberry32, fixed seed): reproducible fuzz, no flaky randomness.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHA = 'ab<"\'&>é🎉\n\r\t\x00\x07 daun/\\..:;';

function randStr(r: () => number, max: number): string {
  const n = Math.floor(r() * max);
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHA[Math.floor(r() * ALPHA.length)];
  return s;
}

describe('xml escaping (property)', () => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: tests assert C0 stripping itself.
  const CONTROL = /[<>\x00-\x08\x0B\x0C\x0E-\x1F]/;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: tests assert C0 stripping itself.
  const CONTROL_ATTR = /["'<>\x00-\x08\x0B\x0C\x0E-\x1F]/;
  it('escaped text never contains raw markup chars; idempotent', () => {
    const r = rng(42);
    for (let i = 0; i < 500; i++) {
      const s = randStr(r, 40);
      const e = escapeXmlText(s);
      expect(e).not.toMatch(CONTROL);
      expect(escapeXmlText(e)).toBe(e.replace(/&/g, '&amp;')); // re-escape only amps
      const a = escapeXmlAttr(s);
      expect(a).not.toMatch(CONTROL_ATTR);
    }
  });
});

describe('svg id sanitizer (property)', () => {
  it('always valid + collision-safe over adversarial inputs', () => {
    const r = rng(7);
    const scope = new IdScope('am');
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const id = scope.unique('node', randStr(r, 16));
      expect(id).toMatch(/^am-node-[a-z0-9-]+$/);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      expect(slugSvg(randStr(r, 8))).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });
});

describe('output validation', () => {
  it('rejects traversal, ADS, absolute, wrong extension', () => {
    for (const bad of ['../x.svg', 'a/b.svg', 'a\\b.svg', 'C:\\x.svg', 'x.svg:', 'x\0.svg', 'x.png', '.svg', 'a b.svg']) {
      expect(() => validateSvgName(bad)).toThrow();
    }
    expect(validateSvgName('archmark.hero.request.light.svg')).toBe('archmark.hero.request.light.svg');
    expect(() => resolveReadmeInCwd('../outside.md')).toThrow();
    expect(() => resolveReadmeInCwd('README.md')).not.toThrow();
  });
});

describe('parser fuzz (no crash, diagnostics produced)', () => {
  it('500 adversarial inputs never throw', () => {
    const r = rng(99);
    const toks = ['service', 'actor', '->', '{', '}', '"', 'flow', 'group', '\n', ' ', 'id=', '<', '>', '&', '🎉', 'a-b', 'a_b'];
    for (let i = 0; i < 500; i++) {
      let s = '';
      const n = 1 + Math.floor(r() * 12);
      for (let j = 0; j < n; j++) s += toks[Math.floor(r() * toks.length)] + (r() < 0.3 ? '\n' : ' ');
      expect(() => parse(s)).not.toThrow();
      const { diagnostics } = parse(s);
      expect(Array.isArray(diagnostics)).toBe(true);
    }
  });
});
