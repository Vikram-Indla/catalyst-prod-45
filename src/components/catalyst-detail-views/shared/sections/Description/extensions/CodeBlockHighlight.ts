/**
 * CodeBlockHighlight — Tiptap extension that adds a ProseMirror plugin
 * decorating every `codeBlock` node with Prism.js token spans. Edit
 * mode highlighting is purely visual — the underlying text inside the
 * codeBlock stays as a single text run so ADF round-trip is unchanged.
 *
 * How it works:
 *   1. The plugin's state holds a DecorationSet covering all codeBlocks
 *      in the doc.
 *   2. On every transaction, we walk the doc, find each codeBlock, run
 *      Prism over its textContent, and emit inline decorations for the
 *      tokens (one decoration per token, with `class: 'token KIND'`).
 *   3. Grammars are loaded lazily: when a codeBlock requests a grammar
 *      that isn't registered yet, we kick off the async import and
 *      re-dispatch a no-op transaction once it resolves so the doc
 *      re-highlights with the now-loaded grammar.
 *
 * Why a plugin and not a NodeView replacement: the existing
 * CodeBlockWithGutter NodeView owns the wrapper / gutter / pre DOM
 * (line numbers, wrap, data-attrs). Adding the highlighter as a
 * decoration layer composes cleanly with that NodeView instead of
 * fighting it for ownership of the contentDOM.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import Prism from 'prismjs';
import { ensureGrammar, resolvePrismId } from '../utils/prismHighlight';

interface PrismToken {
  type: string;
  content: string | (string | PrismToken)[];
  alias?: string | string[];
  length: number;
}

const codeBlockHighlightKey = new PluginKey('catalystCodeBlockHighlight');

/**
 * Recursively walk a Prism token tree and emit a decoration for each
 * leaf, advancing `pos` by the encoded text length. The Token.length
 * property is the length of the source text the token covers, which
 * is what PM positions count.
 */
function emitTokenDecorations(
  tokens: (string | PrismToken)[],
  blockStart: number,
  parentClass: string,
  out: Decoration[],
): number {
  let pos = blockStart;
  for (const t of tokens) {
    if (typeof t === 'string') {
      pos += t.length;
      continue;
    }
    const aliasArr = Array.isArray(t.alias) ? t.alias : t.alias ? [t.alias] : [];
    const ownClass = ['token', t.type, ...aliasArr].join(' ');
    const combined = parentClass ? `${parentClass} ${ownClass}` : ownClass;
    if (typeof t.content === 'string') {
      const start = pos;
      const end = pos + t.content.length;
      if (end > start) {
        out.push(
          Decoration.inline(start, end, { class: combined }),
        );
      }
      pos = end;
    } else {
      // Nested tokens — pass our class down so child spans inherit it.
      pos = emitTokenDecorations(t.content, pos, combined, out);
    }
  }
  return pos;
}

function buildDecorationsForBlock(
  block: PMNode,
  blockPos: number,
  out: Decoration[],
  scheduleReload: (prismId: string) => void,
): void {
  const language = (block.attrs.language as string | null | undefined) ?? null;
  const prismId = resolvePrismId(language);
  if (!prismId) return;
  if (!Prism.languages[prismId]) {
    scheduleReload(prismId);
    return;
  }
  const text = block.textContent;
  if (!text) return;
  const tokens = Prism.tokenize(text, Prism.languages[prismId]);
  // blockPos is the position of the codeBlock node; +1 enters the node
  // and lands at offset 0 of its text content.
  emitTokenDecorations(tokens as (string | PrismToken)[], blockPos + 1, '', out);
}

function buildDecorations(
  doc: PMNode,
  scheduleReload: (prismId: string) => void,
): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'codeBlock') {
      buildDecorationsForBlock(node, pos, decos, scheduleReload);
      return false; // codeBlocks don't nest
    }
    return undefined;
  });
  return DecorationSet.create(doc, decos);
}

export const CodeBlockHighlight = Extension.create({
  name: 'catalystCodeBlockHighlight',

  addProseMirrorPlugins() {
    let viewRef: { view: unknown } | null = null;

    const scheduleReload = (prismId: string) => {
      ensureGrammar(prismId).then(() => {
        // Re-dispatch a no-op transaction to trigger plugin recompute.
        // viewRef is set lazily in the `view()` hook below.
        const v = viewRef?.view as
          | { state: { tr: { setMeta: (k: PluginKey, v: unknown) => unknown } }; dispatch: (tr: unknown) => void }
          | null;
        if (!v) return;
        v.dispatch(v.state.tr.setMeta(codeBlockHighlightKey, { reload: true }));
      });
    };

    return [
      new Plugin({
        key: codeBlockHighlightKey,
        state: {
          init: (_, { doc }) => buildDecorations(doc, scheduleReload),
          apply(tr, oldSet) {
            const reload = tr.getMeta(codeBlockHighlightKey);
            if (!tr.docChanged && !reload) return oldSet.map(tr.mapping, tr.doc);
            return buildDecorations(tr.doc, scheduleReload);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        view(view) {
          viewRef = { view };
          return {
            destroy() {
              viewRef = null;
            },
          };
        },
      }),
    ];
  },
});
