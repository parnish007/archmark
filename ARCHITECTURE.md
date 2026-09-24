# ArchMark ARCHITECTURE

Pipeline: Source → AST → Semantic Architecture IR → View/Flow IR → Layout Graph → ELK → SceneGraph → Renderers (Static SVG / SMIL / Frames). See SPEC.md §3–9 for types.

## Boundaries (hard)
- Parser (src/language) does not render, does not know SVG/ELK. Hand-written v0 deterministic parser behind `parse(source): {ast, diagnostics}`; Langium grammar/LSP plugs in later without changing IR.
- Semantic compiler (src/core/model) does not parse text, does not layout. `compile(ast): {model, diagnostics}` with hoisting + validation.
- Layout (src/core/layout): `LayoutEngine` interface only. `ElkLayout` default (elkjs 0.12, seed 42). Converts IR→ELK-JSON→Placed→SceneGraph. No Markdown/SVG knowledge.
- SceneGraph (src/core/scene): pure data, grid-snapped, sorted, rounded. Renderer input.
- Renderer (src/renderer): operates from SceneGraph only. `renderStatic(scene, theme)`, `renderSMIL(scene, animIR, theme)` (next), tokens + icons local. Deterministic, headless, no network.
- Markdown (src/markdown): byte-range extract/patch only. No architecture semantics.
- CLI (src/cli): thin orchestration, no compiler duplication. Action reuses same core (later).

## Directory map (single package v0)
```
src/language/ parser.ts tokenizer.ts diagnostics.ts
src/core/ ir.ts compiler.ts layout.ts scene.ts animation-ir.ts
src/renderer/ tokens.ts icons.ts svg.ts smil.ts (stub) svgo.ts (config)
src/markdown/ extract.ts patch.ts
src/cli/ cli.ts commands.ts
probes/github/ (Phase 0 feasibility SVGs + README matrix)
fixtures/ (canonical archmark sources + expected SVG hashes)
examples/ (README demos)
research/ (council reports)
docs/adr/
```

## Determinism
Sort ids; ELK seed 42 + pinned version; 2dp rounding; attribute order fixed; sorted defs; no Date.now; SVGO pinned config multipass:false. `check` asserts hash-stable.

## Security
Central escape/validate/sanitize; caps; no eval; no network fetch in render.

## Evolution
Split to @archmark/* only when independent consumption justifies. React only for playground later, never renderer. Animation backends added without touching parser/SVG-static.
