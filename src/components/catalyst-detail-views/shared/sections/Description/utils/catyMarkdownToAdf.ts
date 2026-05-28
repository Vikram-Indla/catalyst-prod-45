/**
 * Minimal markdown → ADF converter for Caty's "Improve description" stream.
 * Handles the four block types Caty emits: `## Heading`, `- bullet`,
 * `1. ordered`, plain paragraphs. Inline marks (bold/italic/code) are NOT
 * handled — the user can edit afterward to apply emphasis.
 *
 * Lifted from the existing CatalystDescriptionSection (lines 71-163).
 * Kept as a separate util so the new Description component can reuse it
 * without dragging in the legacy component's other concerns.
 */
import type { AdfDoc } from './adfToTiptap';

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
        content: [{ type: 'text', text: hMatch[2] }],
      });
      i++;
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
              content: [{ type: 'text', text: (lines[i] ?? '').replace(/^[-*]\s+/, '') }],
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
              content: [{ type: 'text', text: (lines[i] ?? '').replace(/^\d+\.\s+/, '') }],
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
      !/^(#{1,6}\s|[-*]\s|\d+\.\s)/.test(lines[i] ?? '')
    ) {
      paraLines.push(lines[i] ?? '');
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: paraLines.join(' ') }],
      });
    }
  }
  return {
    type: 'doc',
    version: 1,
    content: blocks.length > 0 ? blocks : [{ type: 'paragraph' }],
  };
}
