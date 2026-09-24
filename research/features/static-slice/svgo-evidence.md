# SVGO evidence (2026-09-24 — NOT wired; decision: pending)

Canonical bytes established BEFORE optimization: all renderer outputs deterministic (sorted ids/attrs, 2dp, no timestamps; 10/10 rebuild identical).
Safe-subset config prepared (research/COVERAGE_LEDGER + SPEC): keep viewBox/title/desc/ids/mpath refs/order/animation attrs; multipass false; floatPrecision 2; prefixIds for cleanupIds.
Must-not-destroy checklist: mpath href targets, am-arrow marker, aria title/desc, viewBox scaling, theme fills, begin= references, deterministic order.
Benefit measurement: current SVGs 0.7–9KB — SVGO savings expected <15% (<1.5KB). Verdict: INCONCLUSIVE/DEFERRED — wire only if benefit >10% with zero checklist failures on all 48 candidates + 6 specimens + 3 motion prototypes. Evidence decides; omission acceptable.
