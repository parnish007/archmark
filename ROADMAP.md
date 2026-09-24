# ArchMark ROADMAP

Single package `archmark` v0. Local commits only; no push/publish without explicit approval. `research/` is local-only (gitignored, never pushed).

## Phase 0 — feasibility (in progress)
- [x] Competitor + platform + naming/license + visual councils (local research/, not pushed)
- [ ] probes/github/: static.svg, light/dark picture, SMIL animate/animateTransform/animateMotion+mpath, stagger/compound, filter/gradient, reduced-motion + static fallback
- [ ] Real README matrix on github.com/parnish007/archmark (manual verify, screenshots)
- [ ] Decisions: SMIL-confirm vs GIF-fallback, picture+2-files theming, budgets <100KB
- ADRs: ADR-001 pipeline/boundaries, ADR-002 naming/license (Apache-2.0, archmark bin), ADR-003 visual default Calm, ADR-004 animation SMIL-primary

## Phase 1 — spec (done draft)
- [x] SPEC.md / ARCHITECTURE.md / ROADMAP.md

## Phase 2–9 — static vertical slice (current)
- [ ] language: tokenizer+parser+diagnostics (Langium boundary reserved)
- [ ] core: IR compiler (hoisting, validation, suggestions) + LayoutEngine + ELK + scene
- [ ] renderer: tokens + bespoke core icons (specimen) + deterministic static SVG light/dark + SVGO safe config
- [ ] markdown: byte-range extract/patch
- [ ] cli: init/build/check + fixtures + golden hashes + fuzz + `check` determinism
- Gate: fixtures look publication-quality (no overlap/clip/spaghetti/misaligned icons)

## Phase 10–12 — animation (contracts now, impl next)
- [ ] Flow IR → Timeline IR → Animation IR types + validators (no SVG leakage)
- [ ] SMIL backend (animateMotion on real `d`, keySplines, begin-chaining) only after Phase 0 confirms
- [ ] FrameSequence fallback if probe fails

## Phase 13+ — deferred
Perf protocol, Action, playground, VS Code, views. Each with 10-gate critique + retrospective.
