# ELK reuse — fresh confirmation (frozen: single shared ElkLayout per process, 10s timeout)

Warm multi-diagram (1 process × 11 dense-graph layouts): sorted ms 17,19,20,31,32,32,33,34,36,44,102;
median 32, p95 102 (first-layout init outlier), hash identical 11/11. Guardrails: layout bytes identical,
no error/memory/visual change. Verdict: KEEP for WARM_MULTI_DIAGRAM and WATCH_REBUILD.
Cold CLI (fresh process × 5): 154–179ms layout slice, identical hash 5/5; single-diagram cold pays init
once regardless — reuse inapplicable. Decomposed 4-node cold total ~293ms: imports ~9ms (parser 4,
compiler 1, layout/ELK lib 4); remainder is Node startup, not ELK compute. Verdict cold: INCONCLUSIVE
(no candidate improves it; do not replace ELK — computation is not the problem).
