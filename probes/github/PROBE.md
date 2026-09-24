# ARCHMARK PHASE-0 RENDERING PROBE — NOT PRODUCT DOCUMENTATION

Branch `probe/github-rendering` only. Each probe isolates ONE mechanism for attribution.

## static external SVG
![static](./p-gh-01-static.svg)

## picture light/dark
<picture><source media="(prefers-color-scheme: dark)" srcset="./p-gh-01-static.svg" /><img alt="probe static" src="./p-gh-01-static.svg" /></picture>

## animate (opacity)
![animate](./q-animate-opacity.svg)

## animateTransform (scale)
![transform](./q-animate-transform.svg)

## animateMotion (path attr)
![motion](./q-animate-motion.svg)

## mpath
![mpath](./q-mpath.svg)

## stagger + parallel
![stagger](./q-stagger-parallel.svg)

## compound request flow
![compound](./p-smil-02-pulse-compound.svg)

## pulse (M1 crisp)
![pulse](./m1-request-crisp.svg)

## opacity / scale transitions
![opacity](./q-animate-opacity.svg)
![scale](./q-animate-transform.svg)

## freeze vs loop
![freeze-loop](./q-freeze-loop.svg)

## gradient
![gradient](./q-gradient.svg)

## clipPath (only if planned)
![clip](./q-clip.svg)

## a11y metadata (title/desc/role in all SVGs — inspect source)

## static fallback (first frame meaningful without animation — all probes)

## caching experiment
- same filename: `./cache-same.svg` (v1 now, overwrite v2 later, observe staleness)
- versioned: `./cache-v1.svg` (content-addressed candidate)
![cache-same](./cache-same.svg)
![cache-v1](./cache-v1.svg)

## canonical motion demo (M1)
![canonical](./canonical-request.svg)
