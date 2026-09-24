# Phase 0 GitHub probe matrix (verify in real README, do not assume)

Probes in this folder are handcrafted minimal SVG. Commit them + reference from a test README
on github.com/parnish007/archmark, then screenshot on Chrome/Firefox/Safari + GitHub mobile.

| Probe | File | Pass = |
|---|---|---|
| P-GH-01 static | p-gh-01-static.svg | crisp, no clip, camo serves |
| P-GH-02 theming | picture light/dark snippet below | follows GitHub theme |
| P-SMIL-01 motion | p-smil-01-animate-motion.svg | dot travels full path, loops, no teleport |
| P-SMIL-02 compound | p-smil-02-pulse-compound.svg | draw→traverse→pulse chained via begin |
| P-SMIL-03 set/transform | (add: set opacity + animateTransform scale) | discrete + transform survive |
| P-CSS-NEG | (add: style @keyframes) | expected STRIPPED — confirms SMIL-only rule |
| P-FO-NEG | (add: foreignObject) | expected STRIPPED |

Theming snippet (generate per diagram in v0):
```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./archmark.dark.svg" />
  <img alt="Architecture" src="./archmark.light.svg" />
</picture>
```

Budgets: each <100KB, cap <512KB. Record results + screenshots before promoting SMIL backend.
Static fallback frame = first frame, always meaningful without animation.
