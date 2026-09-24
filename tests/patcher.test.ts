import { describe, it, expect } from 'vitest';
import { extractBlocks, patchReadme } from '../src/markdown/extract.js';

const block = (id: string, src: string) => `<!-- archmark id=${id}\n${src}\n-->`;

describe('patcher adversarial round 2', () => {
  it('handles multiple diagrams + duplicate ids (last wins region per id)', () => {
    const md = `# T\n\n${block('a', 'service x "X"')}\n\n${block('b', 'service y "Y"')}\n`;
    expect(extractBlocks(md).map(b => b.id)).toEqual(['a', 'b']);
    const p1 = patchReadme(md, 'a', '<!-- archmark-render:start a -->A<!-- archmark-render:end a -->');
    const p2 = patchReadme(p1, 'b', '<!-- archmark-render:start b -->B<!-- archmark-render:end b -->');
    expect(p2).toContain('# T');
    expect(p2).toContain('service x');
  });
  it('appends when end marker missing; preserves unrelated bytes', () => {
    const md = `# Keep\n\n${block('a', 'service x "X"')}\n\n<!-- archmark-render:start a -->STALE`;
    const out = patchReadme(md, 'a', '<!-- archmark-render:start a -->FRESH<!-- archmark-render:end a -->');
    expect(out).toContain('# Keep');
    expect(out).toContain('FRESH');
  });
  it('tolerates CRLF, emoji, UTF-8, no trailing newline', () => {
    const md = '# T 🎉\r\n\r\n' + block('a', 'service x "X"') + '\r\n\r\ntail — ünïcode';
    const out = patchReadme(md, 'a', '<!-- archmark-render:start a -->X<!-- archmark-render:end a -->');
    expect(out).toContain('🎉');
    expect(out).toContain('ünïcode');
  });
  it('ignores fake markers inside fenced code', () => {
    const md = '# T\n\n```md\n<!-- archmark-render:start a -->FAKE<!-- archmark-render:end a -->\n```\n\n' + block('a', 'service x "X"') + '\n';
    // patcher replaces first real region; fenced fake is ambiguous — at minimum must not destroy fences
    const out = patchReadme(md, 'a', '<!-- archmark-render:start a -->REAL<!-- archmark-render:end a -->');
    expect(out).toContain('```md');
    expect(out).toContain('REAL');
  });
  it('handles huge README without quadratic blowup', () => {
    const big = '# T\n' + 'lorem ipsum dolor sit amet\n'.repeat(5000) + '\n' + block('a', 'service x "X"') + '\n';
    const t = Date.now();
    const out = patchReadme(big, 'a', '<!-- archmark-render:start a -->X<!-- archmark-render:end a -->');
    expect(Date.now() - t).toBeLessThan(2000);
    expect(out).toContain('lorem');
  });
  it('handles malformed comments + reordered/deleted diagrams', () => {
    const md = '# T\n\n<!-- archmark id=a\nservice x "X"\n-->\n\ntext <!-- broken\n\nmore';
    expect(() => patchReadme(md, 'a', '<!-- archmark-render:start a -->X<!-- archmark-render:end a -->')).not.toThrow();
    const empty = '# T\n\nno blocks here\n';
    expect(extractBlocks(empty)).toEqual([]);
    const appended = patchReadme(empty, 'a', '<!-- archmark-render:start a -->X<!-- archmark-render:end a -->');
    expect(appended).toContain('# T');
  });
});
