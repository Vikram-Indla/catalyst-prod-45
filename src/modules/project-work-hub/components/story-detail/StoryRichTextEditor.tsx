/**
 * StoryRichTextEditor — TipTap rich text editor for story description & comments
 * Toolbar: Bold, Italic, Headings, Lists, Code, Link, Undo, Redo
 */
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Code2, Link2, Undo2, Redo2,
} from 'lucide-react';

interface StoryRichTextEditorProps {
  content: string;
  onSave: (html: string) => void;
  onCancel: () => void;
  placeholder?: string;
  minHeight?: number;
  compact?: boolean; // smaller toolbar for comments
}

const TB_BTN: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: '#505258', padding: 0,
};

const TB_BTN_ACTIVE: React.CSSProperties = {
  ...TB_BTN, background: '#DEEBFF', color: '#0747A6',
};

export function StoryRichTextEditor({
  content, onSave, onCancel, placeholder = 'Start typing...', minHeight = 200, compact = false,
}: StoryRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}px; padding: 16px; outline: none; font-size: 14px; line-height: 1.6; color: #292A2E; font-family: Inter, sans-serif;`,
      },
    },
  });

  useEffect(() => {
    return () => { editor?.destroy(); };
  }, []);

  if (!editor) return null;

  const handleSave = () => {
    const html = editor.getHTML();
    onSave(html === '<p></p>' ? '' : html);
  };

  return (
    <div style={{ border: '2px solid #1868DB', borderRadius: 6, background: '#FFFFFF' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px',
        borderBottom: '1px solid #E0E0E0', height: 36, flexWrap: 'wrap',
      }}>
        <button
          style={editor.isActive('bold') ? TB_BTN_ACTIVE : TB_BTN}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        ><Bold size={15} /></button>
        <button
          style={editor.isActive('italic') ? TB_BTN_ACTIVE : TB_BTN}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        ><Italic size={15} /></button>

        {!compact && (
          <>
            <div style={{ width: 1, height: 18, background: '#E0E0E0', margin: '0 4px' }} />
            <button
              style={editor.isActive('heading', { level: 1 }) ? TB_BTN_ACTIVE : TB_BTN}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
            ><Heading1 size={15} /></button>
            <button
              style={editor.isActive('heading', { level: 2 }) ? TB_BTN_ACTIVE : TB_BTN}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
            ><Heading2 size={15} /></button>
            <button
              style={editor.isActive('heading', { level: 3 }) ? TB_BTN_ACTIVE : TB_BTN}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
            ><Heading3 size={15} /></button>
          </>
        )}

        <div style={{ width: 1, height: 18, background: '#E0E0E0', margin: '0 4px' }} />
        <button
          style={editor.isActive('bulletList') ? TB_BTN_ACTIVE : TB_BTN}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        ><List size={15} /></button>
        <button
          style={editor.isActive('orderedList') ? TB_BTN_ACTIVE : TB_BTN}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        ><ListOrdered size={15} /></button>

        <div style={{ width: 1, height: 18, background: '#E0E0E0', margin: '0 4px' }} />
        <button
          style={editor.isActive('codeBlock') ? TB_BTN_ACTIVE : TB_BTN}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        ><Code2 size={15} /></button>
        <button
          style={TB_BTN}
          onClick={() => {
            const url = window.prompt('Enter URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          title="Link"
        ><Link2 size={15} /></button>

        {!compact && (
          <>
            <div style={{ width: 1, height: 18, background: '#E0E0E0', margin: '0 4px' }} />
            <button
              style={TB_BTN}
              onClick={() => editor.chain().focus().undo().run()}
              title="Undo"
            ><Undo2 size={15} /></button>
            <button
              style={TB_BTN}
              onClick={() => editor.chain().focus().redo().run()}
              title="Redo"
            ><Redo2 size={15} /></button>
          </>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: '1px solid #E0E0E0' }}>
        <button
          onClick={handleSave}
          style={{
            height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, fontWeight: 500,
            background: '#1868DB', color: '#FFFFFF', border: 'none', cursor: 'pointer',
          }}
        >Save</button>
        <button
          onClick={onCancel}
          style={{
            height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, fontWeight: 500,
            background: 'transparent', color: '#505258', border: 'none', cursor: 'pointer',
          }}
        >Cancel</button>
      </div>
    </div>
  );
}
