# Benchmark definitions (tracked — evidence contracts, not results)

## build-small
Workload: fixtures/simple-three-node (4 nodes/3 edges). Env: record node/pnpm/archmark/elk versions, OS/CPU. State: cold + warm. Objective: total `archmark build` wall time. Statistic: median of 11 + p95. Threshold: PROMOTE only if >10% + >100ms and visual guardrails pass.

## build-medium (100-node nested)
Workload: benchmarks/fixtures/medium-100.archmark (generate deterministically). Objective: layout latency split (parse/compile/ELK/scene/SVG/patch). Statistic: p50 + p95. Guardrails: no overlap/clip, SVG <100KB.

## animation-compile
Workload: 10-node flow → Timeline→Animation IR → SMIL size. Objective: compile ms + asset bytes. Statistic: median.

## Method (Perf v3)
scope journey → contracts → baseline → decompose → profile dominant → falsifiable hypothesis → reversible experiment → visual checks → discovery PROMOTE/REVERT/INCONCLUSIVE → freeze → fresh confirmation → KEEP/REVERT/INCONCLUSIVE → CI budget ratchet. Raw results go to benchmarks/results/ (ignored); only definitions/budgets/scripts tracked.
