# ArchMark ARCHITECTURE

Pipeline: Source → AST → Architecture IR → Flow IR → Timeline → Animation IR →
Layout Graph → ELK → SceneGraph → Renderers (Static SVG / SMIL) → README (CLI).
See SPEC.md §3–9 for contracts and `docs/` for user documentation.

## Boundaries (hard, test-enforced)

- Parser (`src/language`) renders nothing, knows no SVG/ELK/Markdown.
- Semantic compiler (`src/core/compiler`) parses no text, lays out nothing.
- Layout (`src/core/layout`): `LayoutEngine` interface only; `ElkLayout` default
  (elkjs 0.12, seed 42, compound groups, 10s fail-closed timeout). No Markdown/SVG knowledge.
- SceneGraph: pure data (grid-snapped, sorted, 2dp). Renderer input; knows no timing.
- Flow (`src/flow`): plan (semantics) + timeline (timing) know no rendering.
- Animation (`src/animation`): tokens (single timing source) + IR (typed ops) know no SVG.
- Renderer (`src/renderer`): shared scene layer + static/SMIL backends; consumes only
  Scene + AnimationIR + Theme. Never parses, never reads Markdown.
- Markdown (`src/markdown`): fence-aware region scanner + byte-range patching only.
- CLI (`src/cli`): thin orchestration (parse args → core services → diagnostics → exit code).

## Directory map (single package v0)

```
src/language/ parser.ts
src/core/ ir.ts compiler.ts layout.ts suggest.ts diagnostics.ts
src/flow/ plan.ts timeline.ts
src/animation/ tokens.ts ir.ts
src/renderer/ tokens.ts icons.ts icon-candidates.ts candidates.ts ids.ts scene-svg.ts svg.ts smil.ts
src/markdown/ scanner.ts extract.ts
src/cli/ cli.ts
tests/{integration,markdown,animation,security}/
docs/ (user docs + ADRs)
examples/hero/ fixtures/
```

## Determinism

Sort ids; ELK seed 42 + pinned version; 2dp rounding; stable edge/SVG ids; fixed attribute
order; no timestamps. `archmark check` asserts hash-stable output.

## Security

Central escape/validate/sanitize; allowlisted filenames; cwd containment; caps;
atomic writes; no eval; no network fetch in render.

## Evolution

Split to @archmark/* only when independent consumption justifies. React only for
playground later, never renderer. New animation backends consume AnimationIR unchanged.
