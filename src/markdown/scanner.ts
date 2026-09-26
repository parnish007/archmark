// Markdown region scanner: byte-preserving lexical index of fences + ArchMark regions.
// Protects fenced examples; fail-closed diagnostics (AM21xx). No reserialization.
import { type Diagnostic, diag } from '../core/diagnostics.js';

export interface ByteRange {
  start: number;
  end: number;
}
export interface FenceRange extends ByteRange {
  startLine: number;
  endLine: number;
  char: '`' | '~';
  length: number;
}
export interface CommentRange extends ByteRange {
  startLine: number;
  endLine: number;
  body: string;
}
export interface SourceBlock {
  id: string;
  comment: ByteRange;
  content: ByteRange;
  source: string;
  startLine: number;
  firstLine: number;
  contentStartLine: number;
  dupLine?: number;
}
export interface GeneratedBlock {
  id: string;
  startComment: ByteRange;
  endComment: ByteRange;
  content: ByteRange;
}
export interface MarkdownRegionIndex {
  fences: FenceRange[];
  sources: SourceBlock[];
  generated: GeneratedBlock[];
  diagnostics: Diagnostic[];
  fatal: boolean;
}

interface Line {
  text: string;
  start: number;
  end: number;
  no: number;
}

function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  let no = 1;
  let last = 0;
  for (const m of text.matchAll(/\r\n|\r|\n/g)) {
    const idx = m.index ?? last;
    lines.push({ text: text.slice(last, idx), start: last, end: idx + m[0].length, no: no++ });
    last = idx + m[0].length;
  }
  lines.push({ text: text.slice(last), start: last, end: text.length, no });
  return lines;
}

const RE_FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})[^\n]*$/;
const RE_SOURCE_HEAD = /^archmark(?:\s|$)/;
const RE_ID = /\bid\s*=\s*([A-Za-z0-9_-]+)/;
const RE_GEN_START = /^archmark-render:start\s+([A-Za-z0-9_.-]+)\s*$/;
const RE_GEN_END = /^archmark-render:end\s+([A-Za-z0-9_.-]+)\s*$/;

export function scanMarkdown(text: string): MarkdownRegionIndex {
  const diagnostics: Diagnostic[] = [];
  let fatal = false;
  const fail = (d: Diagnostic) => {
    diagnostics.push(d);
    if (d.severity === 'error') fatal = true;
  };
  const lines = splitLines(text);

  // Single-pass lexical scan with explicit state. Precedence is determined by which
  // construct opens FIRST, matching CommonMark block structure:
  // - NORMAL: fence opens and HTML comment opens are both recognized.
  // - FENCED_CODE: everything is literal until the closing fence; `<!--` is inert.
  // - HTML_COMMENT: fence delimiters are inert; only `-->` ends the comment.
  // In particular a fence token inside a generic multiline HTML comment can never open
  // a code fence (F-H-1), and ArchMark syntax inside fenced code never activates.
  const fences: FenceRange[] = [];
  const comments: CommentRange[] = [];
  let fence: { char: '`' | '~'; len: number; start: number; startLine: number } | null = null;
  let commentStart = -1;
  let commentStartLine = 1;
  // Record a complete comment found while scanning a single line's remainder.
  const pushComment = (start: number, end: number, startLine: number, endLine: number): void => {
    comments.push({ start, end, startLine, endLine, body: text.slice(start + 4, end - 3) });
  };
  // Scan the remainder of a line (after a comment closed mid-line) for further comments.
  // Fence runs are never recognized mid-line: fence detection is line-anchored.
  const scanCommentRest = (t: string, ln: Line, from: number): void => {
    let rest = t.slice(from);
    let base = ln.start + from;
    for (;;) {
      const open = rest.indexOf('<!--');
      if (open < 0) return;
      const absOpen = base + open;
      const close = rest.indexOf('-->', open + 4);
      if (close < 0) {
        commentStart = absOpen;
        commentStartLine = ln.no;
        return;
      }
      const absClose = base + close + 3;
      pushComment(absOpen, absClose, ln.no, ln.no);
      rest = rest.slice(close + 3);
      base = absClose;
    }
  };
  for (const ln of lines) {
    const t = ln.text;
    if (fence !== null) {
      const cm = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(t);
      if (cm && (cm[1] as string)[0] === fence.char && (cm[1] as string).length >= fence.len) {
        fences.push({ start: fence.start, end: ln.end, startLine: fence.startLine, endLine: ln.no, char: fence.char, length: fence.len });
        fence = null;
      }
      continue;
    }
    if (commentStart >= 0) {
      const end = t.indexOf('-->');
      if (end >= 0) {
        const closeEnd = ln.start + end + 3;
        pushComment(commentStart, closeEnd, commentStartLine, ln.no);
        commentStart = -1;
        scanCommentRest(t, ln, end + 3);
      }
      continue;
    }
    // NORMAL state.
    const m = RE_FENCE_OPEN.exec(t);
    if (m) {
      const run = m[1] as string;
      if (run[0] === '`' && /`/.test(t.slice(t.indexOf(run) + run.length))) {
        // backtick info string containing backtick: not a fence
      } else {
        fence = { char: run[0] as '`' | '~', len: run.length, start: ln.start, startLine: ln.no };
        continue;
      }
    }
    const open = t.indexOf('<!--');
    if (open >= 0) {
      const absOpen = ln.start + open;
      const close = t.indexOf('-->', open + 4);
      if (close >= 0) {
        pushComment(absOpen, ln.start + close + 3, ln.no, ln.no);
        scanCommentRest(t, ln, close + 3);
      } else {
        commentStart = absOpen;
        commentStartLine = ln.no;
      }
    }
  }
  if (fence !== null) {
    // Unclosed fence: rest of file is fenced (protected). Record to EOF.
    fences.push({
      start: fence.start,
      end: text.length,
      startLine: fence.startLine,
      endLine: lines[lines.length - 1]?.no ?? 1,
      char: fence.char,
      length: fence.len,
    });
  }
  if (commentStart >= 0) {
    fail(diag('AM2107', 'error', 'Unclosed HTML comment; markers inside cannot be trusted.', commentStartLine, 1, 'Close the comment with --> or remove it.'));
  }

  // Pass 3: classify markers.
  const sources: SourceBlock[] = [];
  const genStarts: { id: string; range: ByteRange; line: number }[] = [];
  const genEnds: { id: string; range: ByteRange; line: number }[] = [];
  // Explicit ids, collected up front so auto ids never collide with them.
  const explicitIds = new Set<string>();
  for (const c of comments) {
    const fl = c.body.trim().split('\n')[0]?.trim() ?? '';
    if (!RE_SOURCE_HEAD.test(fl)) continue;
    const mm = RE_ID.exec(fl);
    if (mm?.[1]) explicitIds.add(mm[1]);
  }
  // Duplicate source IDs: fatal, first + duplicate locations.
  let autoN = 0;
  for (const c of comments) {
    const body = c.body.trim();
    const firstLine = body.split('\n')[0]?.trim() ?? '';
    if (RE_SOURCE_HEAD.test(firstLine)) {
      // Strict id: a dangling `id` keyword without `=value` is malformed, not a default.
      if (/\bid\b/.test(firstLine) && !RE_ID.test(firstLine)) {
        fail(
          diag(
            'AM2108',
            'error',
            `Malformed ArchMark source marker at line ${c.startLine}: "${firstLine.slice(0, 60)}".`,
            c.startLine,
            1,
            'Use <!-- archmark id=<id> … --> exactly.',
          ),
        );
        continue;
      }
      const idm = RE_ID.exec(firstLine);
      let id = idm?.[1] as string | undefined;
      if (!id) {
        do {
          id = autoN === 0 ? 'system' : `system-${autoN}`;
          autoN++;
        } while (explicitIds.has(id));
      }
      // Content = bytes between first line end and comment close (DSL text).
      const headEnd = c.start + 4 + c.body.indexOf('\n');
      const hasNewline = c.body.includes('\n');
      const content: ByteRange = hasNewline ? { start: headEnd + 1, end: c.end - 3 } : { start: c.end - 3, end: c.end - 3 };
      const source = hasNewline ? text.slice(content.start, content.end).trim() : '';
      sources.push({
        id,
        comment: { start: c.start, end: c.end },
        content,
        source,
        startLine: c.startLine,
        firstLine: c.startLine,
        contentStartLine: lineOf(lines, content.start),
      });
      continue;
    }
    let m = RE_GEN_START.exec(body);
    if (m) {
      genStarts.push({ id: m[1] as string, range: { start: c.start, end: c.end }, line: c.startLine });
      continue;
    }
    m = RE_GEN_END.exec(body);
    if (m) {
      genEnds.push({ id: m[1] as string, range: { start: c.start, end: c.end }, line: c.startLine });
      continue;
    }
    // Near-miss detection: looks like a marker but strict parse failed.
    if (/archmark/i.test(body)) {
      fail(
        diag(
          'AM2108',
          'error',
          `Malformed ArchMark marker near line ${c.startLine}: "${firstLine.slice(0, 60)}".`,
          c.startLine,
          1,
          'Use <!-- archmark id=<id> … -->, <!-- archmark-render:start <id> -->, <!-- archmark-render:end <id> --> exactly.',
        ),
      );
    }
  }

  {
    const seen = new Map<string, SourceBlock>();
    for (const s of sources) {
      const prev = seen.get(s.id);
      if (prev) {
        s.dupLine = s.startLine;
        fail(
          diag(
            'AM2103',
            'error',
            `Duplicate ArchMark source id "${s.id}" (first at line ${prev.startLine}, duplicate at line ${s.startLine}).`,
            s.startLine,
            1,
            'Rename one id; ids must be unique per document.',
          ),
        );
      } else seen.set(s.id, s);
    }
  }

  // Generated pairing per id: duplicates, missing ends, stray ends, overlap, misorder.
  const generated: GeneratedBlock[] = [];
  {
    const startsById = new Map<string, typeof genStarts>();
    const endsById = new Map<string, typeof genEnds>();
    for (const s of genStarts) {
      const l = startsById.get(s.id) ?? [];
      l.push(s);
      startsById.set(s.id, l);
    }
    for (const e of genEnds) {
      const l = endsById.get(e.id) ?? [];
      l.push(e);
      endsById.set(e.id, l);
    }
    const ids = new Set([...startsById.keys(), ...endsById.keys()]);
    for (const id of ids) {
      const ss = startsById.get(id) ?? [];
      const es = endsById.get(id) ?? [];
      if (ss.length > 1) {
        for (const d of ss.slice(1))
          fail(
            diag('AM2104', 'error', `Duplicate generated start for "${id}" at line ${d.line}.`, d.line, 1, 'Delete the duplicate region.'),
          );
      }
      if (es.length > 1) {
        for (const d of es.slice(1))
          fail(
            diag('AM2104', 'error', `Duplicate generated end for "${id}" at line ${d.line}.`, d.line, 1, 'Delete the duplicate region.'),
          );
      }
      const s0 = ss[0];
      const e0 = es[0];
      if (s0 && !e0)
        fail(
          diag(
            'AM2101',
            'error',
            `Generated start without end for "${id}" at line ${s0.line}.`,
            s0.line,
            1,
            'Delete the stale region or restore its end marker.',
          ),
        );
      if (!s0 && e0)
        fail(
          diag('AM2102', 'error', `Generated end without start for "${id}" at line ${e0.line}.`, e0.line, 1, 'Delete the stale marker.'),
        );
      if (s0 && e0) {
        if (e0.range.start < s0.range.end) {
          fail(
            diag('AM2105', 'error', `Misordered generated markers for "${id}" (end before start).`, e0.line, 1, 'Restore start…end order.'),
          );
        } else {
          generated.push({ id, startComment: s0.range, endComment: e0.range, content: { start: s0.range.end, end: e0.range.start } });
        }
      }
    }
    // Overlap between any two generated regions.
    const all: ByteRange[] = generated.map((g) => ({ start: g.startComment.start, end: g.endComment.end }));
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i] as ByteRange;
        const b = all[j] as ByteRange;
        if (a.start < b.end && b.start < a.end) {
          fail(
            diag('AM2104', 'error', 'Overlapping generated regions; refusing to patch.', 1, 1, 'Separate or delete overlapping regions.'),
          );
        }
      }
    }
    // Source/generated overlap: comment-vs-comment AND source-inside-generated-content.
    for (const s of sources) {
      for (const g of generated) {
        if (s.comment.start < g.endComment.end && g.startComment.start < s.comment.end) {
          fail(
            diag(
              'AM2104',
              'error',
              `Source "${s.id}" overlaps a generated region; refusing to patch.`,
              s.startLine,
              1,
              'Move the source block outside generated output.',
            ),
          );
        } else if (s.comment.start >= g.startComment.end && s.comment.end <= g.endComment.start) {
          fail(
            diag(
              'AM2104',
              'error',
              `Source "${s.id}" sits inside generated region "${g.id}"; refusing to patch.`,
              s.startLine,
              1,
              'Generated regions are overwritten on build — move the source out.',
            ),
          );
        }
      }
    }
  }

  generated.sort((a, b) => a.startComment.start - b.startComment.start);
  sources.sort((a, b) => a.comment.start - b.comment.start);
  if (sources.length > 50) {
    fail(diag('AM2111', 'error', `Too many ArchMark blocks (${sources.length} > 50).`, 1, 1, 'Split the document.'));
  }
  return { fences, sources, generated, diagnostics, fatal };
}

function lineOf(lines: Line[], offset: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const ln = lines[mid] as Line;
    if (ln.start <= offset) {
      ans = ln.no;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}
