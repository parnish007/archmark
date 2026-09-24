# Real-GitHub experiment (executes after push authorization — do not run yet)

Goal: move GITHUB_COMPATIBILITY.md from PROVISIONAL to CONFIRMED/REJECTED per mechanism.

Steps:
1. Push probes/github/*.svg + a matrix README section referencing each via `![](...)`, `<img>`, and `<picture>` variants.
2. Observe on github.com (Chrome/FF/Safari + mobile app): static crisp? picture follows theme? each SMIL primitive animates through Camo? NEG probes stripped?
3. Screenshot + record in research/features/static-slice/github-observation.md (date, browser, URLs, pass/fail).
4. If SMIL fails materially: keep Animation IR, promote FrameSequence/GIF backend without DSL change (per ADR-004).
5. Update ADR-004 status + budgets; do not claim guarantees from local-only runs.
