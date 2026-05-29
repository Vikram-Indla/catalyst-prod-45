/**
 * SelectionTranslate — floating "Translate to Arabic / English" link
 * shown above any non-empty text selection in the editor. Reuses the
 * existing useTranslation hook which routes through the ai-translate-
 * field edge function (preserves markdown, 4000-token cap). Cache is
 * skipped (issueKey = '') because each selection range is unique and
 * caching every fragment would balloon ph_issue_translations.
 *
 * Structure preservation:
 * The slice under the selection is walked as a ProseMirror Fragment.
 * Each LEAF block (listItem / taskItem / paragraph / heading /
 * blockquote) is translated INDEPENDENTLY in parallel, and the
 * original slice is reconstructed with the translated text swapped in.
 * The slice is then inserted via tr.replace with the ORIGINAL
 * openStart/openEnd preserved, so partial-block edges merge cleanly
 * with surrounding content. Code blocks and horizontal rules are
 * skipped — they're not prose.
 *
 * Trade-off (acknowledged): inline marks (bold/italic/etc.) within a
 * translated block are flattened to plain text. Preserving them would
 * require a markdown round-trip which adds complexity. Block-level
 * structure (the main complaint) IS preserved.
 *
 * While translating, isAnyTranslating is propagated up via the
 * onTranslatingChange callback so the parent (EditorView) can apply
 * the animated rainbow border to the shell.
 */
import { useEffect, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { Slice, Fragment, type Node as PMNode } from '@tiptap/pm/model';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { containsArabic } from '@/lib/detectArabic';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
  onTranslatingChange?: (translating: boolean) => void;
}

interface Anchor {
  top: number;
  left: number;
  target: 'ar' | 'en';
  from: number;
  to: number;
}

const LIST_CONTAINER_TYPES = new Set([
  'bulletList',
  'orderedList',
  'taskList',
]);
const LEAF_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'taskItem',
]);
const SKIP_TYPES = new Set(['codeBlock', 'horizontalRule', 'image']);

function collectLeafBlocks(frag: Fragment, out: PMNode[]): void {
  frag.forEach((node) => {
    const name = node.type.name;
    if (SKIP_TYPES.has(name)) return;
    if (LIST_CONTAINER_TYPES.has(name)) {
      collectLeafBlocks(node.content, out);
      return;
    }
    if (LEAF_BLOCK_TYPES.has(name)) {
      out.push(node);
      return;
    }
    // Unknown wrapper — recurse defensively so we still catch any
    // paragraphs/lists buried inside.
    if (node.content.size > 0) collectLeafBlocks(node.content, out);
  });
}

export function SelectionTranslate({
  editor,
  containerRef,
  onTranslatingChange,
}: Props) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);
  const { translate, isTranslating } = useTranslation();
  const isAnyTranslating = isBatchTranslating || isTranslating;

  useEffect(() => {
    onTranslatingChange?.(isAnyTranslating);
  }, [isAnyTranslating, onTranslatingChange]);

  useEffect(() => {
    const update = () => {
      const sel = editor.state.selection;
      if (sel.empty || !(sel instanceof TextSelection)) {
        setAnchor(null);
        return;
      }
      const text = editor.state.doc
        .textBetween(sel.from, sel.to, ' ')
        .trim();
      if (text.length < 2) {
        setAnchor(null);
        return;
      }
      const container = containerRef.current;
      if (!container) return;

      const startCoords = editor.view.coordsAtPos(sel.from);
      const containerRect = container.getBoundingClientRect();
      const calculatedTop =
        startCoords.top - containerRect.top + container.scrollTop - 30;
      const top = Math.max(4, calculatedTop);
      const left = Math.max(28, startCoords.left - containerRect.left);

      setAnchor({
        top,
        left,
        target: containsArabic(text) ? 'en' : 'ar',
        from: sel.from,
        to: sel.to,
      });
    };

    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor, containerRef]);

  if (!anchor || !editor.isEditable || isAnyTranslating) return null;

  const handleClick = async () => {
    const { from, to, target } = anchor;
    const slice = editor.state.doc.slice(from, to);
    const leafBlocks: PMNode[] = [];
    collectLeafBlocks(slice.content, leafBlocks);

    if (leafBlocks.length === 0) {
      toast.error('Nothing to translate');
      return;
    }

    setIsBatchTranslating(true);
    try {
      const translations = await Promise.all(
        leafBlocks.map((node) => {
          const text = node.textContent.trim();
          if (!text) return Promise.resolve('');
          return translate(text, {
            issueKey: '',
            field: 'description-selection',
            target,
          });
        }),
      );

      if (translations.some((t) => t === null)) {
        toast.error('Translation failed');
        return;
      }

      const schema = editor.state.schema;
      const idxRef = { v: 0 };

      const transformFragment = (frag: Fragment): Fragment => {
        const newChildren: PMNode[] = [];
        frag.forEach((node) => {
          newChildren.push(transformNode(node));
        });
        return Fragment.fromArray(newChildren);
      };

      const transformNode = (node: PMNode): PMNode => {
        const name = node.type.name;
        if (SKIP_TYPES.has(name)) return node;
        if (LIST_CONTAINER_TYPES.has(name)) {
          return node.copy(transformFragment(node.content));
        }
        if (LEAF_BLOCK_TYPES.has(name)) {
          const translated = (translations[idxRef.v++] || '').trim();
          if (!translated) return node;
          // listItem / taskItem / blockquote wrap text in a paragraph;
          // paragraph / heading take text directly.
          if (
            name === 'listItem' ||
            name === 'taskItem' ||
            name === 'blockquote'
          ) {
            const paragraph = schema.nodes.paragraph.create(
              null,
              schema.text(translated),
            );
            return node.copy(Fragment.from(paragraph));
          }
          return node.copy(Fragment.from(schema.text(translated)));
        }
        // Unknown wrapper — recurse so any nested paragraphs/lists get
        // their text swapped too.
        if (node.content.size > 0) {
          return node.copy(transformFragment(node.content));
        }
        return node;
      };

      const newContent = transformFragment(slice.content);
      // Preserve the slice's open ends so partial-block edges merge
      // cleanly with the surrounding document on either side of the
      // selection. Skipping this would force PM to wrap the inserted
      // content in new paragraphs and orphan the unselected halves.
      const newSlice = new Slice(newContent, slice.openStart, slice.openEnd);
      const tr = editor.state.tr.replace(from, to, newSlice);
      editor.view.dispatch(tr);
      editor.view.focus();
      setAnchor(null);
    } finally {
      setIsBatchTranslating(false);
    }
  };

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: anchor.top,
        left: anchor.left,
        zIndex: 20,
        background: 'var(--ds-surface, #FFFFFF)',
        border: 'none',
        color: 'var(--ds-link, #0C66E4)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        padding: '2px 8px',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
        borderRadius: 3,
        boxShadow: '0 1px 3px rgba(9,30,66,0.12)',
      }}
      aria-label={
        anchor.target === 'ar'
          ? 'Translate to Arabic'
          : 'Translate to English'
      }
    >
      {anchor.target === 'ar' ? 'Translate to Arabic' : 'Translate to English'}
    </button>
  );
}
