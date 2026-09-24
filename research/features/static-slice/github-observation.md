# GitHub observation — probe/github-rendering (2026-09-24)

Env: Node 24.14, Windows; browsers available: none in-env (Chromium/Firefox/Safari all untestable here).
Route: github.com/parnish007/archmark/tree|blob/probe/github-rendering/probes/github (branch page + PROBE.md preview).
Commit SHAs: acbbd3b (matrix) → b738f18 (cache v2). Date: 2026-09-24.

| Probe | Delivery (file serves) | Rendered behavior | Verdict |
|---|---|---|---|
| static external SVG | PASS (raw 200, intact) | structure valid; visual pixels need browser | PASS delivery / INCONCLUSIVE pixels |
| picture light/dark | PASS (markup renders in PROBE.md preview) | theme-switch needs browser | PARTIAL |
| animate (opacity) | PASS (SMIL intact in served source) | motion needs browser | INCONCLUSIVE motion |
| animateTransform | PASS | motion needs browser | INCONCLUSIVE motion |
| animateMotion (path) | PASS | motion needs browser | INCONCLUSIVE motion |
| mpath | PASS (`<mpath href>` intact) | motion needs browser | INCONCLUSIVE motion |
| stagger/parallel | PASS | motion needs browser | INCONCLUSIVE motion |
| compound flow | PASS (begin-chain intact) | motion needs browser | INCONCLUSIVE motion |
| pulse/opacity/scale | PASS | motion needs browser | INCONCLUSIVE motion |
| freeze vs loop | PASS (fill/freeze + indefinite both intact) | behavior needs browser | INCONCLUSIVE motion |
| gradient/clipPath | PASS | paint needs browser | INCONCLUSIVE paint |
| a11y metadata | PASS (title/desc/role verified in source) | SR behavior needs AT | PASS source-level |
| static fallback | PASS (first frame meaningful by construction) | — | PASS |

Caching: raw reflects cache-same v2 immediately after push (no raw staleness). Camo/README-image
staleness UNTESTED (needs `<img>`-embedded README observation in browser). No query-string test
performed (not assumed). Content-addressed filenames NOT adopted — unjustified complexity today.

Screenshots: none capturable in text-only env (honest limitation, not fabricated).
Next: maintainer browser pass (Chromium + Firefox minimum; Safari if available) flips
INCONCLUSIVE → PASS/FAIL per probe; then ADR-004 CONFIRMED_PRIMARY or restricted subset.
