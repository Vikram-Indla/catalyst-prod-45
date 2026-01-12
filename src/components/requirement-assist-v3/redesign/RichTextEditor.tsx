// ============================================================
// RICH TEXT EDITOR WITH IMAGE PASTE SUPPORT
// Enterprise-grade editor using TipTap
// ============================================================

import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, List, ListOrdered, Undo, Redo, 
  Image as ImageIcon, X, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Describe your system requirements in detail. You can paste images directly...',
  maxLength = 3000
}: RichTextEditorProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(true);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImages(prev => [...prev, base64]);
      setIsSaved(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html, text);
      setIsSaved(false);
      
      // Simulate auto-save
      setTimeout(() => setIsSaved(true), 1000);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[280px] p-5 text-sm leading-relaxed',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                handleImageUpload(file);
              }
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files?.length) {
          for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              handleImageUpload(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setIsSaved(false);
  };

  const textLength = editor?.getText().length || 0;
  const wordCount = editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 px-3 flex items-center gap-1 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor}
        >
          <Bold className={cn(
            "w-3.5 h-3.5",
            editor?.isActive('bold') ? 'text-blue-600' : 'text-slate-500'
          )} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor}
        >
          <Italic className={cn(
            "w-3.5 h-3.5",
            editor?.isActive('italic') ? 'text-blue-600' : 'text-slate-500'
          )} />
        </Button>
        
        <div className="w-px h-4 bg-slate-200 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={!editor}
        >
          <List className={cn(
            "w-3.5 h-3.5",
            editor?.isActive('bulletList') ? 'text-blue-600' : 'text-slate-500'
          )} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={!editor}
        >
          <ListOrdered className={cn(
            "w-3.5 h-3.5",
            editor?.isActive('orderedList') ? 'text-blue-600' : 'text-slate-500'
          )} />
        </Button>
        
        <div className="w-px h-4 bg-slate-200 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
        >
          <Undo className="w-3.5 h-3.5 text-slate-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
        >
          <Redo className="w-3.5 h-3.5 text-slate-500" />
        </Button>

        <div className="flex-1" />

        {/* Auto-save indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            isSaved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
          )} />
          <span>{isSaved ? 'Auto-saved' : 'Saving...'}</span>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent 
          editor={editor} 
          className="h-full [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
        />
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2 flex-shrink-0 bg-slate-50/50">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img 
                src={img} 
                alt={`Attachment ${i + 1}`}
                className="h-16 w-auto rounded-lg border border-slate-200 object-cover shadow-sm"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="h-16 w-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
            <ImageIcon className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="h-11 px-4 flex items-center justify-between border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-slate-700">
            {wordCount} <span className="font-normal text-slate-400">words</span>
          </span>
          <span className="text-slate-200">|</span>
          <span className="text-slate-500">
            {textLength.toLocaleString()} <span className="text-slate-400">/ {maxLength.toLocaleString()}</span>
          </span>
          {images.length > 0 && (
            <>
              <span className="text-slate-200">|</span>
              <span className="text-slate-500">
                {images.length} <span className="text-slate-400">images</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RichTextEditor;
