/**
 * WikiEditor — Catalyst Wiki's block editor (CAT-DOCS-NOTION-20260704-001).
 *
 * BlockNote (MPL-2.0 core, pinned 0.51.4) themed entirely through ADS
 * tokens (see blocknote-ads.css — the only styling bridge). Loaded ONLY
 * via React.lazy from wiki routes so the editor stays out of the main
 * bundle, mirroring the AtlaskitEditor lazy-load discipline.
 *
 * Content contract:
 *   - `initialContent` IN  — BlockNote Block[] (kb_documents.content with
 *     content_format = 'blocknote'), or undefined for a new page.
 *   - `onChange` OUT — debounce lives with the caller (autosave owner);
 *     this component emits every document change.
 */
import { useMemo } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import type { Block, BlockNoteEditor } from '@blocknote/core';
import { useThemeMode } from '@/providers/ThemeProvider';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import './blocknote-ads.css';

export interface WikiEditorProps {
  initialContent?: Block[];
  editable?: boolean;
  onChange?: (editor: BlockNoteEditor) => void;
  onReady?: (editor: BlockNoteEditor) => void;
  /** Register tag consumed by CatyFlow dictation for tone matching. */
  dictationStyle?: string;
  uploadFile?: (file: File) => Promise<string>;
}

export default function WikiEditor({
  initialContent,
  editable = true,
  onChange,
  onReady,
  dictationStyle = 'brd-page',
  uploadFile,
}: WikiEditorProps) {
  const { resolvedTheme } = useThemeMode();

  const editor = useCreateBlockNote(
    {
      initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
      uploadFile,
    },
    // Re-create only when switching documents, never on theme changes.
    [initialContent],
  );

  useMemo(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  return (
    <div className="wiki-bn" data-dictation-style={dictationStyle} dir="auto">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme}
        onChange={() => onChange?.(editor)}
      />
    </div>
  );
}
