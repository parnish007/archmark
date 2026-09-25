# Security policy

ArchMark treats repository content (DSL, README) as hostile input.

- No network access during render; no `eval`; no code execution from DSL or Markdown.
- XML metacharacters and C0 controls are escaped/stripped centrally (`src/core/suggest.ts`).
- SVG output never contains scripts, event handlers, foreign objects, or styles.
- Filesystem writes are confined: README stays in the working directory, symlinks are
  refused, generated SVGs use an allowlisted bare-filename pattern, writes are atomic
  per file (temp + fsync + rename). No manifest/journal: planning/validation complete
  before any write, so failures there change nothing; a mid-commit failure or crash can
  leave a mix that rerunning `archmark build` repairs (idempotent — documented, not hidden).
- Resource caps: source 256KB/2000 lines, 5000 nodes, 10000 edges, 50 blocks,
  100 flow steps, 500 animation events, 10s layout timeout (fail-closed abandonment).
- Do not commit secrets; report vulnerabilities via GitHub issues (no dedicated bounty).

Dependency licenses are tracked in THIRD_PARTY_NOTICES.md (ELK.js used under EPL-2.0).
