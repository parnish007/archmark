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

// Recognize OUR marker in existing file content. Version is lineage info only: any
// archmark version counts as owned. Returns the parsed identity or null.
export function parseOwnership(content: string): (Omit<GeneratedAssetId, 'version'> & { version: string }) | null {
  const m =
    /<metadata\s+data-archmark="generated"\s+data-archmark-owner="([^"]*)"\s+data-archmark-kind="(static|flow)"((?:\s+data-archmark-flow="([^"]*)")?)\s+data-archmark-variant="(light|dark)"\s+data-archmark-version="([^"]*)"\s*\/>/.exec(
      content,
    );
  if (!m) return null;
  return {
    owner: unescape(m[1] as string),
    kind: m[2] as 'static' | 'flow',
    ...(m[4] !== undefined ? { flow: unescape(m[4]) } : {}),
    variant: m[5] as 'light' | 'dark',
    version: unescape(m[6] as string),
  };
}

function unescape(s: string): string {
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
