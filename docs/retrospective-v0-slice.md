# Retrospective — v0 static vertical slice (2026-09-24)

## Useful research
Competitor wedge (semantic+deterministic+README+SMIL nobody bundles), platform proof (SMIL widely-available, html-pipeline allowlist, camo 5MB, ELK seed, SVGO safe-subset), naming/license live audit (archmark free, Apache-2.0 + EPL-2.0 dep plan), visual tokens (orthogonal default, 24-grid stroke-2, system fonts, picture+2-files).

## Wasted / deferred
Full Langium grammar day-1 (reserved boundary, hand parser v0 instead); 20-package split (single package, ADR-001); GIF fallback impl (contracts only until probes confirm); playground/VSCode/views (roadmap).

## Critique findings (red-team Gate 10, all addressed or ticketed)
CRITICAL fixed: CLI path traversal (cwd containment), DoS caps fatal + 256KB/2000-line + ELK 10s timeout, single ELK instance, parser scope stack + unclosed diagnostic, check dry-run (no write), validateSvgName allowlist, suggest caps + core-owned (boundary), flattened icons (no nested svg), midpoint halo labels (no textPath), xlink ns, run() testable, bin path.
Debt: nested-group support (v0 errors, views later); full 21-icon optical pass + 3 visual candidates blind review (specimen stub; required before v0.1 tag); picture-vs-gh-fragment theming A/B in real README (probes committed, screenshots pending); SVGO integration (safe config documented, not wired); Playwright visual regression (fixtures defined, harness pending).

## Benchmarks
4-node build <2s cold (ELK init dominates); 12 tests pass; SVG 3.5KB (<100KB budget); check deterministic (hash-stable rebuild).

## Process
Parallel research subagents saved ~1 day; red-team caught 16 issues pre-commit (path traversal + check-rewrites most valuable). Single-package + small commits kept bisectable. research/ gitignored local-only — verified `git check-ignore`.
Next: Phase 0 real-README screenshots → SMIL backend → SVGO wiring → visual candidates A/B/C.
