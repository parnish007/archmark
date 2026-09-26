// Shared suggestion utility (core-owned; language + compiler both depend inward).
// Caps prevent Levenshtein DoS on hostile inputs.
export function levenshteinCapped(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const m = Math.min(a.length, 64);
  const n = Math.min(b.length, 64);
  const aa = a.slice(0, m);
  const bb = b.slice(0, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, (cur[j - 1] as number) + 1, prev[j - 1] + (aa[i - 1] === bb[j - 1] ? 0 : 1));
      if (cur[j] > cap) cur[j] = cap + 1;
    }
    prev = cur;
  }
  return prev[n] as number;
}

export function suggest(input: string, candidates: readonly string[], cap = 3): string | undefined {
  if (candidates.length > 500 || input.length > 64) return undefined;
  let best: string | undefined;
  let bestD = cap + 1;
  for (const c of candidates) {
    if (Math.abs(c.length - input.length) > cap) continue;
    const d = levenshteinCapped(input, c, cap);
    if (d < bestD && d <= 2) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function escapeXmlText(s: string): string {
  return (
    s
      // biome-ignore lint/suspicious/noControlCharactersInRegex: XML 1.0 requires stripping C0 controls.
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  );
}
export function escapeXmlAttr(s: string): string {
  return escapeXmlText(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function slugId(s: string): string {
  const slug =
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'id';
  if (!/^[a-z]/.test(slug)) return `n-${slug}`;
  return slug;
}

// Shared presentation primitives: grapheme-safe truncation and bounded list summary.
// Single source for alt/desc text budgets (F-M-4) — never duplicate ad-hoc slicing.
export function truncateGraphemes(s: string, max: number): string {
  const chars = [...s];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : s;
}

export function summarizeList(items: readonly string[], max: number, joiner = ', '): string {
  const shown = items.slice(0, max).join(joiner);
  const more = items.length > max ? ` (+${items.length - max} more)` : '';
  return `${shown}${more}`;
}
