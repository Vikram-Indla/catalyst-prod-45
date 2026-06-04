/**
 * AutoDirection — every time the doc changes, walk every block-level
 * node and set its explicit `dir` attribute ('rtl' or 'ltr') based on
 * the first strong-direction character in its text content.
 *
 * Why explicit dir instead of relying on the browser's `dir='auto'`:
 * `dir='auto'` propagates correctly to text alignment INSIDE an
 * element, but list / panel / blockquote DECORATIONS (bullet position,
 * numbering side, panel border + icon, blockquote border) follow the
 * element's own computed direction. Browsers don't reliably resolve
 * `dir='auto'` on the wrapping `<ul>`/`<ol>`/`<div data-panel>` to RTL
 * when ALL descendant items are Arabic — the bullets stay on the left
 * side even though the text inside reads right-to-left. Setting `dir`
 * explicitly on every node fixes the wrapper's resolved direction,
 * and our CSS uses `padding-inline-start` / `border-inline-start` so
 * the decorations flip automatically once `dir` is `rtl`.
 *
 * The detection is the same algorithm browsers use for `dir='auto'`:
 * find the first character with strong directional class (Latin or
 * Arabic) and apply that direction to the whole block. Neutral text
 * (digits, punctuation) leaves the existing `dir` attribute untouched.
 *
 * The extension piggybacks on ProseMirror's `appendTransaction` hook so
 * the dir update is part of the same atomic transaction as the user's
 * edit — no flicker, undo behaves as one step.
 */
import { Extension } from '@tiptap/core';
import { Plugin, type EditorState, type Transaction } from '@tiptap/pm/state';

/** Block-level node types whose `dir` attribute we manage. */
const DIR_TARGETS = new Set([
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'listItem',
  'taskItem',
  'blockquote',
  'panel',
  'codeBlock',
]);

// Common Arabic / Arabic-presentation Unicode ranges, matching the
// pattern used elsewhere in the codebase (detectArabic, voice-to-text,
// adfLightRenderer).
const ARABIC_RE =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_RE = /[A-Za-z]/;

/**
 * Browser-equivalent first-strong-character direction detection.
 * Returns 'rtl' / 'ltr' for the first strong character, or null when
 * the text has no directional character (caller should leave dir
 * unchanged in that case).
 */
function detectDirection(text: string): 'rtl' | 'ltr' | null {
  for (const ch of text) {
    if (ARABIC_RE.test(ch)) return 'rtl';
    if (LATIN_RE.test(ch)) return 'ltr';
  }
  return null;
}

/**
 * Walk every relevant block in `state` and, for each one whose detected
 * direction doesn't match its current `dir` attr, append a
 * `setNodeMarkup` to the given transaction. Returns whether any block
 * was updated.
 */
function applyDirectionUpdates(state: EditorState, tr: Transaction): boolean {
  let changed = false;
  state.doc.descendants((node, pos) => {
    const name = node.type.name;
    if (!DIR_TARGETS.has(name)) return true;
    const detected = detectDirection(node.textContent);
    if (detected && detected !== node.attrs.dir) {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        dir: detected,
      });
      changed = true;
    }
    return true;
  });
  return changed;
}

export const AutoDirection = Extension.create({
  name: 'autoDirection',

  // Run once after the editor mounts so content loaded from the
  // database (where `dir` may not have round-tripped through ADF)
  // gets its directions resolved immediately — no need for the user
  // to make an edit to trigger the appendTransaction below.
  onCreate() {
    const editor = this.editor;
    const tr = editor.state.tr;
    if (applyDirectionUpdates(editor.state, tr)) {
      editor.view.dispatch(tr);
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          // Only react when the doc actually changed (don't loop on
          // pure selection updates).
          if (!transactions.some((t) => t.docChanged)) return null;
          const tr = newState.tr;
          return applyDirectionUpdates(newState, tr) ? tr : null;
        },
      }),
    ];
  },
});
