# GitHub compatibility — PROVISIONAL / PENDING REAL-GITHUB CONFIRMATION

Do not treat local probes as GitHub proof. ADR-004 remains provisional until github.com observation.

## Established (source)
html-pipeline Selma allowlist keeps picture/source/img, strips svg/style/script/iframe/foreignObject inline; Camo proxies `<img>` (~5MB, HMAC, cached); inline `<svg>` in Markdown stripped → external `.svg` via `![]()`/`<img>`; `<script>` never runs in `<img>`; blob-viewer "no animation" ≠ README behavior; `#gh-*-mode-only` deprecated → `<picture>+prefers-color-scheme`.

## Contested (needs matrix)
SMIL-works cookbooks vs CSS-works claims vs PerfectReadme SMIL-only rule. Interim: pure SMIL + native gradients/filters only; no style/keyframes/foreignObject/JS.

## Matrix (local first, then real-GitHub experiment)
| ID | Probe | Local browsers | Real GitHub |
|---|---|---|---|
| GH-01 | static external SVG via `![](file.svg)` | TODO Playwright | TODO observ |
| GH-02 | `<picture>` light/dark | TODO | TODO (+mobile app) |
| SMIL-01 | animate / animateTransform / set | TODO | TODO |
| SMIL-02 | animateMotion + mpath on real `d`, rotate auto | TODO | TODO |
| SMIL-03 | keySplines easing, keyTimes | TODO | TODO |
| SMIL-04 | stagger (begin offsets) + compound (begin=prev.end) | TODO | TODO |
| SMIL-05 | opacity / scale pulse | TODO | TODO |
| NEG-01 | `<style>@keyframes` (expect stripped) | TODO | TODO |
| NEG-02 | foreignObject (expect stripped) | TODO | TODO |
| PERF-01 | gradients / filters cost | TODO | TODO |
| A11Y-01 | title/desc/role + reduced-motion fallback frame | TODO | TODO |

Artifacts: probes/github/*.svg + README matrix + screenshots. Real-GitHub experiment spec: research/features/static-slice/github-experiment.md (prepared, executes after push authorization). Budgets: <100KB target, <512KB cap.
