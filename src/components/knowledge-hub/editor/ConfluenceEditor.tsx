import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorToolbar } from './EditorToolbar';
import { InfoPanelExtension, WarningPanelExtension, NotePanelExtension, ExpandExtension } from './MacroExtensions';

interface ConfluenceEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
}

export function ConfluenceEditor({ 
  content, 
  onChange, 
  editable = true,
  placeholder = 'Start writing...'
}: ConfluenceEditorProps) {
  // Parse content - can be JSON string, HTML string, or TipTap JSON object
  const parseContent = (c: string) => {
    if (!c) return '';
    try {
      // Try to parse as JSON first (TipTap format)
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
        return parsed;
      }
    } catch {
      // Not JSON, treat as HTML
    }
    return c;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-gold hover:underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-md',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse w-full',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-border p-2 bg-muted font-semibold',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    Underline,
      InfoPanelExtension,
      WarningPanelExtension,
      NotePanelExtension,
      ExpandExtension,
    ],
    content: parseContent(content),
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {editable && editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="confluence-editor" />
      <style>{`
        .confluence-editor .ProseMirror {
          min-height: 300px;
          padding: 1rem;
        }
        .confluence-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .confluence-editor .ProseMirror h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
        .confluence-editor .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; }
        .confluence-editor .ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin: 1em 0; }
        .confluence-editor .ProseMirror ul, .confluence-editor .ProseMirror ol { padding-left: 1.5em; }
        .confluence-editor .ProseMirror blockquote { 
          border-left: 3px solid hsl(var(--brand-gold)); 
          padding-left: 1em; 
          margin-left: 0;
          color: hsl(var(--muted-foreground));
        }
        .confluence-editor .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
        }
        .confluence-editor .ProseMirror pre {
          background: hsl(var(--muted));
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
        }
        .confluence-editor .ProseMirror pre code {
          background: none;
          padding: 0;
        }
        .confluence-editor .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .confluence-editor .ProseMirror td, .confluence-editor .ProseMirror th {
          border: 1px solid hsl(var(--border));
          padding: 0.5em;
        }
        .confluence-editor .ProseMirror th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .confluence-editor .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .confluence-editor .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5em;
        }
        .confluence-editor .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
        }
        .confluence-editor .info-panel {
          background: hsl(210 100% 95%);
          border-left: 4px solid hsl(210 100% 50%);
          padding: 1em;
          margin: 1em 0;
          border-radius: 0 4px 4px 0;
        }
        .confluence-editor .warning-panel {
          background: hsl(45 100% 95%);
          border-left: 4px solid hsl(45 100% 50%);
          padding: 1em;
          margin: 1em 0;
          border-radius: 0 4px 4px 0;
        }
        .confluence-editor .note-panel {
          background: hsl(280 100% 95%);
          border-left: 4px solid hsl(280 100% 50%);
          padding: 1em;
          margin: 1em 0;
          border-radius: 0 4px 4px 0;
        }
        .confluence-editor .expand-panel {
          border: 1px solid hsl(var(--border));
          border-radius: 4px;
          margin: 1em 0;
        }
        .confluence-editor .expand-panel summary {
          padding: 0.75em 1em;
          cursor: pointer;
          background: hsl(var(--muted));
          font-weight: 500;
        }
        .confluence-editor .expand-panel[open] summary {
          border-bottom: 1px solid hsl(var(--border));
        }
        .confluence-editor .expand-panel .expand-content {
          padding: 1em;
        }
      `}</style>
    </div>
  );
}

export { Editor };
