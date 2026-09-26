// Deterministic static SVG renderer from SceneGraph. Headless, no network.
// GitHub-safe: no nested <svg>, no textPath, midpoint labels with halo.
import type { Scene } from '../core/layout.js';
import { escapeXmlText } from '../core/suggest.js';
import { IdScope } from './ids.js';
import { ownershipMarker, type GeneratedAssetId } from './ownership.js';
import { renderSceneLayer } from './scene-svg.js';
import { DARK, LIGHT, type Theme } from './tokens.js';

export type ThemeName = 'light' | 'dark';
export function themeFor(name: ThemeName): Theme {
  return name === 'dark' ? DARK : LIGHT;
}

export function renderStatic(
  scene: Scene,
  themeName: ThemeName,
  opts: { title?: string; desc?: string; generator?: GeneratedAssetId } = {},
): string {
  const t = themeFor(themeName);
  const title = opts.title ?? 'Architecture diagram';
  const desc = opts.desc ?? `${scene.nodes.length} components, ${scene.edges.length} connections.`;
  const ids = new IdScope('am');
  const arrowId = ids.fixed('arrow');
  const titleId = ids.fixed('title');
  const descId = ids.fixed('desc');
  const layer = renderSceneLayer(scene, t, ids, arrowId);
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
  parts.push('</svg>');
  return parts.join('');
}
