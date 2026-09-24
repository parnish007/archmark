# static-slice — implementation plan (executed)

1. language/parser (stack, precompiled RE, escaped strings, severity) ✓
2. core/suggest (capped Levenshtein, escapes) + compiler (fatal caps, hoisting) ✓
3. core/layout (ElkLayout interface, seed 42, timeout, wide-char measure, self-loop) ✓
4. renderer/tokens+icons+svg (Calm tokens, 15 icons, flattened deterministic SVG) ✓
5. markdown/extract (byte-range, allowlist, cwd containment) ✓
6. cli (run(), single ELK, dry-run check) + tests (12) + fixtures + probes ✓
Rollback: revert feat commit c761254; SVG outputs regenerate via build.
