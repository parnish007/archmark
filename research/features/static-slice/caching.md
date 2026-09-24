# Caching — README/blob-preview delivery path (measured 2026-09-24, Chromium)

Experiment: `cache-same.svg` V2→V3 overwrite, same filename, new commit on probe branch.
- Raw (`raw.githubusercontent.com`): fresh immediately after push (V2 observed at once).
- Rendered preview (`<img>` on blob page): STALE pixels ≥90–120s after push (diff 0 vs V2);
  fresh by +~5.5min poll (V3 confirmed, darkPx 8646→0). Self-healing minutes-scale delay.
- No camo URLs observed in logged-out blob preview (delivery = raw 200 image/svg+xml).
- Query-string busting NOT tested (not assumed to work).

Decision: do NOT adopt content-addressed filenames for v0. Minutes of stale preview do not justify
extra files + README diffs + cleanup + repo growth. Revisit only if delays exceed ~15min or go permanent.
Evidence: benchmarks/results/cache-{before,after,poll-*}.png (ignored, local).
