# ADR-004 — Animation: SMIL-primary, IR-isolated

Status: SMIL_PRIMARY_CONFIRMED (with permanent static fallback). Date: 2026-09-25.

Scope of confirmation (exactly what evidence establishes — no more):
tested GitHub preview `<img>` delivery path, in Chromium 153, Firefox 155, and Playwright
WebKit 26.6 on Windows. "WebKit" here means the Playwright WebKit engine, NOT Safari on
Apple hardware (still unverified). macOS runtime and logged-in Camo behavior remain
unverified and are not claimed.

Evidence: real-browser matrix (Chromium 153, Firefox 155, WebKit 26.6; Windows; probe SHAs
91f4fbb→47d7391, plus generated-output matrix on production SVGs): every restricted-subset
primitive visibly animates in the GitHub preview `<img>` path — animate/animateTransform/
animateMotion/mpath/stagger/freeze/canonical all PASS with static controls at 0px.
Direct-SVG attribute reads confirm timelines advance. Static fallback stays
architecturally mandatory (first frame complete; M3 = reduced-motion output), not a fallback backend.

Proven: SVG_DELIVERY_CONFIRMED (16 isolated probes serve intact via github.com + raw)
and README_MOTION_CONFIRMED within the scope above (rendered pixels observed changing
over time in the GitHub preview path on all three engines).

## History (superseded — retained for context, not operative)

The ADR previously held PROVISIONAL / DELIVERY_CONFIRMED_MOTION_UNVERIFIED status: at that
time no browser was available in the verification environment, so pixel motion stayed
INCONCLUSIVE and the ADR explicitly forbade upgrading until pixel-level browser evidence
from the actual README path existed. That condition was satisfied by the 2026-09-25
browser matrix (isolated probes) and the generated-output matrix (production SVGs), which
promoted the status to the confirmed decision below. The old "must not upgrade" rule is
spent — it is preserved here only as history.

## Probe evidence (probe/github-rendering acbbd3b → b738f18, pre-browser phase)

All 16 isolated probes deliver intact via github.com + raw (SMIL/mpath/begin/freeze/loop/gradient/clip/a11y
verified in served source; PROBE.md preview renders references). Static delivery + fallbacks PASS;
picture theming PARTIAL. Caching: raw immediate; Camo staleness untested → no hashed filenames (unjustified).

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
