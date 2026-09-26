import type { AnimOp, AnimationIR } from '../animation/ir.js';
import { FAIL_ECHO_MS, MOTION_TOKENS, type MotionToken } from '../animation/tokens.js';
import { summarizeList, truncateGraphemes } from '../core/suggest.js';
// Production SMIL renderer: SceneGraph + AnimationIR + Theme → animated SVG.
// Consumes ONLY the verified subset: animate, animateTransform, animateMotion+mpath,
// set, begin-chaining, fill=freeze. Receives no DSL/AST/README. Static base is shared
// scene serialization (no fork); first frame is complete without animation (fallback).
import type { Scene } from '../core/layout.js';
import { escapeXmlText } from '../core/suggest.js';
import { IdScope } from './ids.js';
import { ownershipMarker, type GeneratedAssetId } from './ownership.js';
import { renderSceneLayer } from './scene-svg.js';
import { type ThemeName, themeFor } from './svg.js';

export interface AnimationRenderer {
  render(
    scene: Scene,
    animation: AnimationIR,
    theme: ThemeName,
    opts?: { title?: string; desc?: string; generator?: GeneratedAssetId },
  ): string;
}

function ms(v: number): string {
  return `${Math.round(v)}ms`;
}

// Easing attributes derived from the token table (single source), never hardcoded per call-site.
// intervals = number of keyTime segments the animation has.
function easeAttrs(token: MotionToken, intervals: number): string {
  const easing = MOTION_TOKENS[token].easing;
  if (easing === 'paced') return 'calcMode="paced"';
  if (easing === 'linear') return 'calcMode="linear"';
  return `calcMode="spline" keySplines="${Array.from({ length: intervals }, () => easing).join(';')}"`;
}

export class SmilRenderer implements AnimationRenderer {
  render(
    scene: Scene,
    animation: AnimationIR,
    themeName: ThemeName,
    opts: { title?: string; desc?: string; generator?: GeneratedAssetId } = {},
  ): string {
    const t = themeFor(themeName);
    const ids = new IdScope('am');
    const arrowId = ids.fixed('arrow');
    const titleId = ids.fixed('title');
    const descId = ids.fixed('desc');
    const layer = renderSceneLayer(scene, t, ids, arrowId);
    const title = opts.title ?? `${animation.archId} ${animation.flowId} flow`;
    const desc = opts.desc ?? animatedDesc(animation);
    const nodeById = new Map(scene.nodes.map((n) => [n.id, n]));
    const anim: string[] = [];
    const ops = [...animation.ops].sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
    // Author-opted loop (`flow <id> loop {`): every timed element repeats indefinitely.
    // Default stays finite+freeze. First frame is complete either way (static base).
    const rep = animation.loop ? ' repeatCount="indefinite"' : '';
    for (const op of ops) {
      anim.push(this.renderOp(op, t, ids, layer.edgePathIds, nodeById, rep));
    }
    const parts: string[] = [];
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${scene.w}" height="${scene.h}" viewBox="0 0 ${scene.w} ${scene.h}" role="img" aria-labelledby="${titleId} ${descId}">`,
    );
    parts.push(`<title id="${titleId}">${escapeXmlText(title)}</title><desc id="${descId}">${escapeXmlText(desc)}</desc>`);
    // Ownership marker: deterministic, invisible. Placed AFTER title/desc so assistive
    // technology keeps first-child title/desc ordering; recognition scans all content.
    if (opts.generator) parts.push(ownershipMarker(opts.generator));
    parts.push(`<rect width="${scene.w}" height="${scene.h}" fill="${t.bg}"/>`);
    parts.push(`<defs>${layer.defs}</defs>`);
    parts.push(layer.body);
    parts.push(`<g id="${ids.fixed('motion')}">`);
    parts.push(anim.join(''));
    parts.push('</g>');
    parts.push('</svg>');
    return parts.join('');
  }

  private renderOp(
    op: AnimOp,
    t: ReturnType<typeof themeFor>,
    ids: IdScope,
    edgePaths: Map<string, string>,
    nodes: Map<string, { x: number; y: number; w: number; h: number }>,
    rep: string,
  ): string {
    const mid = ids.unique('motion', op.id);
    const b = ms(op.startMs);
    const d = ms(op.durMs);
    const accent = t.accent;
    switch (op.kind) {
      case 'traverse': {
        const pathId = edgePaths.get(op.target);
        // Fail loudly (never a silent comment): validated pipelines always resolve targets.
        // Comments are not a semantic protocol and `--` in ids would break XML anyway.
        if (!pathId) throw new Error(`smil: animation references unknown edge "${op.target}"`);
        const hollow = op.style === 'hollow';
        const r = hollow ? 4.5 : 7;
        const fill = hollow ? 'none' : accent;
        const stroke = hollow ? ` stroke="${accent}" stroke-width="2"` : '';
        // Packet fades out over the final 150ms so the frozen end state matches the static
        // diagram (no parked dots). Short traverses (≤150ms) use a 2-knot fade (no duplicate knot).
        const fade =
          op.durMs <= 150
            ? `values="1;0" keyTimes="0;1"`
            : `values="1;1;0" keyTimes="0;${((Math.max(op.startMs, op.startMs + op.durMs - 150) - op.startMs) / op.durMs).toFixed(3)};1"`;
        return `<circle r="${r}" fill="${fill}"${stroke} opacity="0"><set attributeName="opacity" to="1" begin="${b}" fill="freeze"${rep}/><animate attributeName="opacity" ${fade} dur="${d}" begin="${b}" fill="freeze"${rep}/><animateMotion dur="${d}" begin="${b}" fill="freeze"${rep} calcMode="paced"><mpath href="#${pathId}" xlink:href="#${pathId}"/></animateMotion></circle><!--${mid}-->`;
      }
      case 'pulse': {
        const n = nodes.get(op.target);
        if (!n) throw new Error(`smil: animation references unknown node "${op.target}"`);
        const cx = Math.round((n.x + n.w / 2) * 100) / 100;
        const cy = Math.round((n.y + n.h / 2) * 100) / 100;
        // Easing comes from the op's motion token (single source), never hardcoded.
        const opEase2 = easeAttrs(op.token, 2);
        const opEase1 = easeAttrs(op.token, 1);
        const ring = (rr: number, color: string, sw: number, begin: string, dur: string, opPeak: number) =>
          `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="${color}" stroke-width="${sw}" opacity="0"><animate attributeName="opacity" values="0;${opPeak};0" keyTimes="0;0.5;1" dur="${dur}" begin="${begin}" fill="freeze"${rep} ${opEase2}/><animate attributeName="r" values="8;${rr}" keyTimes="0;1" dur="${dur}" begin="${begin}" fill="freeze"${rep} ${opEase1}/></circle>`;
        if (op.style === 'fail') {
          // Non-color redundancy: DOUBLE ring (count=2) + wider peak. Distinguishable in monochrome.
          const color = t.danger;
          return `${ring(18, color, 2, b, d, 0.9)}${ring(24, color, 1.5, ms(op.startMs + FAIL_ECHO_MS), d, 0.6)}<!--${mid}-->`;
        }
        if (op.style === 'recover') {
          // Non-color redundancy: THICK single ring (3px) + standard peak.
          return `${ring(18, accent, 3, b, d, 0.8)}<!--${mid}-->`;
        }
        const color = accent;
        const peak = op.style === 'broadcast' ? 22 : 18;
        const base = ring(peak, color, 2, b, d, op.style === 'broadcast' ? 0.5 : 0.8);
        if (op.style === 'broadcast') {
          // Trailing echoes from the stagger token (M1 parallel grammar).
          const stagger = MOTION_TOKENS.stagger.durMs;
          const e = (off: number) => ring(peak, color, 1.5, ms(op.startMs + off), d, 0.5);
          return `${base}${e(stagger)}${e(stagger * 2)}<!--${mid}-->`;
        }
        return `${base}<!--${mid}-->`;
      }
      case 'activate': {
        if (!op.target) throw new Error('smil: activate op has no target node');
        const n = nodes.get(op.target);
        if (!n) throw new Error(`smil: animation references unknown node "${op.target}"`);
        const cx = Math.round((n.x + n.w / 2) * 100) / 100;
        const cy = Math.round((n.y + n.h / 2) * 100) / 100;
        // Crisp presence dot (not a faint blob): small, near-full peak, same token.
        return `<circle cx="${cx}" cy="${cy}" r="6" fill="${accent}" opacity="0"><animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.5;1" dur="${d}" begin="${b}" fill="freeze"${rep} ${easeAttrs(op.token, 2)}/></circle><!--${mid}-->`;
      }
      default: {
        // Exhaustive: future AnimOpKind values fail compile here first; unreachable at
        // runtime through typed construction, and a loud internal error otherwise.
        const _exhaustive: never = op.kind;
        throw new Error(`smil: unsupported animation operation "${_exhaustive}"`);
      }
    }
  }
}

function animatedDesc(a: AnimationIR): string {
  // Static meaning preserved: describe the flow in words (a11y fallback), truncated.
  const kinds = a.ops.slice(0, 10).map((o) => `${o.kind}:${o.style}`);
  const more = a.ops.length > 10 ? ` (+${a.ops.length - 10} more)` : '';
  return `Animated ${a.flowId} flow (${a.ops.length} events, ${Math.round(a.totalMs)}ms): ${kinds.join(', ')}${more}. Static diagram is complete without animation.`;
}

export function describeFlowAlt(archId: string, flowId: string, steps: { from: string; to: string }[]): string {
  // Bounded like architecture alts (6 steps + count): no kilobyte-scale alt text.
  // Labels are pre-truncated by the caller; grapheme-safety enforced again defensively.
  const seq = steps.map((s) => `${truncateGraphemes(s.from, 24)} → ${truncateGraphemes(s.to, 24)}`);
  return `${archId} ${flowId} flow: ${summarizeList(seq, 6)}`;
}
