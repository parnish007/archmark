import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, assertNoSymlink, describeArch } from '../../src/cli/cli.js';
import { compile } from '../../src/core/compiler.js';
import { parse } from '../../src/language/parser.js';

const CWD = process.cwd();
let dirs: string[] = [];
afterEach(() => {
  process.chdir(CWD);
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function workdir(): string {
  const d = mkdtempSync(join(tmpdir(), 'am-'));
  dirs.push(d);
  process.chdir(d);
  return d;
}

const SIMPLE = `<!-- archmark id=demo\nservice a "A"\nservice b "B"\na -> b\n-->\n`;

describe('failure injection (narrow fs seam)', () => {
  it('validation failure writes nothing', async () => {
    workdir();
    writeFileSync('README.md', `${SIMPLE}\n<!-- archmark-render:start demo -->BROKEN`);
    let writes = 0;
    const code = await run(['build', 'README.md'], {
      fs: {
        writeFileAtomic: () => {
          writes++;
        },
        readdir: () => [],
      },
    });
    expect(code).toBe(1);
    expect(writes).toBe(0);
  });

  it('mid-commit failure surfaces; rerun repairs (idempotent)', async () => {
    workdir();
    writeFileSync('README.md', SIMPLE);
    let n = 0;
    const flaky = {
      writeFileAtomic: (p: string, c: string) => {
        n++;
        if (n === 2) throw new Error('ENOSPC: simulated');
        void p;
        void c;
      },
      readdir: () => [] as string[],
    };
    const code = await run(['build', 'README.md'], { fs: flaky });
    expect(code).toBe(1);
    expect(n).toBe(2);
    // Rerun with real sink repairs everything (idempotent build).
    expect(await run(['build', 'README.md'])).toBe(0);
    expect(await run(['check', 'README.md'])).toBe(0);
    expect(readFileSync('archmark.demo.light.svg', 'utf8')).toContain('<svg');
  });
});

describe('symlink guard', () => {
  it('refuses symlinked targets (injectable stat)', () => {
    expect(() => assertNoSymlink('x', () => ({ isSymbolicLink: () => true }) as never)).toThrow(/symlink/);
    expect(() => assertNoSymlink('x', () => ({ isSymbolicLink: () => false }) as never)).not.toThrow();
    expect(() =>
      assertNoSymlink('missing', () => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }),
    ).not.toThrow();
  });
});

describe('case folding collisions', () => {
  it('block ids differing only by case collide on case-insensitive filesystems', async () => {
    workdir();
    writeFileSync('README.md', '<!-- archmark id=API\nservice a "A"\n-->\n\n<!-- archmark id=api\nservice b "B"\n-->\n');
    const code = await run(['build', 'README.md']);
    expect(code).toBe(1);
  });
});

describe('help and version', () => {
  it('--help and --version exit 0 with useful text', async () => {
    expect(await run(['--help'])).toBe(0);
    expect(await run(['--version'])).toBe(0);
    const pkg = JSON.parse(readFileSync(join(CWD, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('aggregate animation cap', () => {
  function bigDoc(): string {
    let md = '';
    for (let b = 0; b < 7; b++) {
      let nodes = '';
      let edges = '';
      for (let i = 0; i <= 100; i++) nodes += `service n${b}_${i} "N${i}"\n`;
      for (let i = 0; i < 100; i++) edges += `n${b}_${i} -> n${b}_${i + 1}\n`;
      let steps = '';
      for (let i = 0; i < 100; i++) steps += `  n${b}_${i} -> n${b}_${i + 1}\n`;
      md += `<!-- archmark id=b${b}\n${nodes}${edges}\nflow f {\n${steps}}\n-->\n\n`;
    }
    return md;
  }
  it('rejects documents exploding past 2000 total ops', async () => {
    workdir();
    writeFileSync('README.md', bigDoc());
    const code = await run(['build', 'README.md']);
    expect(code).toBe(1);
  }, 120000);

  it('rejects BEFORE any layout work (layout calls = 0, no writes)', async () => {
    workdir();
    writeFileSync('README.md', bigDoc());
    let layoutCalls = 0;
    let writes = 0;
    const code = await run(['build', 'README.md'], {
      layout: {
        layout: () => {
          layoutCalls++;
          throw new Error('must not be called');
        },
      },
      fs: {
        writeFileAtomic: () => {
          writes++;
        },
        readdir: () => [] as string[],
      },
    });
    expect(code).toBe(1);
    expect(layoutCalls).toBe(0);
    expect(writes).toBe(0);
  }, 120000);
});

describe('descriptive alt text', () => {
  it('describeArch joins labels deterministically with truncation', () => {
    const { ast } = parse('service b "Beta"\nservice a "Alpha With A Very Long Label Indeed Yes"\n');
    const { model } = compile(ast);
    const alt = describeArch(model, 'system');
    expect(alt).toMatch(/^system architecture: /);
    expect(alt).toContain('Alpha');
    expect(alt).toContain('…');
  });
});

describe('flow diagnostic positions (F-M-2)', () => {
  it('CLI reports the exact README line of a bad flow step', async () => {
    workdir();
    // README lines: 1 '# T', 2 blank, 3 '<!-- archmark id=d', 4 service a, 5 service b,
    // 6 'a -> b', 7 blank, 8 'flow f {', 9 ' a -> b', 10 ' b -> nope', 11 '}'.
    writeFileSync(
      'README.md',
      '# T\n\n<!-- archmark id=d\nservice a "A"\nservice b "B"\na -> b\n\nflow f {\n a -> b\n b -> nope\n}\n-->\n',
    );
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await run(['build', 'README.md']);
      expect(code).toBe(1);
      const out = err.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toMatch(/README\.md:10:1 \[error\] AM1203 \(block "d"\): Flow "f" references unknown node "nope"/);
    } finally {
      err.mockRestore();
    }
  });
});
