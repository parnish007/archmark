# Motion performance (Perf v3 — discovery, 2026-09-24, Node 24.14)

Journey: 10-node flow → Timeline→Animation IR → SMIL asset (local compile; browser frame pacing pending Playwright).
Baseline: dense-graph (10n/13e) ELK layout ~1.1s cold (ELK init dominates), SVG 5–9KB, 48 visual-candidate SVGs total 265KB.
Decomposition: parse <5ms, compile <5ms, ELK ~1000ms, scene <5ms, SVG <10ms. Dominant = ELK init per process.
Discovery experiments: (1) single ElkLayout instance per run — PROMOTE (5 blocks avoid 5× init); (2) ELK timeout 10s guard — PROMOTE (fail-closed, no visual change); (3) SMIL r+opacity only, no filters — PROMOTE (avoids GPU cost; visual guardrail).
Guardrails (conjunctive): no icon fidelity loss, no typography damage, no tail stutter. Any violation → REVERT.
Confirmation: fresh-process rebuild hash-identical (ELK seed 42, 10/10 same sha). KEEP: instance reuse + timeout + filter ban.
Budgets: see benchmarks/budgets/v0.md. Browser p95/p99 frame pacing + CPU/mem remain PENDING (Playwright harness ticketed) — no KEEP claims on smoothness yet.
