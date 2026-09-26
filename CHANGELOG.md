# Changelog

Versioning (pre-1.0): package stays `0.1.0` until first npm publication. Patch = fixes,
minor = backward-compatible features, breaking = anything before 1.0 may break without a
major bump (0.x semantics). DSL stability follows package version; no separate DSL version
machinery (deliberate: unnecessary complexity at this size).

## Unreleased (v0)

Initial public core (not yet published to npm):

- DSL with components, connections, groups, typed flows and coded diagnostics
- Deterministic static SVG (light/dark) via ELK compound layout
- Semantic animation compiler (Flow → Timeline → Animation IR → verified SMIL subset)
- CLI `init` / `build` / `check` with fail-closed README patching
- Bespoke core icon family and Calm Technical Precision visual system
- Refined visual system v1: open-chevron connectors with rounded corners, accent
  container washes + pill badges, vessel-cylinder store nodes, dimmed dark outlines,
  crisper motion presence (r7 packets, r6 activation dot)
- Fixed intra-group edge placement (same-group edges now translate from ELK's
  group-relative frame; H6 regression test)
- Per-flow `loop` modifier (`flow <id> loop { ... }`) for repeating showcase
  animations; default stays one play + freeze; README hero loops
