// Generated-asset ownership proof (accidental-overwrite prevention, NOT authentication).
//
// Every CLI-built SVG carries a deterministic `<metadata>` element identifying the logical
// output it was generated for (owner diagram, kind, flow, variant, tool version). Before
// overwriting an existing file, the build recognizes the marker and refuses anything else.
// A hostile actor with write access can forge the marker — this is not a security boundary
// against malice, only fail-closed protection against clobbering unrelated user data.
export interface GeneratedAssetId {
  owner: string;
  kind: 'static' | 'flow';
  flow?: string;
  variant: 'light' | 'dark';
  version: string;
}

export function ownershipMarker(id: GeneratedAssetId): string {
  const flow = id.kind === 'flow' ? ` data-archmark-flow="${escapeAttr(id.flow ?? '')}"` : '';
  return `<metadata data-archmark="generated" data-archmark-owner="${escapeAttr(id.owner)}" data-archmark-kind="${id.kind}"${flow} data-archmark-variant="${id.variant}" data-archmark-version="${escapeAttr(id.version)}"/>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Recognize OUR marker in existing file content. Tolerant by design: attribute order,
// whitespace (including newlines), and `<metadata …></metadata>` vs self-closing form all
// parse — a future formatter/optimizer must not turn our own output into a refusal.
// Version is lineage info only: any archmark version counts as owned.
// Returns the parsed identity or null.
export function parseOwnership(content: string): (Omit<GeneratedAssetId, 'version'> & { version: string }) | null {
  const tag = /<metadata\b([^>]*)>(?:<\/metadata>)?/.exec(content);
  // A `<metadata>` without our marker attribute is not ours. (Self-closing `<…/>` also
  // matches: `[^>]*` stops before `>` and the optional closer is simply absent.)
  if (!tag || !/data-archmark="generated"/.test(tag[1] as string)) return null;
  const attr = (name: string): string | undefined => {
    const m = new RegExp(`${name}="([^"]*)"`).exec(tag[1] as string);
    return m ? unescapeAttr(m[1] as string) : undefined;
  };
  const owner = attr('data-archmark-owner');
  const kind = attr('data-archmark-kind');
  const variant = attr('data-archmark-variant');
  const version = attr('data-archmark-version');
  if (owner === undefined || version === undefined) return null;
  if (kind !== 'static' && kind !== 'flow') return null;
  if (variant !== 'light' && variant !== 'dark') return null;
  const flow = attr('data-archmark-flow');
  if (kind === 'flow' && flow === undefined) return null;
  if (kind === 'static' && flow !== undefined) return null;
  return {
    owner,
    kind,
    ...(flow !== undefined ? { flow } : {}),
    variant,
    version,
  };
}

function unescapeAttr(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

// The expected logical output for a path: same owner + kind + flow (+ variant when known).
// Variant is checked when the caller knows it (CLI always does); owner/kind/flow always.
export function isOwnedBy(content: string, expected: Omit<GeneratedAssetId, 'version'>): boolean {
  const found = parseOwnership(content);
  if (!found) return false;
  if (found.owner !== expected.owner || found.kind !== expected.kind) return false;
  if ((found.flow ?? '') !== (expected.flow ?? '')) return false;
  if (found.variant !== expected.variant) return false;
  return true;
}
