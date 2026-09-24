# Nested groups (resolved v0-quality, 2026-09-24)

Implementation: toScene computes member bbox + 24px padding + 40px top label band; svg.ts renders
behind nodes as rx12 muted dashed (6 4) + 4% grid fill + uppercase 10/600 tracked label; canvas expands.
Verified on nested-cloud (prod group): containment holds light+dark, child→external edges route,
group label legible, no child escape. Depths: 1 supported (nested errors with diagnostic); group→group
edges and collapsed/empty groups deferred with explicit diagnostics (empty group renders nothing, warned).
Long labels truncate 40ch. Edge-through-boundary: orthogonal edges cross dashed border — intentional,
reads as ingress/egress. Light/dark: grid-fill + muted stroke both themes.
Status: intentional grouping achieved; deeper nesting → views milestone.
