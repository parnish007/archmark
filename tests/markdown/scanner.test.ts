import { describe, expect, it } from 'vitest';
import { extractBlocks, patchReadme } from '../../src/markdown/extract.js';
import { scanMarkdown } from '../../src/markdown/scanner.js';

const src = (id: string, body: string) => `<!-- archmark id=${id}\n${body}\n-->`;

describe('scanner fences', () => {
  for (const [name, fence] of [
    ['backtick3', '```'],
    ['backtick4', '````'],
    ['tilde3', '~~~'],
    ['tilde4', '~~~~'],
  ] as const) {
    it(`ignores markers inside ${name} fences (with info string)`, () => {
      const md = `# T\n\n${fence}md\n${src('demo', 'service x "X"')}\n<!-- archmark-render:start demo -->X<!-- archmark-render:end demo -->\n${fence}\n\n${src('real', 'service y "Y"')}\n`;
      const idx = scanMarkdown(md);
      expect(idx.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(extractBlocks(md).map((b) => b.id)).toEqual(['real']);
    });
  }
  it('fence characters inside quoted DSL labels do not break scanning', () => {
    const md = `${src('a', 'service x "a ``` b ~~~ c"')}\n`;
    expect(extractBlocks(md).map((b) => b.id)).toEqual(['a']);
  });
  it('unclosed fence protects rest of file', () => {
    const md = `# T\n\n\`\`\`md\n${src('demo', 'service x "X"')}\n`;
    expect(extractBlocks(md)).toEqual([]);
  });
});

describe('scanner comment precedence (F-H-1)', () => {
  // Fence delimiters inside a generic multiline HTML comment are inert: they must not
  // open code fences and swallow subsequent real ArchMark blocks.
  for (const [name, fence] of [
    ['backtick', '```'],
    ['tilde', '~~~'],
    ['long-backtick', '````'],
  ] as const) {
    it(`fence ${name} inside multiline comment does not swallow following block`, () => {
      const md = `<!--\n${fence}\ncode\n-->\n\n${src('real', 'service y "Y"')}\n`;
      const idx = scanMarkdown(md);
      expect(idx.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(extractBlocks(md).map((b) => b.id)).toEqual(['real']);
    });
  }
  it('lookalike archmark text inside a comment never becomes a source block', () => {
    const md = `<!--\nExample: <!-- archmark id=x ... --> (do not do this)\n-->\n\n${src('real', 'service y "Y"')}\n`;
    // The lookalike must not compile (no source block); near-miss strictness may still
    // flag the outer comment, but sources must contain only the real block.
    const idx = scanMarkdown(md);
    expect(idx.sources.map((s) => s.id)).toEqual(['real']);
  });
  it('real fenced block immediately after a comment still protects', () => {
    const md = `<!-- note -->\n\n\`\`\`md\n${src('demo', 'service x "X"')}\n\`\`\`\n\n${src('real', 'service y "Y"')}\n`;
    expect(extractBlocks(md).map((b) => b.id)).toEqual(['real']);
  });
  it('comment immediately after a fenced block is still scanned', () => {
    const md = `\`\`\`\ncode\n\`\`\`\n<!-- note -->\n\n${src('real', 'service y "Y"')}\n`;
    expect(extractBlocks(md).map((b) => b.id)).toEqual(['real']);
  });
  it('comment/fence precedence holds under CRLF', () => {
    const md = `<!--\r\n\`\`\`\r\ncode\r\n-->\r\n\r\n${src('real', 'service y "Y"')}\r\n`;
    expect(extractBlocks(md).map((b) => b.id)).toEqual(['real']);
  });
  it('unclosed HTML comment fails closed (AM2107)', () => {
    const md = `# T\n\n${src('real', 'service y "Y"')}\n\n<!-- broken\n`;
    expect(() => extractBlocks(md)).toThrow(/AM2107/);
  });
  it('nested-looking comment opener does not extend the comment', () => {
    const md = `<!-- outer <!-- inner -->\n\n${src('real', 'service y "Y"')}\n`;
    // First --> ends the comment (no nesting); the real block follows normally.
    expect(extractBlocks(md).map((b) => b.id)).toEqual(['real']);
  });
});

describe('scanner fail-closed', () => {
  it('duplicate source ids fatal with both locations (AM2103)', () => {
    const md = `${src('system', 'service a "A"')}\n\n${src('system', 'service b "B"')}\n`;
    const idx = scanMarkdown(md);
    expect(idx.fatal).toBe(true);
    const d = idx.diagnostics.find((x) => x.code === 'AM2103');
    expect(d?.message).toMatch(/first at line 1.*duplicate at line 5/s);
    expect(() => patchReadme(md, 'system', 'TAG')).toThrow(/AM2103/);
  });
  it('start without end / end without start / misorder', () => {
    expect(() => patchReadme('# T\n<!-- archmark-render:start a -->x', 'a', 'T')).toThrow(/AM2101/);
    expect(() => patchReadme('# T\nx<!-- archmark-render:end a -->', 'a', 'T')).toThrow(/AM2102/);
    expect(() => patchReadme('<!-- archmark-render:end a --><!-- archmark-render:start a -->', 'a', 'T')).toThrow(/AM2105/);
  });
  it('duplicate generated starts fatal (AM2104)', () => {
    const md =
      '<!-- archmark-render:start a -->1<!-- archmark-render:end a -->\n<!-- archmark-render:start a -->2<!-- archmark-render:end a -->';
    expect(() => patchReadme(md, 'a', 'T')).toThrow(/AM2104/);
  });
  it('malformed near-miss marker rejected (AM2108)', () => {
    const md = '# T\n<!-- archmark id -->\n';
    expect(scanMarkdown(md).diagnostics.some((d) => d.code === 'AM2108')).toBe(true);
  });
  it('protected fenced bytes remain identical (byte-identity, not fence-exists)', () => {
    const fenced = '```md\n<!-- archmark-render:start demo -->\nEXAMPLE ONLY\n<!-- archmark-render:end demo -->\n```';
    const md = `# T\n\n${fenced}\n\n${src('real', 'service y "Y"')}\n`;
    const out = patchReadme(md, 'real', '<!-- archmark-render:start real -->R<!-- archmark-render:end real -->');
    const before = md.slice(md.indexOf(fenced), md.indexOf(fenced) + fenced.length);
    const after = out.slice(out.indexOf(fenced), out.indexOf(fenced) + fenced.length);
    expect(after).toBe(before);
  });
});

describe('scanner text robustness', () => {
  it('CRLF + emoji + RTL + no final newline', () => {
    const md = `# T 🎉 مرحبا\r\n\r\n${src('a', 'service x "X"')}\r\ntail`;
    expect(extractBlocks(md).map((b) => b.id)).toEqual(['a']);
  });
  it('50-block limit enforced', () => {
    const md = Array.from({ length: 51 }, (_, i) => src(`b${i}`, 'service x "X"')).join('\n');
    expect(scanMarkdown(md).fatal).toBe(true);
  });
  it('generated region ids may contain dots (flow assets)', () => {
    const md = `${src('a', 'service x "X"')}\n\n<!-- archmark-render:start a.req -->X<!-- archmark-render:end a.req -->\n`;
    const idx = scanMarkdown(md);
    expect(idx.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(idx.generated.map((g) => g.id)).toEqual(['a.req']);
  });
  it('reordered generated regions patch by id, unrelated bytes preserved', () => {
    const md = `# Keep\n\n${src('b', 'service y "Y"')}\n\n${src('a', 'service x "X"')}\n`;
    const o1 = patchReadme(md, 'a', '<!-- archmark-render:start a -->A<!-- archmark-render:end a -->');
    expect(o1).toContain('# Keep');
    expect(o1).toContain('service y "Y"');
  });
});
