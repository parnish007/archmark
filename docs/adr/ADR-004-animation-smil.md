# ADR-004 — Animation: SMIL-primary, IR-isolated

Status: SUPPORTED_WITH_LIMITATIONS (probe-observed delivery; visual motion pending browser). Date: 2026-09-24.

## Probe evidence (probe/github-rendering acbbd3b → b738f18)
All 16 isolated probes deliver intact via github.com + raw (SMIL/mpath/begin/freeze/loop/gradient/clip/a11y
verified in served source; PROBE.md preview renders references). No browser in verification env, so pixel
motion stays INCONCLUSIVE — NOT claimed. Static delivery + fallbacks PASS; picture theming PARTIAL.
Caching: raw immediate; Camo staleness untested → no hashed filenames (unjustified).

## Context
GitHub strips JS; CSS survival contested; community SMIL cookbooks animate in README <img> via camo, but GitHub promises nothing.

## Evidence
caniuse SMIL Widely Available (~96.6%); 2015 deprecation withdrawn; Chromium fixing SMIL 2025. html-pipeline strips style/class/onclick, keeps picture/source/img. PerfectReadme (SMIL-only) vs dynimage (claims CSS works) → conflict → must probe. animateMotion+mpath on real edge `d` beats dash tricks (constant paced velocity, rotate auto, keyPoints slow-at-target).

## Decision (restricted subset until browser confirmation)
Flow IR → Timeline IR → Animation IR with StaticSVGRenderer (always) + SMIL backend restricted to:
animate (opacity/r), animateTransform (scale/translate), animateMotion (paced + mpath), set/begin-chaining,
freeze; indefinite loops forbidden except ambient pulse (and never default). No style/keyframes/JS/filters.

## Rejected
- Assume SMIL dead → GIF now: loses sharpness, bloat.
- CSS/JS animation for README: stripped.
- Animation coords in DSL: contaminates semantics.
