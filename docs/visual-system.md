# Visual system — Calm Technical Precision

ArchMark diagrams follow one visual philosophy: **Calm Technical Precision**. Quiet
geometry, generous whitespace, and restrained color let the architecture — not the
decoration — carry the meaning. Every asset is deterministic: the same source always
produces byte-identical SVG, in both light and dark variants.

## Technical Round icon family

Every architecture kind has its own bespoke icon, drawn on a 24×24 grid:

- stroke width 2, round caps, round joins
- `currentColor` — icons inherit their context, never hardcode a color
- minimal detail, recognizable at 20px and above (16px best-effort; fine dashed
  detail such as `boundary` softens first)
- no gradients, no decorative fills
- no vendor or cloud-provider logos in v0

Completeness is enforced, not claimed: `tests/renderer/icons.test.ts` requires the set
of explicit icons to equal the set of supported node kinds exactly, and no valid kind may
reach the generic fallback. Adding a kind without an icon fails the build.

## Supported node kinds (24)

`actor` `service` `app` `database` `cache` `queue` `gateway` `worker` `storage` `model`
`external` `boundary` `cluster` `cloud` `region` `browser` `mobile` `api` `server`
`agent` `function` `container` `network` `filesystem`

## Gallery

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/icon-gallery.dark.svg" />
  <img alt="ArchMark core icon family: all 24 architecture kind icons" src="./assets/icon-gallery.light.svg" />
</picture>

The gallery is generated, not drawn: `scripts/generate-icon-gallery.js` derives every
cell from `NODE_KINDS` plus the production `iconFor` implementation, in both themes.
Regenerate with `node scripts/generate-icon-gallery.js`; CI verifies freshness with
`--check`, so an icon change without a regenerated gallery fails the build.

## Semantic distinctions

- `storage` (3D box) vs `cache` (layered hexagon): persistence vs ephemeral layers.
- `service` (solid rounded square + plus) vs `boundary` (dashed rounded square): a thing
  vs the perimeter around things. The dashed stroke is unique in the family — a boundary
  reads as a zone line at a glance.
- `cluster` (four cells) vs `region` (folded map): compute grouping vs geographic scope.
- `cloud` (lifted outline) vs `network` (connected nodes): a platform vs the links
  between things.
- `gateway` (ringed hub with ticks) vs `worker` (hub with rays): routing vs execution.
- `model` (peaked cap + core) vs `agent` (face): a model artifact vs an acting entity.
- `api` (angle brackets + slash) vs `function` (lambda braces): an interface vs a unit
  of compute.

## Line, stroke, and theme rules

- Node outlines: 1.5px; icons: 2px round; edges: 1.75px (see `src/renderer/tokens.ts`,
  the single source of truth).
- Light theme: ink `#1A2330` on `#FFFFFF`. Dark theme: ink `#E6EDF3` on `#0D1117`.
- Muted labels use the theme's muted tone; semantic color (accent blue, danger red) is
  reserved for flow behavior, never decoration.
- Animated flows reuse the static geometry: packets travel the real routed paths, then
  every element freezes on its final frame (`fill="freeze"`) — see `docs/animation.md`.

## Deterministic rendering principle

No timestamps, no machine-specific paths, no randomness anywhere in output. If two
checkouts build the same source, the bytes are identical. CI's `check` commands
(`archmark check`) enforce this: stale generated assets fail the build.
