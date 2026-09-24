// Animation IR contracts (abstraction now; SMIL backend next after Phase 0 probes).
// No SVG leakage: renderers compile AnimationIR → SMIL/frames.
export type AnimPrimitive =
  | { op: 'send'; from: string; to: string; edgeId: string; dur?: number }
  | { op: 'response'; from: string; to: string; edgeId: string; dur?: number }
  | { op: 'pulse'; nodeId: string; dur?: number }
  | { op: 'activate'; nodeId: string; dur?: number }
  | { op: 'wait'; ms: number }
  | { op: 'parallel'; items: AnimPrimitive[] }
  | { op: 'sequence'; items: AnimPrimitive[] }
  | { op: 'fail'; nodeId: string }
  | { op: 'recover'; nodeId: string }
  | { op: 'reroute'; from: string; to: string; viaEdgeId: string };

export interface TimelineEvent { t: number; dur: number; prim: AnimPrimitive }
export const DUR = { micro: 200, flow: 500, traverse: 700, ambient: 1200, stagger: 90 } as const;
export const EASE = { standard: '0.2 0 0 1', decelerate: '0 0 0 1', accelerate: '0.3 0 1 1' } as const;

export function flowToTimeline(flow: { steps: { from: string; to: string }[] }, edgeIdOf: (from: string, to: string) => string): TimelineEvent[] {
  // request→pulse→response choreography skeleton; durations from DUR.
  const events: TimelineEvent[] = [];
  let t = 0;
  for (const s of flow.steps) {
    events.push({ t, dur: DUR.traverse, prim: { op: 'send', from: s.from, to: s.to, edgeId: edgeIdOf(s.from, s.to), dur: DUR.traverse } });
    t += DUR.traverse;
    events.push({ t, dur: DUR.micro, prim: { op: 'pulse', nodeId: s.to, dur: DUR.micro } });
    t += DUR.micro;
  }
  return events;
}
