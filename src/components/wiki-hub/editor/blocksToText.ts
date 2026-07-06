/**
 * blocksToText — extract plain text from a BlockNote document for
 * kb_documents.content_text (feeds the generated search_vector).
 */

interface InlineLike {
  type?: string;
  text?: string;
  content?: InlineLike[] | string;
}

interface BlockLike {
  type?: string;
  content?: InlineLike[] | string | { rows?: Array<{ cells?: Array<InlineLike[] | { content?: InlineLike[] }> }> };
  children?: BlockLike[];
}

function inlineText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item: InlineLike) => {
        if (!item) return '';
        if (typeof item.text === 'string') return item.text;
        if (item.content) return inlineText(item.content);
        return '';
      })
      .join('');
  }
  return '';
}

export function blocksToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  const parts: string[] = [];
  const walk = (block: BlockLike) => {
    if (!block) return;
    const c = block.content as BlockLike['content'];
    if (c && typeof c === 'object' && !Array.isArray(c) && 'rows' in c && Array.isArray(c.rows)) {
      // Table content: rows → cells
      c.rows.forEach((row) => {
        (row.cells ?? []).forEach((cell) => {
          const cellContent = Array.isArray(cell) ? cell : cell?.content;
          const t = inlineText(cellContent);
          if (t) parts.push(t);
        });
      });
    } else {
      const t = inlineText(c);
      if (t) parts.push(t);
    }
    (block.children ?? []).forEach(walk);
  };
  (blocks as BlockLike[]).forEach(walk);
  return parts.join('\n');
}
