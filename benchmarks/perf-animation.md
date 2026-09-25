# Animation performance — Perf v3 verdict (2026-09-25, Node 24.14)

Journey: DSL → plan → timeline → Animation IR → SMIL render (ELK layout included).
Workloads: simple-three-node (10 ops / 7.1KB), ai-agent (15 ops / 11KB), dense-graph (no flows).
Objective: animation compile+render latency + asset bytes. Statistic: wall ms, single observation + budgets.
Baseline: 28–113ms total, assets 7–11KB (<11% of 100KB budget).

Decomposition: ELK layout dominates (26–110ms); plan+timeline+IR+SMIL <5ms combined.
No falsifiable bottleneck in animation compilation itself → no discovery experiment justified.

Verdict: NO_WORTHWHILE_IMPROVEMENT (valid stopping-rule outcome). Browser rAF: 1080 frames,
0 long frames >50ms, vsync-quantized (harness resolves scheduling, not sub-frame cost).
Guardrails (correctness, visual/motion quality, determinism) untouched — nothing changed.
Budgets hold: animation compile <500ms, SMIL assets <100KB (see benchmarks/budgets/v0.md).
