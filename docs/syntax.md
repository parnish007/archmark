# ArchMark syntax (v0)

```archmark
actor user "User"
browser frontend "Frontend"
api api "API"
model model "AI Model"
database db "PostgreSQL"

user -> frontend
frontend -> api
api -> model
api -> db

flow request {
  user -> frontend
  frontend -> api
  api -> model
  api -> db { type: write }
}
```

## Components

`<kind> <id> "Label"` — kinds: actor service app database cache queue gateway worker
storage model external boundary cluster cloud region browser mobile api server agent
function container network filesystem. Ids `[A-Za-z_][A-Za-z0-9_-]*`, unique per document
(AM1001). Forward references allowed. Labels ≤512 chars, truncated in diagrams (full in `<title>`).

## Connections

`<from> -> <to>` with optional `{ label: "verb", type: request }`.
Unknown endpoints suggest corrections (AM1203). Self-edges draw as loops (warning).

## Groups

```archmark
group prod "Production" {
  service api "API"
}
```

One level only (AM1004 otherwise); empty groups rejected (AM1108); one group per node.
Groups lay out as ELK compound containers — membership is truthful by construction (P5/P6 gates).

## Flows

`flow <id> { a -> b ... }` — steps typed request (default) response write read event
error failure recovery. `flow <id> loop { ... }` repeats the animation indefinitely
for showcase assets (default is one play + freeze; see docs/animation.md). Strict: every step needs a declared architecture edge (AM3102);
unknown nodes rejected (AM1203); empty flows rejected (AM3104). Parallel `api -> queue`
edges are distinguished by stable `from--to[#n]` ids; a flow step resolves deterministically
to the first in `(from, to, label)` sorted order (documented v0 semantic — declare distinct
edges deliberately; future qualifiers may refine this).
`error`/`failure` steps name the failure locus (still a declared edge) but emit only a fail
pulse — no traverse, encoding "no healthy transfer happened".

## Errors

Coded diagnostics: AM10xx parser, AM11xx/AM12xx compiler, AM21xx Markdown regions,
AM31xx/AM32xx flows/timeline. `archmark check` fails CI on any error.
