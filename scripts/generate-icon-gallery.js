// Icon gallery generator — deterministic docs asset from the runtime source of truth.
// Derives every cell from NODE_KINDS + iconFor (no hand-maintained kind list).
// Usage: node scripts/generate-icon-gallery.js [--check]
//   default: write docs/assets/icon-gallery.{light,dark}.svg
//   --check: byte-compare regenerated output with committed files (CI freshness gate).
// Requires: pnpm build (imports dist). Zero network, no timestamps, no machine paths.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NODE_KINDS } from '../dist/core/ir.js';
import { iconFor } from '../dist/renderer/icons.js';
import { LIGHT, DARK, FONT_UI } from '../dist/renderer/tokens.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = {
  light: join(root, 'docs', 'assets', 'icon-gallery.light.svg'),
  dark: join(root, 'docs', 'assets', 'icon-gallery.dark.svg'),
};

const COLS = 6;
const CELL_W = 150;
const CELL_H = 78;
const PAD = 16;
const TITLE_H = 30;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderIconGallery(theme) {
  const t = theme === 'dark' ? DARK : LIGHT;
  const rows = Math.ceil(NODE_KINDS.length / COLS);
  const w = PAD * 2 + COLS * CELL_W;
  const h = PAD * 2 + TITLE_H + rows * CELL_H;
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="gtitle">`,
  );
  parts.push(`<title id="gtitle">ArchMark core icon family — ${NODE_KINDS.length} kinds (${theme})</title>`);
  parts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="${t.bg}"/>`);
  parts.push(
    `<text x="${PAD}" y="${PAD + 19}" font-family="${FONT_UI}" font-size="15" font-weight="600" fill="${t.ink}">ArchMark core icons — ${NODE_KINDS.length} architecture kinds</text>`,
  );
  NODE_KINDS.forEach((kind, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x0 = PAD + col * CELL_W;
    const y0 = PAD + TITLE_H + row * CELL_H;
    const cx = x0 + CELL_W / 2;
    parts.push(`<g data-kind="${kind}">`);
    parts.push(`<g transform="translate(${cx - 12},${y0 + 8})" color="${t.ink}">${iconFor(kind)}</g>`);
    parts.push(
      `<text x="${cx}" y="${y0 + 58}" text-anchor="middle" font-family="${FONT_UI}" font-size="12" fill="${t.muted}">${esc(kind)}</text>`,
    );
    parts.push('</g>');
  });
  parts.push('</svg>\n');
  return parts.join('');
}

function countKind(svg, kind) {
  return svg.split(`data-kind="${kind}"`).length - 1;
}

function main() {
  const check = process.argv.includes('--check');
  let failed = false;
  for (const theme of ['light', 'dark']) {
    const svg = renderIconGallery(theme);
    for (const kind of NODE_KINDS) {
      const n = countKind(svg, kind);
      if (n !== 1) {
        console.error(`gallery ${theme}: kind ${kind} appears ${n} times (expected once)`);
        failed = true;
      }
    }
    if (check) {
      const disk = readFileSync(OUT[theme], 'utf8');
      if (disk !== svg) {
        console.error(`gallery ${theme} stale: run node scripts/generate-icon-gallery.js`);
        failed = true;
      }
    } else {
      mkdirSync(dirname(OUT[theme]), { recursive: true });
      writeFileSync(OUT[theme], svg);
      console.error(`wrote ${OUT[theme]} (${svg.length} bytes)`);
    }
  }
  if (failed) process.exit(1);
  if (check) console.error('gallery fresh.');
}

main();
