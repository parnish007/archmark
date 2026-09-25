# ADR-001 — Pipeline and package boundaries

Status: accepted. Date: 2026-09-24.

## Context
Constitution proposes packages/language, core, renderer, markdown, cli + action + playground. Repo empty, single maintainer, Windows + Node 24.

## Evidence
Competitor council: D2 compiler+plugin layout enables quality; Structurizr layout-outside-source harms DX; Mermaid generic core stretched. Platform: ELK 1.6MB toolchain-only, Langium MIT v4 stable, SVGO safe-subset required.

## Decision
Single npm package `archmark` v0 with internal module boundaries under src/ (language/core/renderer/markdown/cli). Hard boundaries via imports only (parser↛renderer, renderer↛parser, layout↛markdown, CLI thin). ELK behind `LayoutEngine`; Langium behind `parse()` boundary. Split to @archmark/* only on independent-consumption evidence.

## Alternatives rejected
- 5-package monorepo now: premature versioning/publish overhead, no consumer.
- Framework renderer (React): leaks into SVG determinism, violates headless requirement.

## Consequences / risks
Fast iteration, clean split path. Risk: boundary erosion → mitigate via import lint + 10-pass review.
