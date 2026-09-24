# motion-system — blind review (M1/M2/M3) + recommendation

Note: duration/easing values below are engineering parameters, not beauty measurements. No numeric
score is used as proof of aesthetic quality; the recommendation rests on qualitative rationale.

Council scope: canonical request flow only. Choreography under review: activate → wake → accelerate on real path → receive pulse → dependent → distinguishable response → settle. Ground truth: `animation-ir.ts` DUR micro200/flow500/traverse700/ambient1200/stagger90, EASE standard `0.2 0 0 1`; P-SMIL-01 (paced `animateMotion`+`mpath` on real `d`); P-SMIL-02 (`begin`-chained draw→traverse→pulse). Bans: no dash-march primary, no teleport/glow/bounce.

## M1 — crisp-technical

Send 600ms `calcMode=paced` on real `d` via `mpath` (constant velocity on orthogonal corners; `rotate=auto`); no easing on path itself. Activate 150–200ms opacity 0→1 at `draw.begin`. Receive pulse 150–200ms: `r` 8→18 + opacity 0.8→0 (`spline` + `keySplines` standard). Response 500ms paced, hollow/smaller packet (fill none, 4px) to distinguish direction. Settle: `fill=freeze` on final frame. Parallel stagger 90ms via `begin=+90ms` offsets. Loop: play once (`repeatCount=1`), freeze; ambient re-play only on user re-render, never auto-indefinite. Reduced-motion: skip traverse, show frozen frame + single 200ms pulse or static only. Fits Calm Technical Precision; cheapest to read at README scale.

## M2 — soft-editorial

Send 800ms `calcMode=spline` + `keySplines 0.2 0 0 1` (gentle accelerate/decelerate, lingers at target). Activate 250ms fade+rise (opacity + 4px translate). Pulse 250ms soft: larger radius (8→22), lower peak opacity (0.5), slower decay. Response 600ms eased, same size as request but 60% opacity. Stagger 120ms for a wave feel. Loop: 2 cycles then freeze, or indefinite ambient at low opacity. Reduced-motion: static + fade only. Pros: calm, premium; cons: 800ms + 250ms stretches multi-hop flows past attention budget (3 hops ≈ 3s), spline on path distorts constant-velocity reading of topology, heavier `keyTimes`/`keySplines` authoring surface.

## M3 — minimal-static-first

Send 400ms paced (fast, near-instant). No `r` pulse: opacity-only blink 150ms on target (no geometry change). Response 400ms identical encoding to request except direction (relies on arrowhead alone). No activate prelude; dependent starts at `prev.end` with zero stagger (serial) or 60ms. Loop: once + freeze; static frame is the artifact. Reduced-motion = default output (already minimal). Pros: fastest, smallest SMIL payload, survives any sanitizer downgrade; cons: fails "distinguishable response" and "receive pulse" legs — request/response blur together, dependent causality is weak, 400ms at README thumbnail size reads as flicker rather than flow.

## Comparison

| axis | M1 crisp | M2 soft | M3 minimal |
|---|---|---|---|
| duration (send/pulse/response) | 600/200/500 ≈ 1.3s per hop | 800/250/600 ≈ 1.65s per hop | 400/150/400 ≈ 0.95s per hop |
| easing | paced path (none) + spline pulse | spline everywhere (`0.2 0 0 1`) | paced, pulse opacity-linear |
| emphasis | size+fill contrast (solid→hollow), `r` pulse | opacity+scale softness | direction only |
| parallel stagger | 90ms (IR default) | 120ms wave | 0–60ms serial |
| loop policy | once + freeze | 2× or indefinite ambient | once + freeze |
| reduced-motion | freeze + optional pulse | freeze + fade | identical (already static) |
| risk | none structural | too slow, velocity lie | indistinguishable legs |

## Recommendation: adopt M1 with IR defaults

Grammar: `sequence[activate(200) → send(paced 700) → pulse(200) → response(paced 500, hollow) → settle(freeze)]`; parallel branches offset by `stagger 90`; compound chained by `begin=prev.end`; non-path tweens use `keySplines 0.2 0 0 1`. Defaults: `DUR.traverse=700` (probe-validated; 600 acceptable floor for short edges), `DUR.micro=200` pulse, `DUR.flow=500` response, `DUR.stagger=90`, packet `r=6` solid `#2563EB` / response hollow 4px, pulse `r 8→18`, opacity peak 0.8. Rationale: only M1 satisfies all seven choreography legs within budget, preserves constant-velocity topology reading, keeps response distinguishable without color-only encoding, and compiles 1:1 to P-SMIL-01/02 primitives. M2 timing may return as an opt-in `mood=editorial` theme; M3 is the automatic reduced-motion/static fallback, not the canonical grammar.

## Cost flags (blocking)

Filter/blur: never animate `feGaussianBlur`, `feDropShadow`, or glow opacity. Per-frame filter re-raster is the highest SMIL cost path, smears at Camo downscale, and violates the glow ban — pulse via `r`+`opacity` only. Indefinite loops: P-SMIL-01's `repeatCount=indefinite` must not ship as default. Indefinite motion in every README view burns CPU/battery, fights `prefers-reduced-motion`, and turns parallel flows into permanent distraction. Ship `repeatCount=1` (max 2 for demo) + `fill=freeze`; reserve `ambient 1200` for single-node status hints, gated behind reduced-motion off. Static first frame must always be complete without animation.

Next: lock M1 defaults into SMIL backend spec; add P-SMIL-05 reduced-motion/freeze probe; SVGO-safe-subset check on `mpath`/`keySplines`.
