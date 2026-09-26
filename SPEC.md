# ArchMark SPEC v0

Status: normative for v0. DSL stability follows package semver (pre-1.0: may break with a minor). License: Apache-2.0. Runtime baseline: Node 24 LTS, pnpm, strict TS, ELK.js 0.12 (EPL-2.0, external dep), Vitest, Playwright (later). Single package `archmark`, bin `archmark`.

## 1. Goals / non-goals
Goals: text → beautiful deterministic static SVG (+ light/dark) embedded in README via committed assets + `<picture>`; semantic arch model; excellent errors; offline local build; animation IR as abstraction (SMIL backend deferred until Phase 0 probes pass in real README).
Non-goals v0: interactive playground, VS Code ext, views multi-projection, vendor icon pack, GIF fallback (only if SMIL probe fails).

## 2. DSL v0 grammar (EBNF sketch, Langium boundary reserved)
```
document   := stmt*
stmt       := component | connection | flow | group | view? | meta?
component  := kind ident stringLit?            // kind ∈ actor service app database cache queue gateway worker storage model external boundary cluster cloud region browser mobile api server agent function container network filesystem
connection := ident "->" ident (labelBlock?)?
labelBlock := "{" (prop ",")* "}"
flow       := "flow" ident "{" flowStep* "}"
flowStep   := ident "->" ident (labelBlock?)?
group      := "group" ident stringLit? "{" component* connection* "}"
```
- Identifiers: `[A-Za-z_][A-Za-z0-9_-]*`, unique per document. Labels: quoted strings, max 48ch display (truncate 22 in node, full in `<title>`).
- Forward refs allowed (hoisting). Duplicate id → diagnostic with suggestion. Unknown target → "Did you mean …?" (Levenshtein ≤2).
- Comments: `//` and `#` line. Whitespace-insensitive. Deterministic formatting via `archmark fmt` (later).
- Reserved: `flow` bodies are semantic (request/response/pulse inferred), NOT animation delays/coords. No x/y/duration in DSL v0.

## 3. Semantic Architecture IR
```ts
type NodeKind = 'actor'|'service'|'app'|'database'|'cache'|'queue'|'gateway'|'worker'|'storage'|'model'|'external'|'boundary'|'cluster'|'cloud'|'region'|'browser'|'mobile'|'api'|'server'|'agent'|'function'|'container'|'network'|'filesystem';
interface ArchNode { id: string; kind: NodeKind; label: string }
interface ArchEdge { id: string; from: string; to: string; label?: string } // id: stable from--to[#n], reorder-proof
interface ArchGroup { id: string; label: string; members: string[] } // 1 level, non-empty, disjoint
interface ArchFlowStep { from: string; to: string; type?: 'request'|'response'|'write'|'read'|'event'|'error'|'failure'|'recovery' }
interface ArchFlow { id: string; steps: ArchFlowStep[] }
interface ArchModel { nodes: ArchNode[]; edges: ArchEdge[]; groups: ArchGroup[]; flows: ArchFlow[] }
```
Validation: unknown kind (AM1101), duplicate id (AM1001), dangling edge (AM1203 + suggestion), self-edge loop (warn AM1105), empty doc (AM1102), caps (AM1103/AM2111), empty group (AM1108), flow topology strict (AM3102/AM3104), timeline caps (AM3201/AM3203).

## 4. View/Flow IR → Layout Graph
View v0 = `overview` (all nodes+edges). Layout Graph: `{ id, width, height, children, edges }` with measured node sizes (see §6). ELK behind `LayoutEngine` interface (`layout(graph): Promise<PlacedGraph>`); default `ElkLayout` with `elk.algorithm=layered`, `elk.direction=RIGHT`, `randomSeed=42`, `considerModelOrder`. ELK JSON never leaks past boundary (converted to SceneGraph).

## 5. SceneGraph (renderer input)
```ts
interface SceneNode { id: string; kind: string; label: string; x: number; y: number; w: number; h: number }
interface SceneEdge { id: string; from: string; to: string; label?: string; d: string }
interface SceneGroup { id: string; label: string; x: number; y: number; w: number; h: number; truthful: boolean }
interface Scene { w: number; h: number; nodes: SceneNode[]; edges: SceneEdge[]; groups: SceneGroup[]; title?: string }
```
Coords: 8px grid snapped, deterministic sort (id), float rounding 2dp, no timestamps.
Groups come from ELK compound output (truthful by construction, P5/P6 gated); `d` stays a raw
path string by decision (single consumer need — mpath-by-reference; see code comment).

## 6. Visual tokens (Calm Technical Precision v0)
spacing [4,8,12,16,24,32,48], node pad 12–16, group 24, grid 8; radii node 8 group 12 badge 999; stroke hairline 1 edge 1.75 emphasis 2.5 node 1.5 group 1; fonts title 16/600 node 12.5/600 edge 10.5/400 meta 9.5/500; system stacks only; min 9px; truncate 22ch.
Colors light {bg #FFFFFF ink #1A2330 edge #4A5A6E muted #8A97A8 accent #2563EB grid #EEF1F5} dark {bg #0D1117 ink #E6EDF3 edge #8B9BB0 muted #5C6A7E accent #6AA6FF grid #1B2330}. Node: white/dark fill, 1.5px border, icon 20px + label. Edge: orthogonal 1.75px, arrow 8×6 filled, label halo. Group: 12px radius, 1px dashed muted + 4% fill. Tokens live in `src/renderer/tokens.ts`.

## 7. Icons v0 (bespoke core, 24 grid, stroke 2 round, currentColor)
Required: actor, service, database, cache, queue, gateway, worker, storage, model, cloud, external, app, api, server, browser, mobile, agent, function, container, cluster, network. Each: viewBox 24, live 22, optical centering, min supported size 20px rendered (16px best-effort). No remote fetch. Vendor icons out-of-scope v0.

## 8. Static SVG contract
Deterministic: same input+version+config → byte-identical (sorted attrs, sorted ids, fixed seed, 2dp, no timestamps). Structure: `<svg xmlns viewBox width height role=img><title/><desc/>…` + `<defs>` markers. IDs namespaced `am-node-*`/`am-edge-*`/`am-group-*` with collision suffixes. Accessible: role img, title/desc. Size <100KB target, <512KB cap. Two files: `*.light.svg`, `*.dark.svg` + `<picture>` snippet. SVGO deferred: measured benefit negligible at current output sizes.

## 9. Animation IR contracts (production)
```
Flow IR (semantic ops, no timing) → Timeline (ordered events + deps + token timing) → Animation IR (typed ops + motion tokens) → SMIL renderer (verified subset)
```
Renderer backends: static (frozen first frame, always) + SMIL (`animate`/`animateTransform`/`animateMotion`+`mpath`/`set`/`begin`/freeze, keySplines easing from tokens, stagger 90ms). Timeline dependencies compile to absolute `begin` times in dependency order (robust against dangling id refs; equivalent in effect to begin-chaining). Motion tokens (`src/animation/tokens.ts`) are the single timing source. Static complete without animation; the frozen first frame is the reduced-motion output (embed the static pair for fully static display). No animation coords in DSL; no SVG leakage into semantic model.

## 10. README integration
Source lives in `<!-- archmark id=... \n DSL \n-->`; generated region `<!-- archmark-render:start id --> <picture>… </picture> <!-- archmark-render:end id -->` replaced by byte-range only. Never reserialize rest of README. `build` writes `archmark.light.svg`/`archmark.dark.svg` (or per-id) + patches README. `check` verifies freshness (hash compare) for CI. Deterministic diffs.

## 11. CLI v0
`archmark init` (scaffold block in README + example), `archmark build [README.md]` (parse→IR→layout→scene→static+animated SVG→patch), `archmark check [README.md]` (exit 1 if stale, diff hint). Each named flow emits `archmark.<id>.<flow>.light/dark.svg` with its own owned region `<id>.<flow>`; static pair uses `<id>`. All-or-nothing writes (temp-file + rename); stale owned assets warn, never auto-delete. `watch/fmt/explain/inspect` deferred. Errors: file:line:col + code + suggestion. Exit codes 0/1/2 (usage).

## 12. Security
Treat repo input hostile: escapeXmlText/Attribute central; validateUrl (http/https only, no javascript:/data: except image allowlist); validatePath (no ../ outside outDir); cap nodes 5000/edges 10000/label 512ch/nesting 1; no code exec from DSL; no secret logging. Fuzz corpus required (empty, unicode/RTL/emoji, XML chars, dup ids, cycles, 1000 nodes, malicious URLs, path traversal).

## 13. Testing / acceptance
Unit+parser+semantic+golden(deterministic SVG hash)+fixtures visual review+CLI integration+fuzz+security. Canonical fixtures: simple-three-node, microservices, nested-groups, AI-agent, long-label, dense-graph, dark/light. Acceptance: representative fixtures look publication-quality (no overlap/clip/crossing-spaghetti/misaligned icons); build <2s small, <10s 100-node; SVG <100KB; `check` clean on rebuild (determinism).

## 14. Performance budgets v0 (CI ratchet later)
CLI cold <800ms small; 100-node build <10s; SVG <100KB; peak <512MB. Optimize only via evidence protocol; visual quality is guardrail (faster+uglier = REVERT).

## 15. Resolved by evidence (was: open Phase-0 questions)
SMIL subset animates in Chromium/Firefox/WebKit preview path (matrix PASS; `set` isolated PASS;
compound measured PASS in active window). `<picture>` theme selection verified light+dark. ELK
seed-42 deterministic 11/11 + cross-process 5/5. Preview-path staleness minutes-scale (no hashed
filenames). SVGO deferred (negligible benefit at current sizes).
