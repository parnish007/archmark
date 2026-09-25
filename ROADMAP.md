# ArchMark ROADMAP

Single package `archmark` v0. Apache-2.0.

## Shipped (v0 core)

- DSL: components, connections, groups (1 level), typed flows, excellent diagnostics (AM codes)
- Semantic IR → ELK compound layout (truthfulness-gated) → deterministic static SVG (light/dark)
- Semantic animation compiler: Flow → Timeline → Animation IR → SMIL (verified subset)
- CLI: `init` / `build` / `check`, all-or-nothing writes, CI-friendly exit codes
- Bespoke core icon family (24 kinds), Calm Technical Precision visual system

## Next (not started)

- `watch` / `fmt` commands
- Views (multiple projections of one model)
- Frame-sequence fallback backend (only if evidence demands)
- Editor integrations (Langium LSP deferred)
- GitHub Action (reuses CLI/core)

## Non-goals (v0)

Playground, VS Code extension, vendor icons, Terraform/K8s scanning, hosted service.
