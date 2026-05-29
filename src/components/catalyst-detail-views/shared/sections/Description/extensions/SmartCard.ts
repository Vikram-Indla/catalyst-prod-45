/**
 * SmartCard — inlineCard / blockCard / embedCard wrappers from Jira ADF.
 *
 * ADF shape:
 *   { type: 'inlineCard', attrs: { url, data? } }    — inline link card
 *   { type: 'blockCard',  attrs: { url, data? } }    — block-level card
 *   { type: 'embedCard',  attrs: { url, layout? } }  — embedded iframe-like
 *
 * v1: read-only — renders the URL as a clickable styled link.
 * Lossless round-trip via attrs preservation.
 */
import { Node, mergeAttributes } from '@tiptap/core';

export const InlineCard = Node.create({
  name: 'inlineCard',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: '' },
      data: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-inline-card-url]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const url = node.attrs.url as string;
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-inline-card-url': url,
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        style:
          'color:var(--ds-link,#0C66E4);text-decoration:none;background:var(--ds-background-neutral-subtle,#F7F8F9);padding:1px 6px;border-radius:3px;font-size:13px;',
      }),
      url || 'Link',
    ];
  },

  renderText({ node }) {
    return (node.attrs.url as string) || '';
  },
});

export const BlockCard = Node.create({
  name: 'blockCard',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: '' },
      data: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block-card-url]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const url = node.attrs.url as string;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block-card-url': url,
        dir: 'auto',
        style:
          'border:1px solid var(--ds-border,#DFE1E6);border-radius:4px;padding:8px 12px;margin:8px 0;background:var(--ds-surface,#FFFFFF);',
      }),
      [
        'a',
        {
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          style: 'color:var(--ds-link,#0C66E4);text-decoration:none;font-size:14px;',
        },
        url || 'Link',
      ],
    ];
  },
});
