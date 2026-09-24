# Coverage ledger (tracked — what was actually inspected)

| Area | Depth | Sources inspected | Status |
|---|---|---|---|
| Mermaid DSL/layout/README | DEEP | mermaid-js/mermaid repo, syntax/arch docs, issues #6120 #6322 #7211 #6476 #6424 #7044, GitHub version-lag discussions | saturated |
| D2 DSL/layout/licensing | DEEP | d2lang/d2, d2lang.com, TALA page, community #176562, MPL-2.0 | saturated |
| Structurizr/C4 model/views | DEEP | docs.structurizr.com as-code/DSL-FAQ/manual+auto layout, c4model.com | saturated |
| PlantUML | FOCUSED | plantuml/plantuml, plantuml.com, mermaid-vs-plantuml comparison | sufficient |
| Graphviz DOT | FOCUSED | graphviz.org DOT guide/layouts, issues #1415 #1953, SO determinism | sufficient |
| Kroki | LANDSCAPE | docs.kroki.io, yuzutech/kroki | sufficient |
| LikeC4/C4 tooling | FOCUSED | likec4.dev, likec4 repo/discussions #2288 #343 | sufficient |
| SVG2/SMIL specs | DEEP | W3C SVG2 CR/ED, SMIL Animation Rec, SMIL 3.0 §12, SVG Animations L2, MDN SMIL (2026-07-30), caniuse svg-smil + animateTransform, chromestatus SMIL popularity, chromium issues 2025 | saturated |
| GitHub rendering | DEEP | gjtorikian/html-pipeline sanitization_filter.rb, atmos/camo, GitHub docs non-code-files + picture changelogs 2021-11-24/2022-05-19, SMIL cookbooks (rootlinux, ProfileKit, hero), PerfectReadme vs dynimage conflict | conflict noted → probe matrix required; real-github observation pending |
| ELK.js | FOCUSED | kieler/elkjs, npm elkjs 0.12, eclipse.elk reference/options/randomSeed, issue #312 license | API+license saturated; determinism assumed → must verify |
| Langium | FOCUSED | eclipse-langium/langium, langium.org grammar docs, npm langium 4.x changelog | sufficient; grammar deferred |
| SVGO | FOCUSED | svg/svgo, svgo.dev preset/plugins, v3→v4 migration | sufficient; safety on SMIL must verify |
| Icon systems | FOCUSED | Lucide design guide, Feather spec, Material Symbols opsz/wght/GRAD, Phosphor weights | sufficient; optical pass pending |
| Motion/easing | FOCUSED | GSAP docs, M3 + Fluent tokens, Smashing SMIL's Not Dead 2025 | sufficient; timing candidates pending |
| npm/GitHub naming | DEEP (live 2026-09-24) | registry.npmjs.org archmark/@archmark 404s, github parnish007/archmark + squatter + sparkymat, archmark.co, USPTO quick | free with caveats; full clearance before 1.0 |
| Licenses | DEEP (live) | registry license fields TS/Langium/Vite/Vitest/React/SVGO/Playwright/elkjs, EPL-2.0 text + FAQ, ASF resolved | Apache-2.0 + EPL-2.0-external plan; CI check pending |

Gaps / uncertainties: real-github.com SMIL observation; ELK byte-determinism proof; SVGO+SMIL safety; Safari keySplines/mpath parity; Camo cache-bust; font metrics on GitHub renderer; full trademark clearance.
