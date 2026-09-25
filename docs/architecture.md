# ArchMark architecture

```
Source → AST → Architecture IR → View/Flow IR → Layout Graph → ELK → SceneGraph
→ Static SVG / Animated SVG (SMIL) → README (CLI)
```

Module map: `src/language` (parser) → `src/core` (IR, compiler, layout, scene) →
`src/flow` (plan, timeline) → `src/animation` (tokens, IR) → `src/renderer`
(shared scene layer + static/SMIL backends). Outside: `src/markdown` (region scanner,
byte-range patching), `src/cli` (thin orchestration).

Dependency direction is one-way inward. Enforced by boundary tests
(`tests/animation/compiler.test.ts` "no-glue boundaries"): flow/timeline import no
rendering; renderers import no parsers/compilers/markdown/CLI; parser imports nothing
project-internal except IR types.

Key contracts:

- Determinism: sorted inputs, ELK seed 42, 2dp rounding, stable edge IDs
  (`from--to[#n]`), namespaced SVG IDs (`am-*` + collision suffixes), no timestamps.
- Layout: ELK compound groups (`INCLUDE_CHILDREN`) with P5/P6 truthfulness gates;
  timeout abandons (never hard-cancels) at 10s.
- Markdown: fence-aware scanner, fail-closed AM21xx, unique source IDs, atomic
  temp-file writes, all-or-nothing builds, warn-only stale assets.
- Animation: strict flow topology (AM3102), capped timelines (AM3201/AM3203),
  motion tokens as single timing source, verified SMIL subset output.

See SPEC.md (contracts), ARCHITECTURE.md (module map), docs/adr/ (decisions).
