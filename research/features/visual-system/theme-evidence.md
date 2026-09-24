# Theme switching (measured 2026-09-24, Chromium light+dark colorScheme)

THEME.md `<picture><source media="(prefers-color-scheme: dark)">` on blob preview:
- light scheme → `archmark.hero.light.svg` selected. dark scheme → `archmark.hero.dark.svg` selected.
- Correct asset per scheme, no selection error. Screenshots: benchmarks/results/theme-{light,dark}.png.
- Contrast spot-check (by construction, tokens): ink/bg 15.8:1 light, 16.0:1 dark; edge 7.0/6.7.
  No flash-of-wrong-theme observable in static screenshots (transition behavior needs video, untested).
- Labels legible both themes in screenshots (visual inspection of saved PNGs).
Status: THEME SWITCH PASS (selection); transition flash untested (minor).
