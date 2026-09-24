# Design synthesis — Calm Technical Precision (tracked, v0)

Default: restrained neutrals + 1 accent, orthogonal H/V, whitespace, system fonts, dual `<picture>` theming.
Blueprint secondary later (same geometry, remapped tokens).

Tokens: spacing [4,8,12,16,24,32,48], node pad 12–16, group 24, grid 8; radii node 8 group 12 badge 999; stroke edge 1.75 node 1.5 hairline 1 group 1; fonts title 16/600 node 12.5/600 edge 10.5/400 meta 9.5/500, min 9px, truncate 22ch + `<title>` full; system stacks only (no webfonts in `<img>`/Camo).
Light: bg #FFF ink #1A2330 edge #4A5A6E muted #8A97A8 accent #2563EB grid #EEF1F5. Dark: bg #0D1117 ink #E6EDF3 edge #8B9BB0 muted #5C6A7E accent #6AA6FF grid #1B2330. Blueprint alt: bg #123A6B ink #FFF edge #BFD7F5 accent #FFC857.

Icons: bespoke family, 24 grid / live 22 / 1px padding / 2px gaps; stroke 2 round caps+joins, fill none, currentColor; rx 2 large / 1 small; floor 1.5px effective at 16px; overshoot circles 0.5px; center by gravity + blur-test; dots as fill-only r≥1.2–1.4. Vendor logos separate subsystem with provenance (never default bundle).

Motion grammar (SMIL-compiled): request (animateMotion+mpath on real `d`, paced, 600–800ms) → pulse (r+opacity, 200ms) → response (400–600ms, hollow/smaller) → parallel stagger 80–120ms → failover (dash reveal 500ms + traverse 700ms) → reveal (fade+rise 250ms stagger 90ms). Easing standard `0.2 0 0 1` (keySplines, calcMode spline). Compound via `begin=prev.end`. Static complete without motion; reduced-motion fallback. No dash-march primary, no teleport, no glow, no bounce.

Sources: Munzner VAD, Tufte, Tamassia/Di Battista + Hegemann-Wolff GD'23, Lucide/Feather, Material Symbols, Phosphor, W3C SMIL + SVG animateMotion/mpath, M3 easing, GitHub picture theming docs.
