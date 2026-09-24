# ADR-004 — Animation: SMIL-primary, IR-isolated

Status: accepted. Date: 2026-09-24.

## Context
GitHub strips JS; CSS survival contested; community SMIL cookbooks animate in README <img> via camo, but GitHub promises nothing.

## Evidence
caniuse SMIL Widely Available (~96.6%); 2015 deprecation withdrawn; Chromium fixing SMIL 2025. html-pipeline strips style/class/onclick, keeps picture/source/img. PerfectReadme (SMIL-only) vs dynimage (claims CSS works) → conflict → must probe. animateMotion+mpath on real edge `d` beats dash tricks (constant paced velocity, rotate auto, keyPoints slow-at-target).

## Decision
Flow IR → Timeline IR → Animation IR (send/request, response, pulse, activate, state-change, parallel, wait, fail, reroute, recover) with StaticSVGRenderer (frozen frame, always) + SMILAnimatedSVGRenderer (primary if Phase 0 confirms) + FrameSequenceRenderer (fallback). Same DSL, no coords/durations. Static complete without motion; reduced-motion fallback. Durations micro 200/flow 500/traverse 700/ambient 1200/stagger 90; easing standard 0.2 0 0 1. No GIF canonical (vector sharpness); GIF only as compat backend if probe fails.

## Rejected
- Assume SMIL dead → GIF now: loses sharpness, bloat.
- CSS/JS animation for README: stripped.
- Animation coords in DSL: contaminates semantics.
