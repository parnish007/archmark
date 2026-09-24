# ArchMark — beautiful, animated architecture-as-code for GitHub READMEs

> Not affiliated with Archmark® (archmark.co) nor sparkymat/ArchMark bookmark manager.

ArchMark lets you describe architecture as concise text and generates publication-quality
diagrams (deterministic light/dark SVG) for your README. Semantic animation (SMIL) is under
Phase-0 GitHub validation (see ADR-004: delivery confirmed, motion unverified). No cloud account.
Local, offline, deterministic.

```bash
npx archmark init
npx archmark build
npx archmark check
```

<!-- archmark id=system
actor user "User"
service frontend "Frontend"
service api "API"
database db "PostgreSQL"

user -> frontend
frontend -> api
api -> db
-->

<!-- archmark-render:start system -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./archmark.dark.svg" />
  <img alt="system architecture" src="./archmark.light.svg" />
</picture>
<!-- archmark-render:end system -->


Status: v0.1 vertical slice (static SVG + CLI build/check). Animation IR defined; SMIL backend
lands after Phase 0 GitHub probes confirm. See SPEC.md, ARCHITECTURE.md, ROADMAP.md, docs/adr/.

License: Apache-2.0. See THIRD_PARTY_NOTICES.md. Curated `research/` is tracked and public; only raw/private scratch is ignored (see `.gitignore`).
