# Scene/Animation architecture audit (2026-09-24 — PASS)

Verified: DSL→AST→IR→View/Flow→LayoutGraph→LayoutResult→Scene→renderer holds.
Flow→Timeline→Animation IR→backends holds (Static frozen always; SMIL consumes Animation IR only).
Grep audit: no animateMotion/animateTransform/mpath/SMIL/<animate in src/language/*, src/core/ir.ts, src/core/compiler.ts.
SMIL concepts live only in probes/ + future backend + Animation IR timeline types (dur/easing as numbers/strings, no SVG syntax).
Parser never emits coordinates/durations; renderer never parses text.
