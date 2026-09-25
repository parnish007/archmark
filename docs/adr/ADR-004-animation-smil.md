# ADR-004 — Animation: SMIL-primary, IR-isolated

Status: SMIL_PRIMARY_CONFIRMED (with permanent static fallback). Date: 2026-09-24.

Evidence: real-browser matrix (Chromium 153, Firefox 155, WebKit 26.6; Windows; probe SHAs
91f4fbb→47d7391): every restricted-subset primitive visibly animates in the GitHub preview `<img>`
path — animate/animateTransform/animateMotion/mpath/stagger/freeze/canonical all PASS with static
controls at 0px. Direct-SVG attribute reads confirm timelines advance. Static fallback stays
architecturally mandatory (first frame complete; M3 = reduced-motion output), not a fallback backend.

Proven: SVG_DELIVERY_CONFIRMED (16 isolated probes serve intact via github.com + raw).
Unproven: README_MOTION_UNVERIFIED (no rendered pixels observed changing over time in GitHub README;
source-markup intactness is not a motion guarantee). This ADR must not upgrade until pixel-level
browser evidence from the actual README exists.

## Probe evidence (probe/github-rendering acbbd3b → b738f18)
All 16 isolated probes deliver intact via github.com + raw (SMIL/mpath/begin/freeze/loop/gradient/clip/a11y
verified in served source; PROBE.md preview renders references). No browser in verification env, so pixel
motion stays INCONCLUSIVE — NOT claimed. Static delivery + fallbacks PASS; picture theming PARTIAL.
Caching: raw immediate; Camo staleness untested → no hashed filenames (unjustified).

## Context
GitHub strips JS; CSS survival contested; community SMIL cookbooks animate in README <img> via camo, but GitHub promises nothing.

## Evidence
caniuse SMIL Widely Available (~96.6%); 2015 deprecation withdrawn; Chromium fixing SMIL 2025. html-pipeline strips style/class/onclick, keeps picture/source/img. PerfectReadme (SMIL-only) vs dynimage (claims CSS works) → conflict → must probe. animateMotion+mpath on real edge `d` beats dash tricks (constant paced velocity, rotate auto, keyPoints slow-at-target).

## Decision (restricted subset, browser-verified 2026-09-25)
Flow IR → Timeline IR → Animation IR with StaticSVGRenderer (always) + SMIL backend restricted to:
animate (opacity/r), animateTransform (scale/translate), animateMotion (paced + mpath), set
(discrete state; isolated local probe PASS Chromium/Firefox/WebKit 0→1→0.2 observed), begin-chaining,
freeze; indefinite loops forbidden except ambient pulse (and never default). No style/keyframes/JS/filters.

## Rejected
- Assume SMIL dead → GIF now: loses sharpness, bloat.
- CSS/JS animation for README: stripped.
- Animation coords in DSL: contaminates semantics.
