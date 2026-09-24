# Competitor findings (curated, tracked — 2026-09-24)

Wedge: nobody bundles semantic + deterministic auto-layout + README-native + SMIL motion + clean diffs.

- Mermaid (DEEP): only native README fenced-block renderer. Generic boxes; layout is suggestion-only (arch-beta overlap #6120, no arch edge labels #6322, no group→group #7211); syntax traps (`end`, YAML-in-DSL #7044); GitHub pins old version; fcose unseeded randomness. Copy: zero-friction block UX. Avoid: hint hacks, keyword collisions, per-engine silent incompat.
- D2 (DEEP): best DSL DX (indentation scope, multi-error, `d2 fmt`, LSP). Layout abstraction (Dagro default, elk-go, commercial TALA). TALA orthogonal/container/label-aware is best but closed/binary — README story requires prebuilt SVG. Copy: formatter, layout interface, orthogonal-first.
- Structurizr/C4 (DEEP): only true model≫views; forces abstraction discipline. No hoisting by design; layout stored outside source (ID-order merge loses manual layout); auto-layout Graphviz-based poor; README-hostile (embed key / stale PNG). Copy: fixed lexicon, views-as-functions. Avoid: order-dependent IDs, click-layout.
- PlantUML (FOCUSED): full UML, deterministic Java; verbose, server-bound, dated aesthetics.
- Graphviz DOT (FOCUSED): Sugiyama reference; `splines=ortho`+ports/labels maintainer-confirmed broken (#1415); statement order affects layout. Use as fallback vocabulary (minlen/rank), not exposed attrs.
- Kroki (LANDSCAPE): gateway; view-time external dep fragile (privacy/rate/CSP/Camo). Build-time fallback only.
- LikeC4 (FOCUSED): hoisting, custom meta-model, LSP+MCP; still serve/build + dense auto-layout struggles.
- Animation: only SMIL survives `![](.svg)`/`<img>`; CSS needs inline HTML (stripped); JS stripped. GSAP grammar compiles to SMIL; never ships JS to README.

Decision: arch → deterministic SVG pure function; semantic DSL; port-aware orthogonal; dual themed + SMIL + frozen fallback; committed artifact + check gate + layout hash; positional multi-error; MCP-first later.
