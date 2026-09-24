// Bespoke ArchMark Core icons v0 — 24 grid, stroke 2, round caps, currentColor.
// Each path drawn for optical balance; specimen sheet required before freeze.
// v0 ships 8 core + aliases; full 21-icon set lands with visual-candidate review.
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
function wrap(inner: string): string { return `<g ${S}>${inner}</g>`; }

export const ICONS: Record<string, string> = {
  actor: wrap('<circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c1.2-3.2 3.6-4.8 6.5-4.8s5.3 1.6 6.5 4.8"/>'),
  service: wrap('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12h6M12 9v6"/>'),
  app: wrap('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M10.5 18.5h3"/>'),
  database: wrap('<ellipse cx="12" cy="6.5" rx="7" ry="2.8"/><path d="M5 6.5v11c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-11"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>'),
  cache: wrap('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>'),
  queue: wrap('<path d="M4 7h16M4 12h16M4 17h16"/><g stroke="none" fill="currentColor"><circle cx="7" cy="7" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="10" cy="17" r="1.4"/></g>'),
  gateway: wrap('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>'),
  worker: wrap('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>'),
  storage: wrap('<path d="M4 7l8-3.5L20 7v10l-8 3.5L4 17z"/><path d="M4 7l8 3.5L20 7M12 10.5V20"/>'),
  model: wrap('<path d="M6 18V9l6-4 6 4v9"/><circle cx="12" cy="13" r="2.2"/><path d="M12 10.8V7M9 17l-1.5 2M15 17l1.5 2"/>'),
  cloud: wrap('<path d="M7 18a4 4 0 01-.5-8A5.5 5.5 0 0117.3 9 3.5 3.5 0 0117 18z"/>'),
  external: wrap('<path d="M9 5H5v14h14v-4"/><path d="M13 5h6v6M19 5l-8 8"/>'),
  api: wrap('<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14"/>'),
  server: wrap('<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><g stroke="none" fill="currentColor"><circle cx="7.5" cy="7.5" r="1.2"/><circle cx="7.5" cy="16.5" r="1.2"/></g>'),
  browser: wrap('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9h17"/><g stroke="none" fill="currentColor"><circle cx="6.2" cy="7" r="0.9"/><circle cx="8.6" cy="7" r="0.9"/></g>'),
};

export function iconFor(kind: string): string {
  return ICONS[kind] ?? ICONS.service;
}
export function iconIds(): string[] { return Object.keys(ICONS); }
