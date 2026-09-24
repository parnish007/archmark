# Supported icon size (tracked — tied to real journey)

Measured node system (src/renderer/svg.ts): icon drawn in 20px box (`scale(0.833)` of 24 grid),
left of 12.5/600 label with 10px gap. Rendered icon size in normal diagrams: 20px.

MINIMUM_SUPPORTED_CORE_ICON_SIZE = 20px rendered.
- 20/24/32/48px: must pass weight, distinction, baseline, dark-theme bars.
- 16px: best-effort only (documented; worker/agent/browser weakest there, acceptable).
- <16px: out of scope v0 (use fill/bold variant later if journey requires).

Rationale: no v0 journey displays architecture icons below 20px; polishing 16px beyond legibility
wastes effort. Specimen retains 16px column as canary, not gate.
