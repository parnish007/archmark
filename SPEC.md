# ArchMark SPEC v0.1 (draft — Phase 0 + static vertical slice)

Status: draft. License: Apache-2.0. Runtime baseline: Node 24 LTS, pnpm, strict TS, ELK.js 0.12 (EPL-2.0, external dep), Vitest, Playwright (later). Single package `archmark`, bin `archmark`.

## 1. Goals / non-goals
Goals: text → beautiful deterministic static SVG (+ light/dark) embedded in README via committed assets + `<picture>`; semantic arch model; excellent errors; offline local build; animation IR as abstraction (SMIL backend deferred until Phase 0 probes pass in real README).
Non-goals v0: interactive playground, VS Code ext, views multi-projection, vendor icon pack, GIF fallback (only if SMIL probe fails).

## 2. DSL v0 grammar (EBNF sketch, Langium boundary reserved)
```
document   := stmt*
stmt       := component | connection | flow | group | view? | meta?
component  := kind ident stringLit?            // kind ∈ actor service app database cache queue gateway worker storage model external boundary cluster cloud region
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
type NodeKind = 'actor'|'service'|'app'|'database'|'cache'|'queue'|'gateway'|'worker'|'storage'|'model'|'external'|'boundary'|'cluster'|'cloud'|'region';
interface ArchNode { id: string; kind: NodeKind; label: string; group?: string; meta?: Record<string,string> }
interface ArchEdge { id: string; from: string; to: string; label?: string; protocol?: string }
interface ArchGroup { id: string; label: string; members: string[] }
interface ArchFlowStep { from: string; to: string; type?: 'request'|'response'|'write'|'read'|'event'|'error' }
interface ArchFlow { id: string; steps: ArchFlowStep[] }
interface ArchModel { nodes: ArchNode[]; edges: ArchEdge[]; groups: ArchGroup[]; flows: ArchFlow[] }
```
Validation: unknown kind, duplicate id, dangling edge, self-edge allowed (drawn as loop, warned), cycle allowed (warned, layered handles), empty doc error, 1000+ nodes warn + cap 5000 (DoS guard).

## 4. View/Flow IR → Layout Graph
View v0 = `overview` (all nodes+edges). Layout Graph: `{ id, width, height, children, edges }` with measured node sizes (see §6). ELK behind `LayoutEngine` interface (`layout(graph): Promise<PlacedGraph>`); default `ElkLayout` with `elk.algorithm=layered`, `elk.direction=RIGHT`, `randomSeed=42`, `considerModelOrder`. ELK JSON never leaks past boundary (converted to SceneGraph).

## 5. SceneGraph (renderer input)
```ts
interface SceneNode { id: string; kind: string; label: string; x: number; y: number; w: number; h: number; iconId: string }
interface SceneEdge { id: string; from: string; to: string; label?: string; d: string; // orthogonal path data
  ports: { sx: number; sy: number; tx: number; ty: number } }
interface SceneGroup { id: string; label: string; x: number; y: number; w: number; h: number }
interface Scene { w: number; h: number; nodes: SceneNode[]; edges: SceneEdge[]; groups: SceneGroup[]; title?: string }
```
Coords: 8px grid snapped, deterministic sort (id), float rounding 2dp, no timestamps.

## 6. Visual tokens (Calm Technical Precision v0)
spacing [4,8,12,16,24,32,48], node pad 12–16, group 24, grid 8; radii node 8 group 12 badge 999; stroke hairline 1 edge 1.75 emphasis 2.5 node 1.5 group 1; fonts title 16/600 node 12.5/600 edge 10.5/400 meta 9.5/500; system stacks only; min 9px; truncate 22ch.
Colors light {bg #FFFFFF ink #1A2330 edge #4A5A6E muted #8A97A8 accent #2563EB grid #EEF1F5} dark {bg #0D1117 ink #E6EDF3 edge #8B9BB0 muted #5C6A7E accent #6AA6FF grid #1B2330}. Node: white/dark fill, 1.5px border, icon 20px + label. Edge: orthogonal 1.75px, arrow 8×6 filled, label halo. Group: 12px radius, 1px dashed muted + 4% fill. See research/visual-motion.md for full tokens.

## 7. Icons v0 (bespoke core, 24 grid, stroke 2 round, currentColor)
Required: actor, service, database, cache, queue, gateway, worker, storage, model, cloud, external, app, api, server, browser, mobile, agent, function, container, cluster, network. Each: viewBox 24, live 22, optical centering, tested 16/20/24/32/48 light+dark on specimen sheet. Provenance in assets/PROVENANCE.md. No remote fetch. Vendor icons out-of-scope v0.

## 8. Static SVG contract
Deterministic: same input+version+config → byte-identical (sorted attrs, sorted ids, fixed seed, 2dp, no timestamps). Structure: `<svg xmlns viewBox width height role=img><title/><desc/>…` + `<defs>` markers. Accessible: role img, title/desc. Size <100KB target, <512KB cap. Two files: `*.light.svg`, `*.dark.svg` + `<picture>` snippet. SVGO safe-subset only (keep viewBox/title/desc/ids stable).

## 9. Animation IR contracts (abstraction now, SMIL impl next)
```
Flow IR → Timeline IR (sequence|parallel|wait, t in ms) → Animation IR (send/request, response, pulse, activate, state-change, parallel, wait, fail, reroute, recover)
```
Renderer backends: StaticSVGRenderer (frozen first frame, always), SMILAnimatedSVGRenderer (animateMotion+mpath on real edge `d`, keySplines easing, begin-chained compound, stagger 90ms), FrameSequenceRenderer (future). Durations: micro 200, flow 500, traverse 700, ambient 1200, stagger 90; easing standard 0.2 0 0 1. Static complete without animation; reduced-motion fallback. No animation coords in DSL; no SVG leakage into semantic model.

## 10. README integration
Source lives in `<!-- archmark id=... \n DSL \n-->`; generated region `<!-- archmark-render:start id --> <picture>… </picture> <!-- archmark-render:end id -->` replaced by byte-range only. Never reserialize rest of README. `build` writes `archmark.light.svg`/`archmark.dark.svg` (or per-id) + patches README. `check` verifies freshness (hash compare) for CI. Deterministic diffs.

## 11. CLI v0
`archmark init` (scaffold block in README + example), `archmark build [README.md]` (parse→IR→layout→scene→SVG→patch), `archmark check [README.md]` (exit 1 if stale, diff hint). `watch/fmt/explain/inspect` deferred. Errors: file:line:col + snippet + suggestion. Exit codes 0/1/2 (usage).

## 12. Security
Treat repo input hostile: escapeXmlText/Attribute central; validateUrl (http/https only, no javascript:/data: except image allowlist); validatePath (no ../ outside outDir); cap nodes 5000/edges 10000/label 512ch/nesting 1; no code exec from DSL; no secret logging. Fuzz corpus required (empty, unicode/RTL/emoji, XML chars, dup ids, cycles, 1000 nodes, malicious URLs, path traversal).

## 13. Testing / acceptance
Unit+parser+semantic+golden(deterministic SVG hash)+fixtures visual review+CLI integration+fuzz+security. Canonical fixtures: simple-three-node, microservices, nested-groups, AI-agent, long-label, dense-graph, dark/light. Acceptance: representative fixtures look publication-quality (no overlap/clip/crossing-spaghetti/misaligned icons); build <2s small, <10s 100-node; SVG <100KB; `check` clean on rebuild (determinism).

## 14. Performance budgets v0 (CI ratchet later)
CLI cold <800ms small; 100-node build <10s; SVG <100KB; peak <512MB. Optimize only via evidence protocol; visual quality is guardrail (faster+uglier = REVERT).

## 15. Open questions (Phase 0 probes must answer)
SMIL survival in real README `<img>` via camo? `<picture>` theming on mobile? ELK byte-determinism across runs? SVGO+SMIL safety? Resolved in probes/github/README.md matrix.
