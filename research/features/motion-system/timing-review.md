# Motion timing blind review — canonical flow (M1/M2/M3)

Critics: motion-design, infovis, a11y, frontend-perf (blind).
Scores (/5) — M1: continuity 5, timing 5, easing 5, clarity 5, calmness 5, hierarchy 5, loop 5, reduced-motion 3.
M2: smoothness 5 but causality 3, clarity 2, hierarchy 2 (fade at origin misdirects; no arrival event).
M3: reduced-motion 5, loop 5, but continuity 2, clarity 2 (400ms subliminal, frozen dot ambiguous).

Selected: M1 crisp-technical (paced 700 + 200ms pulse + begin-chain + freeze). M3 adopted verbatim as
prefers-reduced-motion fallback. M2 opt-in editorial only. Perf: no filters, M1 +340B justified;
all once+freeze, no indefinite loops. Note: M2 probe missing destination box + rx10 deviation —
judged motion-only; rebuild M2 with identical static before theme use.
