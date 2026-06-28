/**
 * DateNode — inline date chip (Jira ADF `date` node, attrs.timestamp ms).
 *
 * v1: read-only display, lossless round-trip. Click-to-edit (calendar
 * popover) deferred.
 */
import { Node, mergeAttributes } from '@tiptap/core';

function formatTimestamp(ms: string | number): string {
  const n = typeof ms === 'string' ? Number(ms) : ms;
  if (!Number.isFinite(n)) return '';
  try {
    return new Date(n).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export const DateNode = Node.create({
  name: 'date',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      timestamp: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-date-timestamp]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const ts = node.attrs.timestamp as string;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-date-timestamp': ts,
        style:
          'background:var(--ds-background-neutral);color:var(--ds-text);padding:0px 6px;border-radius:3px;font-size:12px;',
      }),
      formatTimestamp(ts),
    ];
  },

  renderText({ node }) {
    return formatTimestamp(node.attrs.timestamp as string);
  },
});
