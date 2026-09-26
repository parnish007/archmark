// Generated-asset ownership proof (accidental-overwrite prevention, NOT authentication).
//
// Every CLI-built SVG carries a deterministic `<metadata>` element identifying the logical
// output it was generated for (owner diagram, kind, flow, variant, tool version). Before
// overwriting an existing file, the build recognizes the marker and refuses anything else.
// A hostile actor with write access can forge the marker — this is not a security boundary
// against malice, only fail-closed protection against clobbering unrelated user data.
import { XMLParser, XMLValidator } from 'fast-xml-parser';

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

// Ownership schema (structural, versioned implicitly by field set):
// - required element: <metadata>, a DIRECT child of the root <svg>
// - required attributes: data-archmark="generated", data-archmark-owner,
//   data-archmark-kind ∈ {static, flow}, data-archmark-variant ∈ {light, dark},
//   data-archmark-version (non-empty, no whitespace — provenance only, see below)
// - flow artifacts additionally require data-archmark-flow; static artifacts must NOT have it
// - version participates in PROVENANCE, not matching: any well-formed version is accepted
//   so package upgrades keep replacing their own output (matching uses owner/kind/flow/variant)
const VERSION_RE = /^[A-Za-z0-9._+-]+$/;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  trimValues: true,
});

type OwnershipRecord = Omit<GeneratedAssetId, 'version'> & { version: string };

// Recognize OUR marker STRUCTURALLY: the bytes must parse as XML whose root is <svg> with
// exactly one direct-child <metadata data-archmark="generated" …/>. Markers inside XML
// comments, CDATA, <text>/<title>/<desc>, nested elements, non-SVG roots, malformed XML,
// or duplicated metadata blocks are NOT ownership — all fail closed (null).
// Only this module touches XML parser structures; callers consume OwnershipRecord | null.
export function parseOwnership(content: string): OwnershipRecord | null {
  if (XMLValidator.validate(content) !== true) return null;
  let doc: unknown;
  try {
    doc = parser.parse(content);
  } catch {
    return null;
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return null;
  const rootKeys = Object.keys(doc);
  // Exactly one root element, and it must be <svg> (processing instructions and the XML
  // declaration are not elements; fast-xml-parser exposes them under '?...' keys).
  const elements = rootKeys.filter((k) => !k.startsWith('?'));
  if (elements.length !== 1 || elements[0] !== 'svg') return null;
  const svg = (doc as Record<string, unknown>).svg;
  if (typeof svg !== 'object' || svg === null || Array.isArray(svg)) return null;
  const meta = (svg as Record<string, unknown>).metadata;
  if (meta === undefined) return null;
  // Duplicate ownership metadata blocks are ambiguous: refuse, never pick first/last.
  if (Array.isArray(meta)) return null;
  if (typeof meta !== 'object' || meta === null) return null;
  const attrs = meta as Record<string, unknown>;
  if (attrs['data-archmark'] !== 'generated') return null;
  const owner = attrs['data-archmark-owner'];
  const kind = attrs['data-archmark-kind'];
  const variant = attrs['data-archmark-variant'];
  const version = attrs['data-archmark-version'];
  const flow = attrs['data-archmark-flow'];
  if (typeof owner !== 'string' || owner.length === 0) return null;
  if (kind !== 'static' && kind !== 'flow') return null;
  if (variant !== 'light' && variant !== 'dark') return null;
  if (typeof version !== 'string' || !VERSION_RE.test(version)) return null;
  if (kind === 'flow') {
    if (typeof flow !== 'string' || flow.length === 0) return null;
  } else if (flow !== undefined) {
    return null;
  }
  return {
    owner,
    kind,
    ...(typeof flow === 'string' ? { flow } : {}),
    variant,
    version,
  };
}

// The expected logical output for a path: same owner + kind + flow + variant.
// Version is provenance only (see above): upgrades keep working without re-approval.
export function isOwnedBy(content: string, expected: Omit<GeneratedAssetId, 'version'>): boolean {
  const found = parseOwnership(content);
  if (!found) return false;
  if (found.owner !== expected.owner || found.kind !== expected.kind) return false;
  if ((found.flow ?? '') !== (expected.flow ?? '')) return false;
  if (found.variant !== expected.variant) return false;
  return true;
}
