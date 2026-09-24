# Visual system — blind review (V1/V2/V3 on 8 fixtures × light/dark)

Critics: infovis, graphic/UI, arch-diagram, a11y (blind, preferred unknown).

- V1 Calm Solid (1.5px ink rx8, ink icons, 600): only correct hierarchy (node > edge > edge-label); holds in dense-graph (13 nodes countable); contrast containers 15.8:1; icon effective 1.66px harmonizes with border; 200% scaling holds.
- V2 Hairline (1px muted rx10, 500): airy but inverts hierarchy (edge 7:1 > container 3:1); dense nodes dissolve; container contrast 2.97:1 light FAILS 3:1; hairlines shimmer at scale.
- V3 Accent Rail (3px accent rail): strong cue at 3 nodes, pure noise at density; implies false selection/status; color-only encoding; rail rx misaligns.

Selected: V1. Rejected V2 (hierarchy+contrast; keep rx10 airiness lesson for chrome) and V3 (non-data ink+false semantics; reserve accent for real selection/error).
Note: none solves true nested-group boxes yet — do not mistake rail for grouping. Long-label truncation 22ch + title correct in all.
