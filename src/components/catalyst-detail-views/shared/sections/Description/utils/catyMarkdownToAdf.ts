/**
 * Minimal markdown → ADF converter for Caty's "Improve description" stream.
 * Handles the block types Caty emits: `# Heading`, `- bullet`,
 * `1. ordered`, GFM tables, plain paragraphs. Inline marks (bold/italic/code)
 * are NOT handled — the user can edit afterward to apply emphasis.
 *
 * Lifted from the existing CatalystDescriptionSection (lines 71-163).
 * Kept as a separate util so the new Description component can reuse it
 * without dragging in the legacy component's other concerns.
 */
import type { AdfDoc } from './adfToTiptap';

type InlineNode =
  | { type: 'text'; text: string }
  | {
      type: 'text';
      text: string;
      marks: Array<{ type: string; attrs?: Record<string, unknown> }>;
    };

/**
 * Parse inline Markdown marks in a single line of text. Order of
 * preference: bold (`**...**`), italic (`*...*` or `_..._`), inline
 * code (`` `...` ``), link (`[label](href)`). Anything between marks
 * is preserved as plain text. Empty input returns a single empty-text
 * node so callers always get at least one node.
 *
 * This is intentionally permissive — partial / mid-stream Markdown
 * (e.g. a half-typed `**bo`) falls through to plain text without
 * crashing. As more chars arrive the next parse will recognise the
 * complete span.
 */
function parseInline(line: string): InlineNode[] {
  if (line === '') return [{ type: 'text', text: '' }];
  const out: InlineNode[] = [];
  // Single combined regex that matches whichever inline span comes
  // next. Bold MUST be checked before italic so `**bold**` doesn't
  // greedily match the outer asterisks as italic.
  const re =
    /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > lastIdx) {
      out.push({ type: 'text', text: line.slice(lastIdx, m.index) });
    }
    const tok = m[0];
    if (tok.startsWith('**') && tok.endsWith('**')) {
      out.push({
        type: 'text',
        text: tok.slice(2, -2),
        marks: [{ type: 'strong' }],
      });
    } else if (tok.startsWith('`') && tok.endsWith('`')) {
      out.push({
        type: 'text',
        text: tok.slice(1, -1),
        marks: [{ type: 'code' }],
      });
    } else if (tok.startsWith('[')) {
      const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        out.push({
          type: 'text',
          text: linkMatch[1],
          marks: [{ type: 'link', attrs: { href: linkMatch[2] } }],
        });
      } else {
        out.push({ type: 'text', text: tok });
      }
    } else if (
      (tok.startsWith('*') && tok.endsWith('*')) ||
      (tok.startsWith('_') && tok.endsWith('_'))
    ) {
      out.push({
        type: 'text',
        text: tok.slice(1, -1),
        marks: [{ type: 'em' }],
      });
    }
    lastIdx = re.lastIndex;
  }
  if (lastIdx < line.length) {
    out.push({ type: 'text', text: line.slice(lastIdx) });
  }
  return out.length > 0 ? out : [{ type: 'text', text: line }];
}

/** GFM table separator row: pipes around dash-only segments, e.g. `| --- | --- |`. */
const SEPARATOR_RE = /^\s*\|?\s*:?-{3,}:?(\s*\|\s*:?-{3,}:?)*\s*\|?\s*$/;

/** Row of pipe-delimited cells. We split a pipe-bearing line on `|`
 *  AFTER stripping leading/trailing pipes and trimming each cell. */
function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.replace(/\\\|/g, '|').trim());
}

/** True when `line` is a candidate table row (contains a `|` somewhere). */
function looksLikeTableRow(line: string): boolean {
  return /\|/.test(line);
}

export function catyMarkdownToAdf(md: string): AdfDoc {
  if (!md.trim()) {
    return { type: 'doc', version: 1, content: [{ type: 'paragraph' }] };
  }
  const lines = md.split('\n');
  const blocks: AdfDoc['content'] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      blocks.push({
        type: 'heading',
        attrs: { level: hMatch[1].length },
        content: parseInline(hMatch[2]),
      });
      i++;
      continue;
    }
    // GFM table: a pipe-bearing line followed by a separator row. The
    // header row is the first line; rows beneath the separator are data.
    if (looksLikeTableRow(line) && SEPARATOR_RE.test(lines[i + 1] ?? '')) {
      const headerCells = splitTableRow(line);
      const rows: AdfDoc['content'] = [];
      // Header row — wrap each cell as a tableHeader containing a paragraph.
      rows.push({
        type: 'tableRow',
        content: headerCells.map((text) => ({
          type: 'tableHeader',
          content: [
            { type: 'paragraph', content: parseInline(text) },
          ],
        })),
      });
      i += 2; // skip header + separator
      // Data rows — keep consuming while we're on pipe-bearing lines.
      while (i < lines.length && looksLikeTableRow(lines[i] ?? '')) {
        const cells = splitTableRow(lines[i] ?? '');
        rows.push({
          type: 'tableRow',
          content: cells.map((text) => ({
            type: 'tableCell',
            content: [
              { type: 'paragraph', content: parseInline(text) },
            ],
          })),
        });
        i++;
      }
      blocks.push({ type: 'table', content: rows });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: AdfDoc['content'] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        items.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInline((lines[i] ?? '').replace(/^[-*]\s+/, '')),
            },
          ],
        });
        i++;
      }
      blocks.push({ type: 'bulletList', content: items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: AdfDoc['content'] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInline((lines[i] ?? '').replace(/^\d+\.\s+/, '')),
            },
          ],
        });
        i++;
      }
      blocks.push({ type: 'orderedList', content: items });
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() &&
      !/^(#{1,6}\s|[-*]\s|\d+\.\s)/.test(lines[i] ?? '') &&
      !(
        looksLikeTableRow(lines[i] ?? '') &&
        SEPARATOR_RE.test(lines[i + 1] ?? '')
      )
    ) {
      paraLines.push(lines[i] ?? '');
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: parseInline(paraLines.join(' ')),
      });
    }
  }
  return {
    type: 'doc',
    version: 1,
    content: blocks.length > 0 ? blocks : [{ type: 'paragraph' }],
  };
}
