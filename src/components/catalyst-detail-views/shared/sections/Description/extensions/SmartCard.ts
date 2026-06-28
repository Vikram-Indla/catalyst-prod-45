/**
 * SmartCard — inlineCard / blockCard / embedCard wrappers from Jira ADF.
 *
 * ADF shape:
 *   { type: 'inlineCard', attrs: { url, data? } }    — inline link card
 *   { type: 'blockCard',  attrs: { url, data? } }    — block-level card
 *   { type: 'embedCard',  attrs: { url, layout? } }  — embedded iframe-like
 *
 * v2 (2026-06-04): NodeViews mount a React TicketLinkCard so the editor
 * shows the rich ph_issues-backed card (icon + key + summary + status)
 * inline. Static renderHTML is kept as a serialization fallback for
 * copy/paste and getHTML().
 *
 * Input + paste rules:
 *   - Typing a bare key like `BAU-1234` is converted to an inlineCard
 *     pointing at the canonical browse URL.
 *   - Pasting an Atlassian browse URL is converted to an inlineCard.
 *
 * Lossless round-trip via attrs preservation.
 */
import { Node, mergeAttributes, nodeInputRule, nodePasteRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { InlineCardView, BlockCardView } from './SmartCardView';
import { extractIssueKey } from '@/components/shared/TicketLinkCard';

// Canonical browse-URL host. The same one used by Catalyst's Jira
// connection (CLAUDE.md 2026-05-16). Typed keys are resolved against
// this host so the inlineCard URL is portable across Atlassian
// surfaces (Catalyst, the Jira UI, links shared in chat).
const JIRA_BROWSE_BASE = 'https://digital-transformation.atlassian.net/browse/';

const BARE_KEY_INPUT_REGEX = /(?:^|\s)([A-Z][A-Z0-9]{0,9}-\d+)\s$/;
// Negative look-arounds prevent the bare-key rule from firing on
// keys that live INSIDE a URL ("…?issue=BAU-5957", "/browse/BAU-5957",
// "BAU-5957?status=…") — those are handled by URL_WITH_KEY_REGEX
// below, which replaces the entire URL.
const BARE_KEY_PASTE_REGEX =
  /(?<![A-Za-z0-9/?&=:_-])([A-Z][A-Z0-9]{0,9}-\d+)(?![A-Za-z0-9/?&=_-])/g;
// Any http(s) URL — getAttributes inspects the matched URL and only
// converts when it carries a recognizable ticket key, otherwise the
// rule no-ops and the URL stays as-is.
const URL_WITH_KEY_REGEX = /https?:\/\/[^\s<>"'`]+/g;

export const InlineCard = Node.create({
  name: 'inlineCard',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  // Higher than Link's default (100) so our paste rule sees the URL
  // before Link's autolink wraps it in a link mark.
  priority: 200,

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
          'color:var(--ds-link);text-decoration:none;background:var(--ds-background-neutral-subtle);padding:0px 6px;border-radius:3px;font-size:13px;',
      }),
      url || 'Link',
    ];
  },

  renderText({ node }) {
    return (node.attrs.url as string) || '';
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineCardView);
  },

  addInputRules() {
    return [
      // User typed `BAU-1234 ` (key followed by a space) → convert
      // the key to an inlineCard pointing at the canonical browse URL.
      nodeInputRule({
        find: BARE_KEY_INPUT_REGEX,
        type: this.type,
        getAttributes: (match) => ({
          url: `${JIRA_BROWSE_BASE}${match[1]}`,
        }),
      }),
    ];
  },

  addPasteRules() {
    return [
      // Pasted URL — replace the WHOLE URL when it carries a ticket
      // key anywhere in its path / query. Covers Atlassian browse
      // URLs ("…atlassian.net/browse/BAU-1"), Catalyst routes
      // ("localhost:8080/browse/BAU-1"), and legacy modal URLs
      // ("?issue=BAU-1"). When the URL has no key, getAttributes
      // returns false and the rule no-ops so the URL renders as a
      // normal link.
      nodePasteRule({
        find: URL_WITH_KEY_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const url = match[0];
          const keyMatch = /\b([A-Z][A-Z0-9]{0,9}-\d+)\b/.exec(url);
          if (!keyMatch) return false as unknown as Record<string, unknown>;
          return { url: `${JIRA_BROWSE_BASE}${keyMatch[1]}` };
        },
      }),
      // Pasted bare key (no surrounding URL) → inlineCard.
      nodePasteRule({
        find: BARE_KEY_PASTE_REGEX,
        type: this.type,
        getAttributes: (match) => ({
          url: `${JIRA_BROWSE_BASE}${match[1]}`,
        }),
      }),
    ];
  },

  addProseMirrorPlugins() {
    const inlineCardType = this.type;
    return [
      // Fallback converter: when ANY transaction leaves behind a text
      // node carrying a `link` mark whose href is an Atlassian browse
      // URL, replace that text run with an inlineCard node. This
      // catches three real-world scenarios that the input/paste rules
      // alone miss:
      //   1. Link's `autolink` wraps a typed/pasted URL after our
      //      paste rule runs (different ProseMirror transaction).
      //   2. The user pastes plain text that another extension has
      //      already converted to a link.
      //   3. ADF round-trip from Jira where browse links arrive as
      //      text+link rather than inlineCard.
      new Plugin({
        key: new PluginKey('inlineCard-link-mark-converter'),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const linkType = newState.schema.marks.link;
          if (!linkType) return null;
          let tr = newState.tr;
          let changed = false;
          // Walk back-to-front so the positions stay valid while we
          // replace text spans with single-position nodes.
          const replacements: Array<{ from: number; to: number; url: string }> = [];
          newState.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;
            const linkMark = node.marks.find((m) => m.type === linkType);
            if (!linkMark) return;
            const href = String(linkMark.attrs.href ?? '');
            // Accept either a canonical Atlassian browse URL or ANY
            // URL whose path/query contains a Jira-style key (covers
            // localhost/?issue=KEY and /browse/KEY routes too).
            let issueKey = extractIssueKey(href);
            if (!issueKey) {
              const m = /\b([A-Z][A-Z0-9]{0,9}-\d+)\b/.exec(href);
              if (m) issueKey = m[1];
            }
            if (!issueKey) return;
            replacements.push({
              from: pos,
              to: pos + node.nodeSize,
              url: `${JIRA_BROWSE_BASE}${issueKey}`,
            });
          });
          for (let i = replacements.length - 1; i >= 0; i--) {
            const r = replacements[i];
            tr = tr.replaceWith(r.from, r.to, inlineCardType.create({ url: r.url }));
            changed = true;
          }
          return changed ? tr : null;
        },
      }),
    ];
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
          'border:1px solid var(--ds-border);border-radius:4px;padding:8px 12px;margin:8px 0;background:var(--ds-surface);',
      }),
      [
        'a',
        {
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          style: 'color:var(--ds-link);text-decoration:none;font-size:14px;',
        },
        url || 'Link',
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockCardView);
  },
});
