# Real-browser motion matrix (Playwright 1.63, 2026-09-24, probe SHAs 91f4fbb→881fa29)

Method: fresh page per probe, element screenshots, pixelmatch absolute-px thresholds
(PASS animated: >120 changed px; static control must be ~0). Static controls PASS 0px all engines
(methodology valid). Direct-SVG attribute reads (ground truth): motion dot x 70→167→263 and opacity
0.98→0.57→0.23 prove SMIL timelines run in Chromium + Firefox.

| Probe | Chromium 153 | Firefox 155 | WebKit 26.6 |
|---|---|---|---|
| animate (opacity) | PASS 1176px | PASS 1187px | PASS 1176px |
| animateTransform (scale) | PASS 370px | PASS 296px | PASS 336px |
| animateMotion (path) | PASS 162px | PASS 167px | PASS 158px |
| mpath | PASS 159px | PASS 171px | PASS 159px |
| stagger + parallel | PASS 309px | PASS 339px | PASS 309px |
| freeze vs loop | PASS 360px | PASS 164px | PASS 463px |
| compound flow | PARTIAL (0px; 1.8s finite chain completes before measure window; begin-chaining itself verified via canonical chains) | PARTIAL same | PARTIAL same |
| canonical M1 (5-node) | PASS 176px | PASS 190px | PASS 144px |
| failure-recovery | unmeasured (added after matrix; same primitives as PASSed set) | — | — |
| gradient / clip | PASS delivery (paint unmeasured numerically) | — | — |
| static controls | PASS 0px | PASS 0px | PASS 0px |

*Chromium animateMotion first run INCONCLUSIVE (harness clip error), PASS on rerun.
Delivery: raw.githubusercontent 200 image/svg+xml; no camo URLs in logged-out blob preview.
OS: Windows. Screenshots/traces: benchmarks/results (ignored, local).
Conclusion: every SMIL primitive in the restricted subset visibly animates in all three engines
in the GitHub preview `<img>` path. Compound full-chain timing needs a longer-window re-probe.
(Rerun note: isolated transient clip ERRORS occur on ~1 probe/run — affected probes PASS on adjacent runs.)
