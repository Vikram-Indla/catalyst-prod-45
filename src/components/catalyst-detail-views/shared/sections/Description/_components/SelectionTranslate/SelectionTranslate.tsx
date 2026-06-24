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
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { Fragment, type Node as PMNode } from '@tiptap/pm/model';
import { useTranslation } from '@/hooks/useTranslation';
import { containsArabic } from '@/lib/detectArabic';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';

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

/** True leaf text-bearing blocks. Their textContent IS the unit to translate. */
const LEAF_TEXT_TYPES = new Set(['paragraph', 'heading']);

/** Structural wrappers that get their `dir` attr updated to match the
 *  translation target. These don't carry text directly — they wrap
 *  leaf blocks whose own dir flips. The dir attr on the container is
 *  what flips bullets / numbering / blockquote border / panel icon. */
const STRUCTURAL_CONTAINERS = new Set([
  'bulletList',
  'orderedList',
  'taskList',
  'listItem',
  'taskItem',
  'blockquote',
  'panel',
]);

const SKIP_TYPES = new Set(['codeBlock', 'horizontalRule', 'image']);

export function SelectionTranslate({
  editor,
  containerRef,
  onTranslatingChange,
}: Props) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { translate, isTranslating } = useTranslation();
  const isAnyTranslating = isBatchTranslating || isTranslating;

  useEffect(() => {
    onTranslatingChange?.(isAnyTranslating);
  }, [isAnyTranslating, onTranslatingChange]);

  // Inline error toast with its own X. Atlaskit's flag system hides
  // the dismiss button for colored appearances, so we render our own
  // pill above the editor body when translation can't proceed.
  const showError = (msg: string) => {
    setErrorMsg(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 5000);
  };
  const dismissError = () => {
    setErrorMsg(null);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  };
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

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

  // Render the floating Translate button ONLY when there's a live
  // selection anchor and the editor is editable. The error pill is
  // independent — it shows whenever `errorMsg` is set, regardless of
  // selection state, so the user can read and dismiss it.
  const showButton = !!anchor && editor.isEditable && !isAnyTranslating;

  const handleClick = async () => {
    const { from, to, target } = anchor;

    // Walk the live document (NOT a slice) for nodes whose range
    // intersects the selection. `doc.slice(from, to)` is unreliable
    // for in-paragraph selections — its content is just the inline
    // text and the wrapping paragraph/list-item are "open" rather
    // than part of the content, so leaf blocks can't be found there.
    // `nodesBetween` gives us the real positions to replace in place.
    const leafBlocks: Array<{ node: PMNode; pos: number }> = [];
    const containers: Array<{ node: PMNode; pos: number }> = [];
    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      const name = node.type.name;
      if (SKIP_TYPES.has(name)) return false;
      if (LEAF_TEXT_TYPES.has(name)) {
        leafBlocks.push({ node, pos });
        return false; // leaves' children are inline — don't descend
      }
      if (STRUCTURAL_CONTAINERS.has(name)) {
        containers.push({ node, pos });
      }
      return true; // descend into containers and unknowns
    });

    // Fallback for edge cases: selection inside content that has no
    // paragraph/heading (e.g., only a codeBlock, a smart card, or a
    // single text node Tiptap doesn't expose as a block via
    // nodesBetween). Translate the raw textBetween and replace [from,
    // to] inline. Guarantees we never bail with "Nothing to translate"
    // when the user has selected real text.
    if (leafBlocks.length === 0) {
      const rawText = editor.state.doc.textBetween(from, to, ' ').trim();
      if (!rawText) {
        showError('Select some text to translate.');
        return;
      }
      setIsBatchTranslating(true);
      try {
        const translated = await translate(rawText, {
          issueKey: '',
          field: 'description-selection',
          target,
        });
        if (!translated) {
          showError('Translation failed. Please try again.');
          return;
        }
        const leafDir: 'rtl' | 'ltr' = target === 'ar' ? 'rtl' : 'ltr';
        const tr = editor.state.tr.insertText(translated.trim(), from, to);
        // setNodeMarkup on the wrapping paragraph (if any) so the
        // direction flips for this inline replacement too.
        const $pos = tr.doc.resolve(from);
        for (let d = $pos.depth; d > 0; d--) {
          const node = $pos.node(d);
          const name = node.type.name;
          if (LEAF_TEXT_TYPES.has(name) || STRUCTURAL_CONTAINERS.has(name)) {
            const blockPos = $pos.before(d);
            tr.setNodeMarkup(blockPos, undefined, {
              ...node.attrs,
              dir: leafDir,
            });
          }
        }
        editor.view.dispatch(tr);
        editor.view.focus();
        setAnchor(null);
      } finally {
        setIsBatchTranslating(false);
      }
      return;
    }

    setIsBatchTranslating(true);
    try {
      const translations = await Promise.all(
        leafBlocks.map(({ node }) => {
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
        showError('Translation failed. Please try again.');
        return;
      }

      const schema = editor.state.schema;
      const leafDir: 'rtl' | 'ltr' = target === 'ar' ? 'rtl' : 'ltr';

      let tr = editor.state.tr;

      // Replace leaf blocks in REVERSE document order so earlier
      // positions remain valid as we apply each replacement (each
      // replace shifts positions of subsequent — already-processed —
      // nodes only).
      for (let i = leafBlocks.length - 1; i >= 0; i--) {
        const { node, pos } = leafBlocks[i];
        const translated = (translations[i] || '').trim();
        if (!translated) continue;
        const newAttrs = { ...node.attrs, dir: leafDir };
        const newNode = node.type.create(
          newAttrs,
          Fragment.from(schema.text(translated)),
          node.marks,
        );
        tr = tr.replaceWith(pos, pos + node.nodeSize, newNode);
      }

      // Flip the dir on every structural container the selection
      // touched (bulletList / orderedList / taskList / listItem /
      // taskItem / blockquote / panel). setNodeMarkup only changes
      // attrs (no size delta), so subsequent containers' positions
      // stay valid. We map the original positions through the
      // transaction to account for leaf replacements that resized.
      for (const { pos, node } of containers) {
        const mappedPos = tr.mapping.map(pos);
        const newAttrs = { ...node.attrs, dir: leafDir };
        tr = tr.setNodeMarkup(mappedPos, undefined, newAttrs);
      }

      editor.view.dispatch(tr);
      editor.view.focus();
      setAnchor(null);
    } finally {
      setIsBatchTranslating(false);
    }
  };

  return (
    <>
      {showButton && anchor && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClick}
          style={{
            position: 'absolute',
            top: anchor.top,
            left: anchor.left,
            zIndex: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--ds-surface, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            color: 'var(--ds-text, #172B4D)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: 4,
            boxShadow: '0 1px 3px var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.12))',
          }}
          aria-label={
            anchor.target === 'ar'
              ? 'Translate to Arabic'
              : 'Translate to English'
          }
        >
          <CatyPulseIcon size={14} />
          {anchor.target === 'ar'
            ? 'Translate to Arabic'
            : 'Translate to English'}
        </button>
      )}

      {errorMsg && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 30,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 8px 8px 12px',
            background: 'var(--ds-background-danger, #FFECEB)',
            color: 'var(--ds-text-danger, #AE2A19)',
            border:
              '1px solid var(--ds-border-danger, rgba(174, 42, 25, 0.25))',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 12px var(--ds-shadow-raised, rgba(9, 30, 66, 0.18))',
            maxWidth: 320,
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={dismissError}
            aria-label="Dismiss"
            title="Dismiss"
            style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
