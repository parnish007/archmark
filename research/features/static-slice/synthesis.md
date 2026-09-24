# static-slice — synthesis

Pipeline Source→AST→IR→View/Flow→LayoutGraph→ELK→Scene→SVG; markdown byte-range patch; CLI thin.
Options considered: (A) single package v0 (chosen: no consumer justifies split); (B) 5-package monorepo (rejected: overhead); (C) React renderer (rejected: determinism/headless).
Layout: ELK layered orthogonal behind interface, seed 42, single instance/run, 10s timeout, self-edges skipped + loop drawn explicitly.
SVG: flattened icons, midpoint halo labels, xlink ns, sorted ids, 2dp, no timestamps. Check is dry-run (never writes).
Evidence: COMPETITOR_FINDINGS, COVERAGE_LEDGER, GITHUB_COMPATIBILITY (provisional), red-team critiques.
