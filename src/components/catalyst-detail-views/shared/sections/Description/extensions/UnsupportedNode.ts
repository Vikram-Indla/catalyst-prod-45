/**
 * UnsupportedBlock / UnsupportedInline — catch-all wrappers that preserve
 * the original ADF JSON for any node type the editor doesn't natively
 * understand. Renders as a readonly pill labeled with the ADF type.
 *
 * Why: data integrity. Without this, an unknown ADF node (e.g. `expand`,
 * `decisionList`, `layoutSection`) would be dropped on read or degraded
 * to a plain paragraph, then erased on save. The adapter routes such
 * nodes here; the editor preserves them; the reverse adapter unwraps the
 * stored `adf` attr back to the original JSON. Lossless round-trip.
 */
import { Node, mergeAttributes } from '@tiptap/core';

export const UnsupportedBlock = Node.create({
  name: 'unsupportedBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      // The stringified ADF JSON for the original node — restored on save.
      adf: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-unsupported-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    let nodeType = 'unknown';
    try {
      const parsed = JSON.parse(node.attrs.adf as string);
      nodeType = parsed?.type ?? 'unknown';
    } catch {
      // ignore parse errors
    }
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-unsupported-block': node.attrs.adf,
        contenteditable: 'false',
        dir: 'auto',
        style:
          'border:1px dashed var(--ds-border);border-radius:4px;padding:8px 12px;margin:8px 0;background:var(--ds-background-neutral-subtle);color:var(--ds-text-subtle);font-size:12px;font-style:italic;',
        title: `Jira ADF node "${nodeType}" — preserved on save (full edit support coming soon)`,
      }),
      `[Jira ${nodeType} block — preserved]`,
    ];
  },
});

export const UnsupportedInline = Node.create({
  name: 'unsupportedInline',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      adf: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-unsupported-inline]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    let nodeType = 'unknown';
    try {
      const parsed = JSON.parse(node.attrs.adf as string);
      nodeType = parsed?.type ?? 'unknown';
    } catch {
      // ignore
    }
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-unsupported-inline': node.attrs.adf,
        contenteditable: 'false',
        style:
          'background:var(--ds-background-neutral);color:var(--ds-text-subtle);padding:0px 4px;border-radius:3px;font-size:11px;font-style:italic;',
        title: `Jira ADF inline node "${nodeType}" — preserved on save`,
      }),
      `[${nodeType}]`,
    ];
  },
});
