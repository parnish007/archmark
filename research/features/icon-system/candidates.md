# Icon system — three candidates (tracked)

Grid: 24×24 all candidates. Safe area + optical padding defined per candidate; apparent weight matched by blur-test; text baseline: icon 20px box left, label 12.5/600, gap 10px.

- A Technical Round: sw 2, round caps/joins, rx soft (node 8, icon-box 6, icon rx 2–3), live 22, gaps 2px, dots fill-only r1.2–1.4, currentColor, theme via tokens. Rationale: friendly-precision, matches Calm default.
- B Precision Square: sw 1.75, butt caps on structure (round joins), rx 1, tighter. Rationale: engineering-drawing sharpness, denser diagrams.
- C Soft Geometric: sw 2 round, larger padding (live 20), circular motifs, filled accents. Rationale: approachable, high small-size survival.

Small-size: <16px switch to bold/fill variant (A/B), C survives via circles. Theme: all currentColor; vendor logos separate (provenance required).
Specimen: assets/icons/specimen-*.svg shows all 21 at 16/20/24/32/48 light+dark. Blind review: iconography critic scores weight/radius/baseline/outliers without knowing preferred (A).
