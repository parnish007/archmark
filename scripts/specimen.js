// Generates icon specimen sheets (all candidates × sizes × themes). No network.
import { writeFileSync, mkdirSync } from 'node:fs';
import { CANDIDATES } from '../dist/renderer/icon-candidates.js';
import { LIGHT, DARK, FONT_UI } from '../dist/renderer/tokens.js';

const KINDS = Object.keys(CANDIDATES.A);
const SIZES = [16, 20, 24, 32, 48];
const THEMES = { light: LIGHT, dark: DARK };

for (const cand of Object.keys(CANDIDATES)) {
  for (const [tname, t] of Object.entries(THEMES)) {
    const cols = SIZES.length; const rows = KINDS.length;
    const cw = 200; const rh = 56;
    const W = 160 + cols * cw; const H = 60 + rows * rh;
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">`];
    parts.push(`<title>Candidate ${cand} ${tname} specimen</title><rect width="${W}" height="${H}" fill="${t.bg}"/>`);
    parts.push(`<text x="20" y="36" font-family="${FONT_UI}" font-size="16" font-weight="600" fill="${t.ink}">Candidate ${cand} — ${tname} — 22 icons × 16/20/24/32/48</text>`);
    KINDS.forEach((k, r) => {
      const y = 60 + r * rh;
      parts.push(`<text x="20" y="${y + 30}" font-family="${FONT_UI}" font-size="12" fill="${t.muted}">${k}</text>`);
      SIZES.forEach((s, c) => {
        const x = 160 + c * cw + 40;
        const scale = s / 24;
        parts.push(`<g transform="translate(${x},${y + 8}) scale(${scale})" color="${t.ink}">${CANDIDATES[cand][k]}</g>`);
        parts.push(`<text x="${x - 10}" y="${y + 50}" font-family="${FONT_UI}" font-size="9" fill="${t.muted}">${s}px</text>`);
      });
    });
    parts.push('</svg>');
    mkdirSync('assets/icons', { recursive: true });
    writeFileSync(`assets/icons/specimen-${cand.toLowerCase()}.${tname}.svg`, parts.join(''));
  }
}
console.log('specimens written');
