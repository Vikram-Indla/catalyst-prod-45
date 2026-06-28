/**
 * Status — inline colored pill (Jira ADF `status` node).
 *
 * ADF shape:
 *   { type: 'status', attrs: { text, color, localId, style? } }
 *
 * v1: read-only display. Insertion + edit comes later (would need a small
 * popover with text + color picker). Round-trips losslessly via the
 * adapter which preserves all four attrs.
 */
import { Node, mergeAttributes } from '@tiptap/core';

const COLOR_BG: Record<string, string> = {
  neutral: 'var(--ds-background-neutral)',
  purple: 'var(--ds-background-discovery)',
  blue: 'var(--ds-background-information)',
  red: 'var(--ds-background-danger)',
  yellow: 'var(--ds-background-warning)',
  green: 'var(--ds-background-success)',
};

const COLOR_FG: Record<string, string> = {
  neutral: 'var(--ds-text-subtle)',
  purple: 'var(--ds-text-discovery)',
  blue: 'var(--ds-text-information)',
  red: 'var(--ds-text-danger)',
  yellow: 'var(--ds-text-warning)',
  green: 'var(--ds-text-success)',
};

export const Status = Node.create({
  name: 'status',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: { default: '' },
      color: { default: 'neutral' },
      localId: { default: '' },
      style: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-status-id]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const color = (node.attrs.color as string) || 'neutral';
    const bg = COLOR_BG[color] ?? COLOR_BG.neutral;
    const fg = COLOR_FG[color] ?? COLOR_FG.neutral;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-status-id': node.attrs.localId,
        'data-status-color': color,
        style: `background:${bg};color:${fg};padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;`,
      }),
      (node.attrs.text as string) || '',
    ];
  },

  renderText({ node }) {
    return `[${node.attrs.text}]`;
  },
});
