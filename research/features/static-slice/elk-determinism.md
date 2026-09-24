# ELK determinism (2026-09-24)

Seed org.eclipse.elk.randomSeed=42 + considerModelOrder NODES_AND_EDGES + pinned elkjs 0.12.0 + sorted input + 2dp rounding.
Test: dense-graph 10 runs fresh ElkLayout each → sha256 identical 10/10 (5395e6805027…). Clean-clone rebuild also hash-stable (check fresh).
Scope: repeated builds + fresh processes verified; OS matrix (Linux/macOS) + reinstall pending. If nondeterminism appears: isolate via input sort + seed + version pin + post-normalize (round/sort), never claim unproven determinism.
Regression: tests/pipeline.test.ts deterministic-SVG test guards this.
