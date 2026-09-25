// Deterministic SVG identifier scope: valid, stable, collision-safe, namespaced.
// Uniqueness is tracked GLOBALLY across all bases: `a` used twice and semantic `a-2`
// can never collide (second emission always gets a fresh suffix). Insertion order is
// caller-sorted, so output is deterministic.
import { slugId } from '../core/suggest.js';

// Single slug implementation shared with the compiler (no forked sanitizers).
export const slugSvg = slugId;

export class IdScope {
  private seen = new Set<string>();
  private counters = new Map<string, number>();
  constructor(private readonly prefix: string) {}
  unique(kind: string, semanticId: string): string {
    const base = `${this.prefix}-${kind}-${slugSvg(semanticId)}`;
    let candidate = base;
    let n = this.counters.get(base) ?? 0;
    while (this.seen.has(candidate)) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    this.counters.set(base, n);
    this.seen.add(candidate);
    return candidate;
  }
  fixed(name: string): string {
    const candidate = `${this.prefix}-${name}`;
    if (this.seen.has(candidate)) throw new Error(`IdScope: fixed id collision on "${candidate}"`);
    this.seen.add(candidate);
    return candidate;
  }
}
