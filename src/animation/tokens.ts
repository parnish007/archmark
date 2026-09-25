// Motion tokens: the M1 crisp-technical design system as data, not magic numbers.
// Theme owns token→(duration/easing/weight). Business code references tokens only.
import type { SemanticOp } from '../flow/plan.js';

export type MotionToken = 'requestTraverse' | 'responseTraverse' | 'activation' | 'receivePulse' | 'stateTransition' | 'stagger' | 'settle';

export interface MotionTokenDef {
  durMs: number;
  easing: string;
  weight: 1 | 2 | 3;
}

export const MOTION_TOKENS: Record<MotionToken, MotionTokenDef> = {
  requestTraverse: { durMs: 700, easing: 'paced', weight: 2 },
  responseTraverse: { durMs: 500, easing: 'paced', weight: 1 },
  activation: { durMs: 200, easing: '0.2 0 0 1', weight: 1 },
  receivePulse: { durMs: 200, easing: '0.2 0 0 1', weight: 2 },
  stateTransition: { durMs: 400, easing: '0.2 0 0 1', weight: 2 },
  stagger: { durMs: 90, easing: 'linear', weight: 1 },
  settle: { durMs: 200, easing: '0 0 0 1', weight: 1 },
};

export function tokenForOp(op: SemanticOp): MotionToken {
  switch (op.op) {
    case 'activate':
      return 'activation';
    case 'traverse':
      return op.style === 'hollow' ? 'responseTraverse' : 'requestTraverse';
    case 'pulse':
      return op.style === 'fail' || op.style === 'recover' ? 'stateTransition' : 'receivePulse';
    case 'settle':
      return 'settle';
    default:
      throw new Error(`tokenForOp: unknown semantic op "${(op as SemanticOp).op}" (AM3206)`);
  }
}

// Renderer embellishment tails (timing-domain, single-sourced here):
// broadcast echoes at +stagger/+2×stagger, fail second ring at +FAIL_ECHO_MS.
export const FAIL_ECHO_MS = 100;

export function echoTailMs(style: string): number {
  if (style === 'broadcast') return MOTION_TOKENS.stagger.durMs * 2;
  if (style === 'fail') return FAIL_ECHO_MS;
  return 0;
}
