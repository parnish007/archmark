# ADR-003 — Visual identity default

Status: accepted. Date: 2026-09-24.

## Context
README-first diagrams must look publication-quality; beauty is correctness.

## Evidence
Visual council: Munzner node-link <100 nodes; Tufte data-ink; orthogonal H/V for engineered feel; Lucide/Feather 24-grid 2px round currentColor; system stacks only (webfonts fail in <img>/Camo); <picture>+2 files theming (GitHub-native) over in-SVG media.

## Decision
Default Calm Technical Precision (restrained neutrals, 1 accent, orthogonal, whitespace). Blueprint secondary later. Bespoke core icon family 24-grid stroke-2 round, optical correction, specimen at 16/20/24/32/48 light+dark. Tokens in SPEC §6. 3 visual candidates → blind council before freeze.

## Rejected
- Glass/gradient default: decorative, ages poorly.
- Blueprint default: niche, weaker light README.
- Mixed icon libraries: weight/cap mismatch.
