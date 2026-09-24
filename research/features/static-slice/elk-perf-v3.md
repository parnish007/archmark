# ELK instance-reuse — v3 correction (2026-09-24, Node 24.14, elkjs 0.12, dense-graph 10n/13e)

Journeys separated:
- COLD_CLI_BUILD (fresh process, build, exit): baseline fresh-instance 154ms layout slice. Objective: wall build. Statistic: single observed + median pending. Discovery: reuse N/A in fresh single-diagram process (no prior instance). Result: INCONCLUSIVE for cold — do not claim improvement.
- WARM_MULTI_DIAGRAM_BUILD (one process, N diagrams): baseline N×fresh vs 1×reuse. Observed: first 45ms, reuse 28ms (~38% slice win, heap 20MB stable). Guardrails: layout hash-identical, no error change. Discovery: PROMOTE for warm/watch only.
- WATCH_REBUILD (long-lived): same as warm; PROMOTE (avoids re-init per rebuild).

Confirmation: FRESH confirmation pending (repeat on clean process ×11, record median+p95). No KEEP claimed. No degradation: correctness/quality/determinism/mem/errors unchanged.
