/**
 * Direction — adds an explicit `dir` attribute to every block-level
 * node type the description editor supports. The default value is
 * `null`, in which case the renderer falls back to `dir='auto'` so the
 * browser detects direction from the block's text content (the
 * pre-existing behaviour). When translation explicitly sets `dir` to
 * `'rtl'` or `'ltr'` on a node, that value is rendered verbatim — which
 * is necessary because browser auto-detection doesn't reliably flip
 * list-container layout (bullets, numbering, blockquote borders,
 * panel decorations) when ALL children share one direction.
 *
 * Round-tripping through ADF: `dir` is a non-standard attribute that
 * `tiptapToAdf` will pass through alongside other unknown attrs; on
 * reload `adfToTiptap` preserves it. If the round-trip ever drops it
 * the visual still degrades gracefully to `dir='auto'`.
 */
import { Extension } from '@tiptap/core';

const DIR_TARGETS = [
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
];

type DirAttrs = { dir?: string | null };

export const Direction = Extension.create({
  name: 'direction',

  addGlobalAttributes() {
    return [
      {
        types: DIR_TARGETS,
        attributes: {
          dir: {
            default: null,
            renderHTML: (attrs: DirAttrs) => ({
              dir:
                attrs.dir === 'rtl' || attrs.dir === 'ltr'
                  ? attrs.dir
                  : 'auto',
            }),
            parseHTML: (el: HTMLElement) => {
              const d = el.getAttribute('dir');
              return d === 'rtl' || d === 'ltr' ? d : null;
            },
          },
        },
      },
    ];
  },
});
