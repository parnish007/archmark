# Contributing to ArchMark

Requires Node >= 24 and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm exec biome lint src tests scripts
pnpm exec biome format src tests scripts
pnpm test
pnpm build
node ./dist/cli/cli.js check README.md
```

Architecture rules (enforced by tests):

- One-way dependencies: language → core → flow → animation → renderer; markdown/CLI outside.
- No glue: new integrations need an explicit contract type, not reshaping at call sites.
- Deterministic output: sorted, seeded, rounded, no timestamps (see `archmark check`).
- Diagnostics carry stable codes (AM1xxx parser, AM11xx/12xx compiler, AM21xx markdown,
  AM31xx/32xx flows). New error paths need codes + tests.
- Public tree stays clean: research scratch, probes, screenshots, traces belong in
  `.archmark-internal/` (ignored) — never in commits.

License: Apache-2.0. By contributing you agree your contributions use the same license.
