# Browser motion performance (measured 2026-09-24, Chromium 153, local files)

Workloads (rAF deltas, 360 frames each, wall-clock):
- canonical-request (53 SVG els): p50 16.7, p95 16.8, p99 16.8, max 16.8, longFrames>50ms 0.
- stagger-parallel (14 els): identical distribution, 0 long frames.
- failure-recovery (20 els): identical, 0 long frames.

Interpretation (honest): deltas are vsync-quantized — the harness resolves scheduling, not sub-frame
SMIL cost. Zero long frames + zero dropped rAF ticks across 1080 frames means no observable jank;
it does NOT prove "60fps smoothness" as a universal rule (per contract). Tail: no stutter observed.
Asset sizes: canonical 4.6KB (5-node), M1 1.1KB, stagger 0.8KB, failure 1.3KB — all <2% of budget.
Limit: CDP tracing for paint/layout cost not run (env time); element counts small enough that risk is low.
Guardrail holds: nothing to optimize away — no KEEP/REVERT needed (no change proposed).
