/**
 * StoryRichTextEditor — Atlassian-style TipTap rich text editor
 * Jira-matching toolbar: B I U S | H1–H6 | Lists | Code Link | Undo Redo
 * Output: ADF (Atlassian Document Format) JSON
 * Modes: "save" (Save/Cancel buttons) | "autosave" (debounced save on blur)
 */
import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  List, ListOrdered, Code2, Link2, Undo2, Redo2,
} from 'lucide-react';
import { tiptapJsonToAdf, resolveEditorContent } from './adf-utils';

interface StoryRichTextEditorProps {
  /** Raw content from DB — can be ADF JSON string or legacy HTML */
  content: string;
  /** Called with ADF JSON string on save */
  onSave: (adfJson: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  minHeight?: number;
  compact?: boolean;
  autoSave?: boolean;
}

// ─── Debounce helper ─────────────────────────────────────────
function useDebouncedCallback(fn: (...args: any[]) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  return useCallback((...args: any[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delay);
  }, [delay]);
}

// ─── Toolbar button ─────────────────────────────────────────
const ToolbarBtn = React.memo(function ToolbarBtn({
  active, onClick, title, children, disabled,
}: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 28, height: 28, borderRadius: 4, border: 'none', cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? '#DEEBFF' : 'transparent',
        color: active ? '#0747A6' : disabled ? '#C1C7D0' : '#42526E',
        padding: 0, transition: 'background 0.12s, color 0.12s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => { if (!active && !disabled) e.currentTarget.style.background = '#F4F5F7'; }}
      onMouseLeave={(e) => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
});

// ─── Toolbar heading text button (H1–H6) ───────────────────
const HeadingBtn = React.memo(function HeadingBtn({
  level, active, onClick,
}: {
  level: number; active: boolean; onClick: () => void;
}) {
  const icons: Record<number, React.ReactNode> = {
    1: <Heading1 size={15} />,
    2: <Heading2 size={15} />,
    3: <Heading3 size={15} />,
    4: <Heading4 size={15} />,
    5: <Heading5 size={15} />,
    6: <Heading6 size={15} />,
  };
  return (
    <ToolbarBtn active={active} onClick={onClick} title={`Heading ${level}`}>
      {icons[level]}
    </ToolbarBtn>
  );
});

// ─── Toolbar separator ──────────────────────────────────────
function Sep() {
  return <div style={{ width: 1, height: 18, background: '#DFE1E6', margin: '0 4px', flexShrink: 0 }} />;
}

// ─── Main editor component ──────────────────────────────────
export const StoryRichTextEditor = React.memo(function StoryRichTextEditor({
  content, onSave, onCancel, placeholder = 'Start typing...', minHeight = 200, compact = false, autoSave = false,
}: StoryRichTextEditorProps) {
  const lastSavedRef = useRef<string>(content);
  const isInitialMount = useRef(true);

  // Resolve content: ADF JSON → TipTap JSON, or HTML string
  const initialContent = useMemo(() => resolveEditorContent(content), [content]);

  const emitAdf = useCallback((ed: any) => {
    const json = ed.getJSON();
    const adf = tiptapJsonToAdf(json);
    const adfStr = JSON.stringify(adf);
    // Skip if content is just an empty doc
    const isEmpty = !adf.content || adf.content.length === 0 ||
      (adf.content.length === 1 && adf.content[0].type === 'paragraph' && (!adf.content[0].content || adf.content[0].content.length === 0));
    return { adfStr, isEmpty };
  }, []);

  const debouncedSave = useDebouncedCallback((adfStr: string) => {
    if (adfStr !== lastSavedRef.current) {
      lastSavedRef.current = adfStr;
      onSave(adfStr);
    }
  }, 300);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      LinkExtension.configure({ openOnClick: false }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'adf-editor-content',
        style: [
          `min-height: ${minHeight}px`,
          'padding: 14px 16px',
          'outline: none',
          'font-size: 14px',
          'line-height: 1.6',
          'color: #172B4D',
          "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        ].join('; '),
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (autoSave && !isInitialMount.current) {
        const { adfStr, isEmpty } = emitAdf(ed);
        debouncedSave(isEmpty ? '' : adfStr);
      }
    },
    onBlur: ({ editor: ed }) => {
      if (autoSave) {
        const { adfStr, isEmpty } = emitAdf(ed);
        const value = isEmpty ? '' : adfStr;
        if (value !== lastSavedRef.current) {
          lastSavedRef.current = value;
          onSave(value);
        }
      }
    },
  });

  useEffect(() => {
    isInitialMount.current = false;
    return () => { editor?.destroy(); };
  }, []);

  if (!editor) return null;

  const handleSave = () => {
    const { adfStr, isEmpty } = emitAdf(editor);
    onSave(isEmpty ? '' : adfStr);
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const borderColor = autoSave ? '#DFE1E6' : '#4C9AFF';

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 6, background: '#FFFFFF', overflow: 'hidden' }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px',
        borderBottom: '1px solid #EBECF0', background: '#FAFBFC', minHeight: 36, flexWrap: 'wrap',
      }}>
        {/* Formatting marks */}
        <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
          <Bold size={15} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
          <Italic size={15} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
          <UnderlineIcon size={15} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough size={15} />
        </ToolbarBtn>

        <Sep />

        {/* Headings */}
        {!compact && (
          <>
            {([1, 2, 3, 4, 5, 6] as const).map((level) => (
              <HeadingBtn
                key={level}
                level={level}
                active={editor.isActive('heading', { level })}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              />
            ))}
            <Sep />
          </>
        )}

        {/* Lists */}
        <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List size={15} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list">
          <ListOrdered size={15} />
        </ToolbarBtn>

        <Sep />

        {/* Code + Link */}
        <ToolbarBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">
          <Code2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('link')} onClick={setLink} title="Link">
          <Link2 size={15} />
        </ToolbarBtn>

        <Sep />

        {/* Undo / Redo */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}>
          <Undo2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Shift+Z)" disabled={!editor.can().redo()}>
          <Redo2 size={15} />
        </ToolbarBtn>
      </div>

      {/* ── Editor content ── */}
      <EditorContent editor={editor} />

      {/* ── Footer ── */}
      {autoSave ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', borderTop: '1px solid #EBECF0', background: '#FAFBFC',
        }}>
          <span style={{ fontSize: 11, color: '#97A0AF' }}>
            Tip: <kbd style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              background: '#F4F5F7', border: '1px solid #DFE1E6', borderRadius: 3, padding: '1px 4px',
            }}>Ctrl+B</kbd> bold
          </span>
          <span style={{ fontSize: 11, color: '#97A0AF' }}>Auto-saved</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: '1px solid #EBECF0' }}>
          <button type="button" onClick={handleSave} style={{
            height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, fontWeight: 500,
            background: '#0052CC', color: '#FFFFFF', border: 'none', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0747A6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#0052CC'; }}
          >Save</button>
          <button type="button" onClick={onCancel} style={{
            height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, fontWeight: 500,
            background: 'transparent', color: '#42526E', border: 'none', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      )}
    </div>
  );
});
