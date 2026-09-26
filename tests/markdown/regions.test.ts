import { describe, it, expect } from 'vitest';
import { patchRegion, regionIdFor, type GeneratedRegionKey } from '../../src/markdown/extract.js';
import { scanMarkdown } from '../../src/markdown/scanner.js';

const src = (id: string, body = 'service x "X"') => `<!-- archmark id=${id}\n${body}\n-->`;
const tag = (rid: string) => `<!-- archmark-render:start ${rid} -->${rid}<!-- archmark-render:end ${rid} -->`;
const key = (diagramId: string, flowId?: string): GeneratedRegionKey =>
  flowId === undefined ? { diagramId, kind: 'static' } : { diagramId, kind: 'flow', flowId };

function order(md: string): string[] {
  return [...md.matchAll(/archmark-render:start ([A-Za-z0-9_.-]+)/g)].map((m) => m[1] as string);
}

describe('region identity', () => {
  it('static and flow region ids derive from typed keys', () => {
    expect(regionIdFor(key('a'))).toBe('a');
    expect(regionIdFor(key('a', 'req'))).toBe('a.req');
  });
});

describe('flow region ownership (F-H-2)', () => {
  it('first build places flow region beside its owner, not after the last block', () => {
    const md = `${src('aaa', 'service a "A"')}\n\n${src('bbb', 'service b "B"')}\n`;
    let out = patchRegion(md, key('aaa'), tag('aaa'));
    out = patchRegion(out, key('aaa', 'fa'), tag('aaa.fa'));
    out = patchRegion(out, key('bbb'), tag('bbb'));
    expect(order(out)).toEqual(['aaa', 'aaa.fa', 'bbb']);
    // Owner adjacency: aaa.fa sits between aaa region end and bbb source start.
    const faPos = out.indexOf('start aaa.fa');
    const aaaEnd = out.indexOf('end aaa -->');
    const bbbSrc = out.indexOf('<!-- archmark id=bbb');
    expect(faPos).toBeGreaterThan(aaaEnd);
    expect(faPos).toBeLessThan(bbbSrc);
  });

  it('multiple flows of one owner stay in model order', () => {
    const md = `${src('a')}\n`;
    let out = patchRegion(md, key('a'), tag('a'));
    out = patchRegion(out, key('a', 'alpha'), tag('a.alpha'));
    out = patchRegion(out, key('a', 'beta'), tag('a.beta'));
    expect(order(out)).toEqual(['a', 'a.alpha', 'a.beta']);
  });

  it('new flow anchors after existing static region', () => {
    const md = `${src('a')}\n\n${tag('a')}\n`;
    const out = patchRegion(md, key('a', 'new'), tag('a.new'));
    expect(order(out)).toEqual(['a', 'a.new']);
  });

  it('flow without owner source fails closed', () => {
    expect(() => patchRegion('# T\n', key('ghost', 'f'), tag('ghost.f'))).toThrow(/owning source block/);
  });

  it('second build is byte-identical (replace in place)', () => {
    const md = `${src('a')}\n\n${src('b')}\n`;
    let out = patchRegion(md, key('a'), tag('a'));
    out = patchRegion(out, key('a', 'f'), tag('a.f'));
    out = patchRegion(out, key('b'), tag('b'));
    const again = patchRegion(out, key('a'), tag('a'));
    const again2 = patchRegion(again, key('a', 'f'), tag('a.f'));
    const again3 = patchRegion(again2, key('b'), tag('b'));
    expect(again3).toBe(out);
  });

  it('flow removed: other regions untouched; unrelated bytes preserved', () => {
    const md = `${src('a')}\n\n${src('b')}\n`;
    let out = patchRegion(md, key('a'), tag('a'));
    out = patchRegion(out, key('a', 'f'), tag('a.f'));
    out = patchRegion(out, key('b'), tag('b'));
    expect(out).toContain(src('b'));
    expect(order(out)).toEqual(['a', 'a.f', 'b']);
  });

  it('CRLF documents keep owner anchoring', () => {
    const md = `${src('a')}\r\n\r\n${src('b')}\r\n`;
    let out = patchRegion(md, key('a'), tag('a'));
    out = patchRegion(out, key('a', 'f'), tag('a.f'));
    out = patchRegion(out, key('b'), tag('b'));
    expect(order(out)).toEqual(['a', 'a.f', 'b']);
    expect(out).toContain('\r\n');
  });

  it('fences and comments between diagrams do not disturb anchoring', () => {
    const fenced = '<!-- archmark-render:start x -->X<!-- archmark-render:end x -->';
    const md = `${src('a')}\n\n\`\`\`md\n${fenced}\n\`\`\`\n\n<!-- note -->\n\n${src('b')}\n`;
    let out = patchRegion(md, key('a'), tag('a'));
    out = patchRegion(out, key('a', 'f'), tag('a.f'));
    // Fenced example text is opaque to region order: assert on real regions only.
    const faPos = out.indexOf('start a.f');
    const aEnd = out.indexOf('end a -->');
    const bSrc = out.indexOf('<!-- archmark id=b');
    expect(faPos).toBeGreaterThan(aEnd);
    expect(faPos).toBeLessThan(bSrc);
    expect(out).toContain('<!-- note -->');
    expect(out).toContain(fenced);
  });

  it('three diagrams with flows on each keep owner grouping', () => {
    const md = `${src('a')}\n\n${src('b')}\n\n${src('c')}\n`;
    let out = md;
    for (const id of ['a', 'b', 'c']) {
      out = patchRegion(out, key(id), tag(id));
      out = patchRegion(out, key(id, 'f1'), tag(`${id}.f1`));
      out = patchRegion(out, key(id, 'f2'), tag(`${id}.f2`));
    }
    expect(order(out)).toEqual(['a', 'a.f1', 'a.f2', 'b', 'b.f1', 'b.f2', 'c', 'c.f1', 'c.f2']);
  });
});
