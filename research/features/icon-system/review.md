# Icon system — blind review (A/B/C at 16/20/24/32/48 light/dark)

- A Technical Round (sw2 round, live 22, fill-only dots r1.2–1.4): most coherent; survives 16px (~1.33px); distinct semantics at 48px. Fix required: split `api` (<>) from `gateway` (orbit) — currently collide.
- B Precision Square (sw1.75 butt, rx1): sharpest voice, best database-as-table; thins to ~1.16px at 16px (washout risk); butt caps clip at 20px; cold.
- C Soft Geometric (sw2 round, live 20, circles): best 16px survival, worst semantics — external→clock misread, storage collides database, queue/cluster/network circle confusion.

Selected: A (with api/gateway split). Rejected B (fragility; keep table idea for A refinement) and C (semantic collapse; keep large-dot handling for <16px fallback only).
Specimens: assets/icons/specimen-a/b/c.{light,dark}.svg. Vendor logos remain separate subsystem with provenance.
