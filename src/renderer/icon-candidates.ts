// Icon candidates — three coherent languages for blind review.
// Grid: 24×24 for all. See research/features/icon-system/candidates.md for philosophy.
function g(strokeWidth: number, cap: string, inner: string, extra = ''): string {
  return `<g fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="${cap}" stroke-linejoin="round"${extra}>${inner}</g>`;
}
const DOT = (cx: number, cy: number, r: number) => `<g stroke="none" fill="currentColor"><circle cx="${cx}" cy="${cy}" r="${r}"/></g>`;

// Candidate A — Technical Round (v0 foundation): sw 2, round caps, rx soft.
export const CANDIDATE_A: Record<string, string> = {
  actor: g(2, 'round', '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c1.2-3.2 3.6-4.8 6.5-4.8s5.3 1.6 6.5 4.8"/>'),
  browser: g(2, 'round', '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9h17"/>') + DOT(6.2, 7, 0.9) + DOT(8.6, 7, 0.9),
  mobile: g(2, 'round', '<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/>'),
  app: g(2, 'round', '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M10.5 18.5h3"/>'),
  service: g(2, 'round', '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12h6M12 9v6"/>'),
  api: g(2, 'round', '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>'),
  server: g(2, 'round', '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/>') + DOT(7.5, 7.5, 1.2) + DOT(7.5, 16.5, 1.2),
  worker: g(2, 'round', '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>'),
  database: g(2, 'round', '<ellipse cx="12" cy="6.5" rx="7" ry="2.8"/><path d="M5 6.5v11c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-11"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>'),
  cache: g(2, 'round', '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>'),
  queue: g(2, 'round', '<path d="M4 7h16M4 12h16M4 17h16"/>') + DOT(7, 7, 1.4) + DOT(15, 12, 1.4) + DOT(10, 17, 1.4),
  storage: g(2, 'round', '<path d="M4 7l8-3.5L20 7v10l-8 3.5L4 17z"/><path d="M4 7l8 3.5L20 7M12 10.5V20"/>'),
  filesystem: g(2, 'round', '<path d="M4 6h6l2 2h8v10H4z"/><path d="M4 6v12"/>'),
  cloud: g(2, 'round', '<path d="M7 18a4 4 0 01-.5-8A5.5 5.5 0 0117.3 9 3.5 3.5 0 0117 18z"/>'),
  external: g(2, 'round', '<path d="M9 5H5v14h14v-4"/><path d="M13 5h6v6M19 5l-8 8"/>'),
  model: g(2, 'round', '<path d="M6 18V9l6-4 6 4v9"/><circle cx="12" cy="13" r="2.2"/><path d="M12 10.8V7M9 17l-1.5 2M15 17l1.5 2"/>'),
  agent: g(2, 'round', '<circle cx="12" cy="12" r="7.5"/><circle cx="9.5" cy="11" r="1.2"/><circle cx="14.5" cy="11" r="1.2"/><path d="M9 14.5c1 1 2 1.5 3 1.5s2-.5 3-1.5"/>'),
  function: g(2, 'round', '<path d="M9 3L5 12l4 9M15 3l4 9-4 9"/>'),
  container: g(2, 'round', '<rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M3 10h18M7 7v10M17 7v10"/>'),
  cluster: g(2, 'round', '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
  network: g(2, 'round', '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7.5 7.5l3.5 8M16.5 7.5l-3.5 8M8.2 6h7.6"/>'),
};

// Candidate B — Precision Square: sw 1.75, butt/square structure, rx 1, tighter gaps.
export const CANDIDATE_B: Record<string, string> = {
  actor: g(1.75, 'butt', '<circle cx="12" cy="7.5" r="3"/><path d="M6 19v-2a6 6 0 0112 0v2"/>'),
  browser: g(1.75, 'butt', '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 9h16"/>') + DOT(6.5, 7, 0.8) + DOT(8.8, 7, 0.8),
  mobile: g(1.75, 'butt', '<rect x="8.5" y="3" width="7" height="18" rx="1"/><path d="M11 18h2"/>'),
  app: g(1.75, 'butt', '<rect x="5.5" y="3.5" width="13" height="17" rx="1"/><path d="M10.5 18.5h3"/>'),
  service: g(1.75, 'butt', '<rect x="4.5" y="4.5" width="15" height="15" rx="1"/><path d="M9 12h6M12 9v6"/>'),
  api: g(1.75, 'butt', '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13 6l-2 12"/>'),
  server: g(1.75, 'butt', '<rect x="4.5" y="4.5" width="15" height="6.5" rx="1"/><rect x="4.5" y="13" width="15" height="6.5" rx="1"/>') + DOT(7.5, 7.7, 1) + DOT(7.5, 16.2, 1),
  worker: g(1.75, 'butt', '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>'),
  database: g(1.75, 'butt', '<rect x="5" y="4" width="14" height="16" rx="1"/><ellipse cx="12" cy="8" rx="5" ry="2"/><path d="M7 8v8c0 1.1 2.2 2 5 2s5-.9 5-2V8"/>'),
  cache: g(1.75, 'butt', '<path d="M12 3.5l7.5 4v9L12 20.5l-7.5-4v-9z"/><path d="M12 12l7.5-4.5M12 12L4.5 7.5M12 12v8.5"/>'),
  queue: g(1.75, 'butt', '<path d="M4 7.5h16M4 12h16M4 16.5h16"/>') + DOT(7, 7.5, 1.2) + DOT(15, 12, 1.2) + DOT(10, 16.5, 1.2),
  storage: g(1.75, 'butt', '<path d="M4.5 7.5L12 4l7.5 3.5v9L12 20l-7.5-3.5z"/><path d="M4.5 7.5L12 11l7.5-3.5M12 11v9"/>'),
  filesystem: g(1.75, 'butt', '<path d="M4 6.5h5.5L11.5 9H20v10H4z"/>'),
  cloud: g(1.75, 'butt', '<path d="M7 18.5a4 4 0 01-.5-8A5.5 5.5 0 0117.3 9.5 3.5 3.5 0 0117 18.5z"/>'),
  external: g(1.75, 'butt', '<path d="M9.5 5.5H5.5v13h13v-4"/><path d="M13 5.5h5.5V11M18.5 5.5L11 13"/>'),
  model: g(1.75, 'butt', '<path d="M6.5 17.5V9.5l5.5-4 5.5 4v8"/><rect x="10" y="11.5" width="4" height="4" rx="1"/>'),
  agent: g(1.75, 'butt', '<rect x="5" y="5" width="14" height="14" rx="3"/><circle cx="9.5" cy="11" r="1"/><circle cx="14.5" cy="11" r="1"/><path d="M9 14.5h6"/>'),
  function: g(1.75, 'butt', '<path d="M9.5 3.5L6 12l3.5 8.5M14.5 3.5L18 12l-3.5 8.5"/>'),
  container: g(1.75, 'butt', '<rect x="3.5" y="7.5" width="17" height="9" rx="1"/><path d="M3.5 10.5h17"/>'),
  cluster: g(1.75, 'butt', '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1"/><rect x="13" y="13" width="7.5" height="7.5" rx="1"/>'),
  network: g(1.75, 'butt', '<rect x="4" y="4" width="4.5" height="4.5" rx="1"/><rect x="15.5" y="4" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="15.5" width="4.5" height="4.5" rx="1"/><path d="M6.5 8.5v3h11v-3M12 11.5v4"/>'),
};

// Candidate C — Soft Geometric: sw 2, round, larger padding, filled accents, rounder.
export const CANDIDATE_C: Record<string, string> = {
  actor: g(2, 'round', '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/>'),
  browser: g(2, 'round', '<rect x="4" y="5.5" width="16" height="13" rx="3"/><path d="M4 9.5h16"/>') + DOT(6.8, 7.5, 1) + DOT(9.2, 7.5, 1),
  mobile: g(2, 'round', '<rect x="8.5" y="2.5" width="7" height="19" rx="3"/>') + DOT(12, 18.5, 1),
  app: g(2, 'round', '<rect x="6" y="3" width="12" height="18" rx="3.5"/>') + DOT(12, 17.5, 1),
  service: g(2, 'round', '<circle cx="12" cy="12" r="8"/><path d="M9 12h6M12 9v6"/>'),
  api: g(2, 'round', '<path d="M7 8l-3 4 3 4M17 8l3 4-3 4M13.5 5l-3 14"/>'),
  server: g(2, 'round', '<rect x="5" y="4.5" width="14" height="6.5" rx="3"/><rect x="5" y="13" width="14" height="6.5" rx="3"/>') + DOT(8, 7.7, 1.2) + DOT(8, 16.2, 1.2),
  worker: g(2, 'round', '<circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5"/>') + DOT(12, 12, 1),
  database: g(2, 'round', '<ellipse cx="12" cy="7" rx="6.5" ry="2.5"/><path d="M5.5 7v10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V7"/>'),
  cache: g(2, 'round', '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/>'),
  queue: g(2, 'round', '<circle cx="7" cy="7" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="7" cy="17" r="2"/><path d="M9 7h4M9 17h4"/>'),
  storage: g(2, 'round', '<ellipse cx="12" cy="8" rx="7" ry="2.5"/><path d="M5 8v8c0 3 3 5 7 5s7-2 7-5V8"/>'),
  filesystem: g(2, 'round', '<path d="M4.5 6.5h5l2 2.5h8v9.5h-15z"/>'),
  cloud: g(2, 'round', '<path d="M7.5 18.5a4.5 4.5 0 01-.5-9A6 6 0 0118 8.5a4 4 0 01-.5 10z"/>'),
  external: g(2, 'round', '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/>'),
  model: g(2, 'round', '<path d="M12 3.5l7 4v9l-7 4-7-4v-9z"/><circle cx="12" cy="12" r="2"/>'),
  agent: g(2, 'round', '<circle cx="12" cy="12" r="8"/><path d="M8.5 12h.5M11.5 12h.5M14.5 12h.5M9 15c2 1.5 4 1.5 6 0"/>'),
  function: g(2, 'round', '<rect x="6" y="6" width="12" height="12" rx="6"/><path d="M10 9.5l-1.5 2.5L10 14.5M14 9.5l1.5 2.5L14 14.5"/>'),
  container: g(2, 'round', '<rect x="4" y="8" width="16" height="8" rx="4"/><path d="M4 12h16"/>'),
  cluster: g(2, 'round', '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="8" cy="16" r="3"/><circle cx="16" cy="16" r="3"/>'),
  network: g(2, 'round', '<circle cx="12" cy="5.5" r="2"/><circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/><path d="M12 7.5v4M12 11.5L5.5 16M12 11.5l6.5 4.5"/>'),
};

export const CANDIDATES = { A: CANDIDATE_A, B: CANDIDATE_B, C: CANDIDATE_C } as const;
export type CandidateName = keyof typeof CANDIDATES;
