# ArchMark animation (v0)

Each named flow compiles to its own animated asset pair:

```
archmark.<diagram>.<flow>.light.svg
archmark.<diagram>.<flow>.dark.svg
```

embedded beside the static diagram with its own README region. No "first flow wins".

## Pipeline

Flow IR (semantics) → Timeline (sequence/deps/durations) → Animation IR (typed ops +
M1 motion tokens) → SMIL renderer (verified subset only).

## Motion language (M1 crisp-technical)

- request: solid packet travels the real routed edge (`animateMotion` + `mpath`), target pulses.
- response: hollow packet, lighter emphasis, distinguishable without color.
- write/read: solid travel + store/hollow receive pulse. event: broadcast echoes (90ms stagger).
- failure: double red ring (count redundancy, not color-only). recovery: thick ring.
- Packets fade out on arrival — the frozen end state equals the static diagram.

Tokens (`src/animation/tokens.ts`): requestTraverse 700ms, responseTraverse 500ms,
activation/receivePulse 200ms, stateTransition 400ms, stagger 90ms, settle 200ms.
One play + freeze; no indefinite loops; no filters/glow/bounce/dash tricks.

## Parallelism, precisely

There is no general parallel DSL syntax in v0. The timeline's dependency structure supports
ordered sequencing; the only user-expressible fan-out is the `event` step's broadcast
choreography (base pulse + two staggered echoes at +90/+180ms). Do not read more into it.

## Static-first accessibility

Every animated file's first frame is the complete static diagram (`<title>`/`<desc>`/`role="img"`).
There is no browser-runtime `prefers-reduced-motion` switch inside the SVG (GitHub-safe
mechanisms for that were not proven); instead, embed the static pair wherever fully static
output is wanted — it carries identical meaning. Wording matters: we provide a static
fallback/output, not an automatic reduced-motion switch.

## Verification

SMIL subset (animate/animateTransform/animateMotion+mpath/set/begin/freeze) verified animating
in Chromium/Firefox/WebKit through the GitHub preview path (see docs/adr/ADR-004).
`set` isolation: PASS all engines. Compound chains: PASS.
