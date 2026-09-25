# ArchMark — beautiful, animated architecture-as-code for GitHub READMEs

> Not affiliated with Archmark® (archmark.co) nor sparkymat/ArchMark bookmark manager.

ArchMark lets you describe architecture as concise text and generates publication-quality
diagrams (deterministic light/dark SVG) plus semantic flow animations (SMIL, verified in
Chromium/Firefox/WebKit) for your README. No cloud account. Local, offline, deterministic.

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
  <img alt="system architecture: API → PostgreSQL → Frontend → User" src="./archmark.light.svg" />
</picture>
<!-- archmark-render:end system -->


Status: v0 production core (static SVG + semantic SMIL animation + CLI build/check).
See SPEC.md, ARCHITECTURE.md, docs/syntax.md, docs/animation.md, docs/adr/.

License: Apache-2.0. See THIRD_PARTY_NOTICES.md, CONTRIBUTING.md, SECURITY.md.
