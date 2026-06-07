/**
 * Minimal ADF → Markdown converter used to give the AI a structured
 * view of the existing description when "Improve description" is run.
 *
 * Scope: the subset of nodes the AI actually needs to see preserved:
 *   - doc / paragraph / heading (h1-h6)
 *   - bulletList / orderedList / listItem
 *   - table / tableRow / tableHeader / tableCell (GFM tables)
 *   - blockquote / codeBlock / rule (horizontal rule)
 *   - Inline marks: strong, em, code, link
 *   - text, hardBreak
 *
 * Out of scope (lossy): media, mention, status, date, panel, expand,
 * smart cards. These are uncommon in descriptions the AI is asked to
 * improve, and adding them here would balloon the surface area without
 * a clean Markdown analog.
 */
import type { AdfDoc } from './adfToTiptap';

type AdfNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: AdfNode[];
};

export function adfToMarkdown(adf: AdfDoc | null | undefined): string {
  if (!adf || !Array.isArray(adf.content)) return '';
  return adf.content.map(serializeBlock).filter((s) => s !== '').join('\n\n');
}

function serializeBlock(node: AdfNode): string {
  switch (node.type) {
    case 'paragraph': {
      const text = serializeInline(node.content ?? []);
      return text;
    }
    case 'heading': {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level ?? 1)));
      return `${'#'.repeat(level)} ${serializeInline(node.content ?? [])}`;
    }
    case 'bulletList':
      return (node.content ?? [])
        .map((li) => `- ${serializeListItemContent(li)}`)
        .join('\n');
    case 'orderedList':
      return (node.content ?? [])
        .map((li, i) => `${i + 1}. ${serializeListItemContent(li)}`)
        .join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map((b) => serializeBlock(b))
        .filter((s) => s !== '')
        .join('\n')
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n');
    case 'codeBlock': {
      const lang =
        typeof node.attrs?.language === 'string' ? node.attrs.language : '';
      const text = (node.content ?? [])
        .map((c) => (typeof c.text === 'string' ? c.text : ''))
        .join('');
      return '```' + lang + '\n' + text + '\n```';
    }
    case 'rule':
    case 'horizontalRule':
      return '---';
    case 'table':
      return serializeTable(node);
    default:
      return '';
  }
}

/** A listItem may wrap a paragraph + nested lists. Serialize all blocks,
 *  indenting nested list lines so the AI sees the full hierarchy. */
function serializeListItemContent(li: AdfNode, depth: number = 0): string {
  const blocks = li.content ?? [];
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      parts.push(serializeInline(block.content ?? []));
    } else if (block.type === 'bulletList') {
      const nested = (block.content ?? [])
        .map((child) => `${'  '.repeat(depth + 1)}- ${serializeListItemContent(child, depth + 1)}`)
        .join('\n');
      parts.push(nested);
    } else if (block.type === 'orderedList') {
      const nested = (block.content ?? [])
        .map((child, i) => `${'  '.repeat(depth + 1)}${i + 1}. ${serializeListItemContent(child, depth + 1)}`)
        .join('\n');
      parts.push(nested);
    } else {
      const s = serializeBlock(block);
      if (s) parts.push(s);
    }
  }
  return parts.join('\n');
}

function serializeTable(table: AdfNode): string {
  const rows = (table.content ?? []).filter((r) => r.type === 'tableRow');
  if (rows.length === 0) return '';
  const cellsOf = (row: AdfNode): string[] =>
    (row.content ?? []).map((cell) => {
      // Cells wrap content in paragraph(s) — flatten to one line.
      const text = (cell.content ?? [])
        .map((b) => {
          if (b.type === 'paragraph') return serializeInline(b.content ?? []);
          return serializeInline([b]);
        })
        .join(' ')
        .trim();
      // Escape pipes inside the cell so they don't break the table.
      return text.replace(/\|/g, '\\|');
    });

  const header = cellsOf(rows[0]);
  const separator = header.map(() => '---');
  const body = rows.slice(1).map(cellsOf);

  const fmtRow = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const lines = [fmtRow(header), fmtRow(separator), ...body.map(fmtRow)];
  return lines.join('\n');
}

function serializeInline(nodes: AdfNode[]): string {
  return nodes.map(serializeInlineNode).join('');
}

function serializeInlineNode(node: AdfNode): string {
  if (node.type === 'hardBreak') return '\n';
  if (node.type !== 'text' || typeof node.text !== 'string') return '';

  let text = node.text;
  const marks = node.marks ?? [];

  // Apply marks in a deterministic order: innermost wrappers first
  // (code/em/strong/link). Link is outermost so the URL wraps the
  // mark-decorated text correctly.
  if (marks.some((m) => m.type === 'code')) {
    text = '`' + text + '`';
  }
  if (marks.some((m) => m.type === 'em')) {
    text = '*' + text + '*';
  }
  if (marks.some((m) => m.type === 'strong')) {
    text = '**' + text + '**';
  }
  const link = marks.find((m) => m.type === 'link');
  if (link) {
    const href =
      typeof link.attrs?.href === 'string' ? (link.attrs.href as string) : '';
    text = `[${text}](${href})`;
  }

  return text;
}
