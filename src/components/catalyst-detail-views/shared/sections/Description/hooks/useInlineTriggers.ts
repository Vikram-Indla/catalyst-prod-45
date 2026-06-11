/**
 * useInlineTriggers — watches the editor for @ / : / / trigger characters
 * appearing right before the cursor and surfaces a structured "trigger"
 * state with the picker type, the query text after the trigger, and the
 * screen coordinates to anchor a popup at.
 *
 * On commit, the trigger range is deleted and replaced by the chosen
 * content via editor.commands.insertContent.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

export type TriggerType = 'mention' | 'emoji' | 'slash' | 'ticket';

export interface InlineTrigger {
  type: TriggerType;
  /** Text typed after the trigger character (e.g. "ai" for /ai). */
  query: string;
  /** Document positions for the trigger char + query (inclusive of the trigger). */
  range: { from: number; to: number };
  /** Screen coords where the trigger character starts. */
  coords: { left: number; top: number; bottom: number };
}

const TRIGGER_REGEX = /(?:^|\s)([@:/#])([\w-]{0,40})$/;

export function useInlineTriggers(editor: Editor | null) {
  const [trigger, setTrigger] = useState<InlineTrigger | null>(null);

  useEffect(() => {
    if (!editor) return;

    const recalc = () => {
      const { from, empty } = editor.state.selection;
      if (!empty) {
        setTrigger(null);
        return;
      }
      const $from = editor.state.doc.resolve(from);
      const start = $from.start();
      const textBefore = editor.state.doc.textBetween(start, from, '\n', '\n');
      const m = TRIGGER_REGEX.exec(textBefore);
      if (!m) {
        setTrigger(null);
        return;
      }
      const triggerChar = m[1];
      const query = m[2] ?? '';
      const triggerFrom = from - query.length - 1;
      let coords: { left: number; top: number; bottom: number };
      try {
        coords = editor.view.coordsAtPos(triggerFrom) as {
          left: number; top: number; bottom: number;
        };
      } catch {
        return;
      }
      const type: TriggerType =
        triggerChar === '@' ? 'mention'
        : triggerChar === ':' ? 'emoji'
        : triggerChar === '#' ? 'ticket'
        : 'slash';
      setTrigger({ type, query, range: { from: triggerFrom, to: from }, coords });
    };

    editor.on('selectionUpdate', recalc);
    editor.on('update', recalc);
    // Re-anchor the picker as the page scrolls or the viewport resizes
    // so the popup tracks the @ character smoothly instead of staying
    // at its first viewport position. Capture phase catches scrolls in
    // every ancestor (sidebar, modal body, page) without each needing
    // its own listener.
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      editor.off('selectionUpdate', recalc);
      editor.off('update', recalc);
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [editor]);

  const dismiss = useCallback(() => setTrigger(null), []);

  const commit = useCallback(
    (content: unknown) => {
      if (!editor || !trigger) return;
      editor
        .chain()
        .focus()
        .deleteRange(trigger.range)
        .insertContent(content as Parameters<Editor['commands']['insertContent']>[0])
        .run();
      setTrigger(null);
    },
    [editor, trigger],
  );

  return { trigger, dismiss, commit };
}
