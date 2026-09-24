# ADR-002 — Naming, license, binary

Status: accepted. Date: 2026-09-24.

## Context
Need npm name, bin, license, remote policy. Live audit 2026-09-24 (evidence in local-only research/, never pushed).

## Evidence
- registry.npmjs.org/archmark → 404 free; @archmark/cli, @archmark/core → 404 free.
- github.com/parnish007/archmark exists empty (canonical). User `archmark` squatted; org `archmark` unavailable.
- sparkymat/archmark (Go bookmarks, AGPL) + archmark.co (architect marketing) — different classes, disclose non-affiliation.
- Deps: TS Apache-2.0, Langium/Vite/Vitest/React/SVGO MIT, Playwright Apache-2.0, elkjs EPL-2.0 OR GPL-3.0 (consume under EPL-2.0, external dep, ASF Category B).

## Decision
Apache-2.0 (patent grant for infra tool). npm `archmark` primary (fallback @archmark/cli), bin `archmark`. Stay on parnish007/archmark; reserve npm org when credentials approved. THIRD_PARTY_NOTICES.md from first release. README footer non-affiliation note. No push/publish/PR without explicit human approval; local commits only. research/ gitignored local-only.

## Alternatives rejected
- MIT: weaker patent grant for corporate adoption.
- Immediate org `archmark`: blocked by squatter.
- Vendoring ELK: triggers EPL source obligations; keep external dep.

## Consequences
Claim npm names before launch; license-checker CI; vendor icons separate opt-in package.
