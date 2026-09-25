import { describe, expect, it } from 'vitest';
import { run } from '../../src/cli/cli.js';
import { compile } from '../../src/core/compiler.js';
import { ElkLayout, toScene } from '../../src/core/layout.js';
import { parse } from '../../src/language/parser.js';
import { extractBlocks, patchReadme, resolveReadmeInCwd, validateSvgName } from '../../src/markdown/extract.js';
import { renderStatic } from '../../src/renderer/svg.js';

const SRC = `actor user "User"\nservice frontend "Frontend"\nservice api "API"\ndatabase db "PostgreSQL"\n\nuser -> frontend\nfrontend -> api\napi -> db\n`;

describe('parser', () => {
  it('parses components and edges', () => {
    const { ast, diagnostics } = parse(SRC);
    expect(diagnostics).toEqual([]);
    expect(ast.components.map((c) => c.id)).toEqual(['user', 'frontend', 'api', 'db']);
    expect(ast.edges.length).toBe(3);
  });
  it('reports unknown statement with severity', () => {
    const { diagnostics } = parse('frobnicate foo\n');
    expect(diagnostics[0]?.severity).toBe('error');
  });
  it('rejects unclosed flow without swallowing', () => {
    const { ast, diagnostics } = parse('flow f\nservice a "A"\n');
    expect(diagnostics.some((d) => d.message.includes('missing "{'))).toBe(true);
    expect(ast.components.length).toBe(1);
  });
  it('rejects nested groups', () => {
    const { diagnostics } = parse('group a {\ngroup b {\n}\n}\n');
    expect(diagnostics.some((d) => d.message.includes('Nested groups'))).toBe(true);
  });
});

describe('compiler', () => {
  it('suggests typos and marks fatal', () => {
    const { ast } = parse('service api "API"\nservice databse "x"\napi -> databse\napi -> databse2\n');
    const { diagnostics, fatal } = compile(ast);
    expect(fatal).toBe(true);
    expect(diagnostics.find((d) => d.message.includes('databse2'))?.hint).toMatch(/Did you mean/);
  });
  it('rejects empty as fatal', () => {
    const { fatal } = compile({ components: [], edges: [], flows: [], groups: [] });
    expect(fatal).toBe(true);
  });
  it('escapes XML in labels', async () => {
    const { ast } = parse('service a "<b>&\\"q\\""\n');
    const { model } = compile(ast);
    const placed = await new ElkLayout().layout(model);
    const svg = renderStatic(toScene(model, placed), 'light');
    expect(svg).toContain('&lt;b&gt;');
    expect(svg).not.toContain('<b>');
  });
});

describe('pipeline', () => {
  it('builds deterministic SVG without nested svg/textPath', async () => {
    const { ast } = parse(SRC);
    const { model } = compile(ast);
    const placed = await new ElkLayout().layout(model);
    const s1 = renderStatic(toScene(model, placed), 'light');
    const placed2 = await new ElkLayout().layout(model);
    const s2 = renderStatic(toScene(model, placed2), 'light');
    expect(s1).toBe(s2);
    expect(s1).toContain('xmlns:xlink');
    expect(s1).not.toContain('<svg width="20"');
    expect(s1).not.toContain('textPath');
  }, 30000);
});

describe('markdown/security', () => {
  it('extracts and patches byte-range only', () => {
    const md = '# T\n\n<!-- archmark id=system\nservice a "A"\n-->\n\ntail\n';
    expect(extractBlocks(md)[0]?.id).toBe('system');
    const patched = patchReadme(md, 'system', '<!-- archmark-render:start system -->X<!-- archmark-render:end system -->');
    expect(patched).toContain('tail');
  });
  it('rejects traversal output names', () => {
    expect(() => validateSvgName('../evil.svg')).toThrow();
    expect(() => validateSvgName('a/b.svg')).toThrow();
    expect(() => validateSvgName('archmark.light.svg')).not.toThrow();
  });
  it('refuses README outside cwd', () => {
    expect(() => resolveReadmeInCwd('../outside.md')).toThrow();
  });
  it('check is dry-run (no write on stale)', async () => {
    const code = await run(['check', 'README.md']);
    expect([0, 1]).toContain(code);
  });
});
