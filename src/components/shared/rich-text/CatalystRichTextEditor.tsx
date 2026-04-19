/**
 * CatalystRichTextEditor — Canonical ADF-powered rich text editor for Catalyst.
 * Used for ALL description and comment fields across every work item type.
 *
 * Features:
 *   - Full TipTap toolbar (Bold, Italic, Underline, Strike, H1-H6, Lists, Code, Link, Image)
 *   - Image management popover (Add link, Alt text, Resize, Copy, Delete)
 *   - Image paste/drop with Supabase upload
 *   - ADF JSON output (Atlassian Document Format)
 *   - Modes: "save" (Save/Cancel), "autosave" (debounced), "comment" (compact)
 *   - Optional AI Improve button
 *   - @mention support (comment mode)
 *   - Drag handles for block reordering
 */
import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  List, ListOrdered, Code2, Link2, Image as ImageIcon,
  Undo2, Redo2, Sparkles, Loader2, MoreHorizontal,
} from 'lucide-react';
import { tiptapJsonToAdf, resolveEditorContent } from './adf-utils';
import { supabase } from '@/integrations/supabase/client';
import { ImageBubbleMenu } from './ImageBubbleMenu';

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

export interface CatalystRichTextEditorProps {
  /** Raw content from DB — ADF JSON string or legacy HTML */
  content: string;
  /** Called with ADF JSON string on save */
  onSave: (adfJson: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  minHeight?: number;
  /** "save" = Save/Cancel buttons, "autosave" = debounced, "comment" = compact comment mode */
  mode?: 'save' | 'autosave' | 'comment';
  /** Hide heading buttons in compact mode */
  compact?: boolean;
  /** AI Improve callback */
  onAiImprove?: () => Promise<string | null>;
  aiLabel?: string;
  /** Work item ID for image upload path */
  workItemId?: string;
  /** Storage sub-folder: "description-images" | "comment-images" */
  storagePath?: string;
  /** Whether the editor is submitting (disables Save in comment mode) */
  isSubmitting?: boolean;
}

/* ═══════════════════════════════════════════════════════════
   Custom Image Extension with extra attributes
   ═══════════════════════════════════════════════════════════ */

const CatalystImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '100%', renderHTML: (attrs) => attrs.width ? { style: `max-width: ${attrs.width}; width: ${attrs.width};` } : {} },
      'data-link': { default: null, renderHTML: (attrs) => attrs['data-link'] ? { 'data-link': attrs['data-link'] } : {} },
    };
  },
});

/* ═══════════════════════════════════════════════════════════
   Drag Handle Extension
   ═══════════════════════════════════════════════════════════ */

const DRAG_SVG = '<svg viewBox="-8 -8 32 32" width="24" height="24" fill="currentColor"><path d="M7 2.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0m5.5 0a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0M7 8a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 7 8m5.5 0A1.75 1.75 0 1 1 9 8a1.75 1.75 0 0 1 3.5 0M7 13.25a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0m5.5 0a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0"/></svg>';

const DragHandleExtension = Extension.create({
  name: 'catalystDragHandle',
  addProseMirrorPlugins() {
    let handle: HTMLButtonElement | null = null;
    let currentNodePos: number | null = null;
    let draggedSlice: { pos: number; size: number } | null = null;

    return [
      new Plugin({
        key: new PluginKey('catalystDragHandle'),
        view(editorView) {
          handle = document.createElement('button');
          handle.type = 'button';
          handle.className = 'catalyst-drag-handle';
          handle.setAttribute('aria-label', 'Drag to reorder');
          handle.setAttribute('draggable', 'true');
          handle.contentEditable = 'false';
          Object.assign(handle.style, {
            position: 'absolute', width: '12px', height: '24px', padding: '2px 0',
            display: 'none', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            border: 'none', background: 'transparent', borderRadius: '4px',
            cursor: 'grab', color: 'rgb(41, 42, 46)', zIndex: '100',
            transition: 'background 0.15s ease, opacity 0.15s ease', boxSizing: 'border-box',
            opacity: '0', pointerEvents: 'auto',
          });
          handle.innerHTML = DRAG_SVG;
          handle.addEventListener('mouseenter', () => { handle!.style.background = 'rgba(5,21,36,0.06)'; });
          handle.addEventListener('mouseleave', () => { handle!.style.background = 'transparent'; });

          const wrapper = editorView.dom.parentElement;
          if (wrapper) { wrapper.style.position = 'relative'; wrapper.style.overflow = 'visible'; }
          wrapper?.appendChild(handle);

          const showHandle = (blockDom: HTMLElement, pos: number) => {
            if (!handle) return;
            currentNodePos = pos;
            const parentRect = editorView.dom.parentElement!.getBoundingClientRect();
            const blockRect = blockDom.getBoundingClientRect();
            handle.style.display = 'flex';
            handle.style.opacity = '1';
            handle.style.left = `${blockRect.left - parentRect.left - 20}px`;
            handle.style.top = `${blockRect.top - parentRect.top + (blockRect.height / 2) - 12}px`;
          };

          const hideHandle = () => {
            if (!handle) return;
            handle.style.opacity = '0';
            setTimeout(() => { if (handle && handle.style.opacity === '0') handle.style.display = 'none'; }, 150);
          };

          const handleMouseMove = (e: MouseEvent) => {
            const pos = editorView.posAtCoords({ left: e.clientX, top: e.clientY });
            if (!pos) { hideHandle(); return; }
            try {
              const resolved = editorView.state.doc.resolve(pos.pos);
              const nodePos = resolved.before(1);
              const node = editorView.state.doc.nodeAt(nodePos);
              if (!node) { hideHandle(); return; }
              const dom = editorView.nodeDOM(nodePos);
              if (dom && dom instanceof HTMLElement) showHandle(dom, nodePos);
            } catch { hideHandle(); }
          };

          const handleMouseLeave = (e: MouseEvent) => {
            const related = e.relatedTarget as HTMLElement | null;
            if (related && handle?.contains(related)) return;
            hideHandle();
          };

          handle.addEventListener('dragstart', (e) => {
            if (currentNodePos === null) return;
            const node = editorView.state.doc.nodeAt(currentNodePos);
            if (!node) return;
            draggedSlice = { pos: currentNodePos, size: node.nodeSize };
            e.dataTransfer?.setData('text/plain', '');
            e.dataTransfer!.effectAllowed = 'move';
          });
          handle.addEventListener('dragend', () => { draggedSlice = null; });

          editorView.dom.addEventListener('mousemove', handleMouseMove);
          editorView.dom.addEventListener('mouseleave', handleMouseLeave);
          handle.addEventListener('mouseleave', (e) => {
            const related = e.relatedTarget as HTMLElement | null;
            if (related && editorView.dom.contains(related)) return;
            hideHandle();
          });

          editorView.dom.addEventListener('drop', (e) => {
            if (!draggedSlice) return;
            const dropPos = editorView.posAtCoords({ left: e.clientX, top: e.clientY });
            if (!dropPos) return;
            e.preventDefault();
            const { state, dispatch } = editorView;
            const { pos: fromPos, size } = draggedSlice;
            const node = state.doc.nodeAt(fromPos);
            if (!node) return;
            const tr = state.tr;
            const resolvedDrop = tr.doc.resolve(dropPos.pos);
            const insertPos = resolvedDrop.before(1);
            tr.delete(fromPos, fromPos + size);
            const adjustedPos = insertPos > fromPos ? insertPos - size : insertPos;
            tr.insert(Math.max(0, adjustedPos), node);
            dispatch(tr);
            draggedSlice = null;
          });

          return {
            destroy() {
              editorView.dom.removeEventListener('mousemove', handleMouseMove);
              editorView.dom.removeEventListener('mouseleave', handleMouseLeave);
              handle?.remove();
              handle = null;
            },
          };
        },
      }),
    ];
  },
});

/* ═══════════════════════════════════════════════════════════
   Debounce hook
   ═══════════════════════════════════════════════════════════ */

function useDebouncedCallback(fn: (...args: any[]) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return useCallback((...args: any[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delay);
  }, [delay]);
}

/* ═══════════════════════════════════════════════════════════
   Toolbar button primitives
   ═══════════════════════════════════════════════════════════ */

const ToolbarBtn = React.memo(function ToolbarBtn({
  active, onClick, title, children, disabled,
}: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} title={title} disabled={disabled}
      style={{
        width: 28, height: 28, borderRadius: 4, border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? '#DEEBFF' : 'transparent',
        color: active ? '#0747A6' : disabled ? '#C1C7D0' : '#42526E',
        padding: 0, transition: 'background 0.12s, color 0.12s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = '#F4F5F7'; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
});

function Sep() {
  return <div style={{ width: 1, height: 18, background: '#DFE1E6', margin: '0 4px', flexShrink: 0 }} />;
}

/* ═══════════════════════════════════════════════════════════
   Main Editor Component
   ═══════════════════════════════════════════════════════════ */

export const CatalystRichTextEditor = React.memo(function CatalystRichTextEditor({
  content, onSave, onCancel, placeholder = 'Start typing...',
  minHeight = 200, mode = 'save', compact = false,
  onAiImprove, aiLabel = 'Improve description', workItemId,
  storagePath = 'description-images', isSubmitting = false,
}: CatalystRichTextEditorProps) {
  const lastSavedRef = useRef(content);
  const isInitialMount = useRef(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [preAiContent, setPreAiContent] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Image bubble menu state
  const [bubbleMenuPos, setBubbleMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [bubbleMenuVisible, setBubbleMenuVisible] = useState(false);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const isComment = mode === 'comment';
  const effectiveMinHeight = isComment ? 80 : minHeight;

  /* ── Image upload ─────────────────────────────────────── */
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (file.size > 10 * 1024 * 1024) return null;
    const ext = file.name?.split('.').pop() || 'png';
    const folder = workItemId || 'general';
    const path = `${storagePath}/${folder}/${Date.now()}.${ext}`;
    setImageUploading(true);
    try {
      const { error } = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type });
      if (error) { console.error('Image upload error:', error); return null; }
      const { data } = supabase.storage.from('attachments').getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setImageUploading(false);
    }
  }, [workItemId, storagePath]);

  const uploadImageRef = useRef(uploadImage);
  uploadImageRef.current = uploadImage;

  /* ── Resolve initial content ─────────────────────────── */
  const initialContent = useMemo(() => resolveEditorContent(content), [content]);

  /* ── ADF emission ────────────────────────────────────── */
  const emitAdf = useCallback((ed: any) => {
    const json = ed.getJSON();
    const adf = tiptapJsonToAdf(json);
    const adfStr = JSON.stringify(adf);
    const isEmpty = !adf.content || adf.content.length === 0 ||
      (adf.content.length === 1 && adf.content[0].type === 'paragraph' &&
       (!adf.content[0].content || adf.content[0].content.length === 0));
    return { adfStr, isEmpty };
  }, []);

  const debouncedSave = useDebouncedCallback((adfStr: string) => {
    if (adfStr !== lastSavedRef.current) {
      lastSavedRef.current = adfStr;
      onSave(adfStr);
    }
  }, 300);

  /* ── Image paste/drop plugin ─────────────────────────── */
  const ImagePasteDropPlugin = useMemo(() => Extension.create({
    name: 'catalystImagePasteDrop',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('catalystImagePasteDrop'),
          props: {
            handlePaste(view, event) {
              const items = Array.from(event.clipboardData?.items ?? []);
              const imageItem = items.find(i => i.type.startsWith('image/'));
              if (imageItem) {
                event.preventDefault();
                const file = imageItem.getAsFile();
                if (file) {
                  uploadImageRef.current(file).then(url => {
                    if (url) {
                      const node = view.state.schema.nodes.image?.create({ src: url, alt: file.name || 'image' });
                      if (node) view.dispatch(view.state.tr.replaceSelectionWith(node));
                    }
                  });
                }
                return true;
              }
              return false;
            },
            handleDrop(view, event) {
              const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
              if (files.length > 0) {
                event.preventDefault();
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                files.forEach(file => {
                  uploadImageRef.current(file).then(url => {
                    if (url) {
                      const node = view.state.schema.nodes.image?.create({ src: url, alt: file.name || 'image' });
                      if (node) {
                        const insertPos = pos?.pos ?? view.state.selection.from;
                        view.dispatch(view.state.tr.insert(insertPos, node));
                      }
                    }
                  });
                });
                return true;
              }
              return false;
            },
          },
        }),
      ];
    },
  }), []);

  /* ── TipTap editor instance ──────────────────────────── */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      LinkExtension.configure({ openOnClick: false }),
      Underline,
      CatalystImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          style: 'max-width: 100%; border-radius: 4px; margin: 8px 0; display: block; cursor: pointer;',
        },
      }),
      ImagePasteDropPlugin,
      ...(isComment ? [] : [
        Table.configure({ resizable: false }),
        TableRow, TableCell, TableHeader,
        DragHandleExtension,
      ]),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'catalyst-rte-content',
        style: [
          `min-height: ${effectiveMinHeight}px`,
          'padding: 14px 16px',
          'outline: none',
          'font-size: 14px',
          'line-height: 1.6',
          'color: #172B4D',
          "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        ].join('; '),
      },
      handleClickOn: (view, pos, node, nodePos, event) => {
        if (node.type.name === 'image') {
          // Show bubble menu on image click
          const dom = view.nodeDOM(nodePos) as HTMLElement | null;
          if (dom && editorWrapperRef.current) {
            const wrapperRect = editorWrapperRef.current.getBoundingClientRect();
            const imgRect = dom.getBoundingClientRect();
            setBubbleMenuPos({
              top: imgRect.bottom - wrapperRect.top + 8,
              left: imgRect.right - wrapperRect.left - 200,
            });
            setBubbleMenuVisible(true);
          }
          return true;
        }
        // Close bubble menu on non-image click
        setBubbleMenuVisible(false);
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (mode === 'autosave' && !isInitialMount.current && !aiMode) {
        const { adfStr, isEmpty } = emitAdf(ed);
        debouncedSave(isEmpty ? '' : adfStr);
      }
    },
    onBlur: ({ editor: ed }) => {
      if (mode === 'autosave' && !aiMode) {
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

  /* ── AI Improve ──────────────────────────────────────── */
  const handleAiImprove = useCallback(async () => {
    if (!onAiImprove || !editor || aiGenerating) return;
    setPreAiContent(editor.getHTML());
    setAiGenerating(true);
    try {
      const result = await onAiImprove();
      if (result && editor) { editor.commands.setContent(result); setAiMode(true); }
    } catch { /* parent handles */ } finally { setAiGenerating(false); }
  }, [onAiImprove, editor, aiGenerating]);

  const handleAiSave = useCallback(() => {
    if (!editor) return;
    const { adfStr, isEmpty } = emitAdf(editor);
    lastSavedRef.current = isEmpty ? '' : adfStr;
    onSave(isEmpty ? '' : adfStr);
    setAiMode(false);
    setPreAiContent('');
  }, [editor, emitAdf, onSave]);

  const handleAiCancel = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent(preAiContent);
    setAiMode(false);
    setPreAiContent('');
  }, [editor, preAiContent]);

  if (!editor) return null;

  /* ── Action handlers ─────────────────────────────────── */
  const handleSave = () => {
    const { adfStr, isEmpty } = emitAdf(editor);
    onSave(isEmpty ? '' : adfStr);
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); }
    else { editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(); }
  };

  const handleInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const url = await uploadImage(file);
        if (url) editor.chain().focus().setImage({ src: url, alt: file.name || 'image' }).run();
      }
    };
    input.click();
  };

  const borderColor = aiMode ? '#2563EB' : (mode === 'autosave' ? '#DFE1E6' : '#4C9AFF');

  /* ═══════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════ */
  return (
    <div
      ref={editorWrapperRef}
      style={{
        border: `1.5px solid ${borderColor}`, borderRadius: 6,
        background: '#FFFFFF', overflow: 'hidden',
        transition: 'border-color 0.2s', position: 'relative',
      }}
    >
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px',
        borderBottom: '1px solid #EBECF0', background: '#FAFBFC',
        minHeight: 36, flexWrap: 'wrap',
      }}>
        {/* AI Improve */}
        {onAiImprove && (
          <>
            <button type="button" onClick={handleAiImprove} disabled={aiGenerating}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                height: 28, padding: '0 10px', borderRadius: 4, border: 'none',
                background: aiGenerating ? '#EFF6FF' : 'transparent',
                color: aiGenerating ? '#93C5FD' : '#5E6C84',
                cursor: aiGenerating ? 'wait' : 'pointer',
                fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { if (!aiGenerating) { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; } }}
              onMouseLeave={e => { if (!aiGenerating) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5E6C84'; } }}
              title={aiLabel}
            >
              {aiGenerating ? <Loader2 size={13} style={{ animation: 'sdm-spin 1s linear infinite' }} /> : <Sparkles size={13} />}
              <span>{aiGenerating ? 'Improving...' : aiLabel}</span>
            </button>
            <Sep />
          </>
        )}

        {/* Formatting */}
        <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><Bold size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><Italic size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><UnderlineIcon size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough size={15} /></ToolbarBtn>
        <Sep />

        {/* Headings (hidden in compact/comment mode) */}
        {!compact && !isComment && (
          <>
            {([1, 2, 3] as const).map(level => (
              <ToolbarBtn key={level} active={editor.isActive('heading', { level })} onClick={() => editor.chain().focus().toggleHeading({ level }).run()} title={`Heading ${level}`}>
                {level === 1 ? <Heading1 size={15} /> : level === 2 ? <Heading2 size={15} /> : <Heading3 size={15} />}
              </ToolbarBtn>
            ))}
            <Sep />
          </>
        )}

        {/* Lists */}
        <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List size={15} /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list"><ListOrdered size={15} /></ToolbarBtn>
        <Sep />

        {/* Code, Link, Image */}
        {!isComment && (
          <ToolbarBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block"><Code2 size={15} /></ToolbarBtn>
        )}
        <ToolbarBtn active={editor.isActive('link')} onClick={setLink} title="Link"><Link2 size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={handleInsertImage} title="Insert image" disabled={imageUploading}><ImageIcon size={15} /></ToolbarBtn>
        <Sep />

        {/* Undo / Redo */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}><Undo2 size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Shift+Z)" disabled={!editor.can().redo()}><Redo2 size={15} /></ToolbarBtn>

        {imageUploading && (
          <span style={{ fontSize: 11, color: '#6B778C', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Loader2 size={12} style={{ animation: 'sdm-spin 1s linear infinite' }} /> Uploading...
          </span>
        )}
      </div>

      {/* ── Editor content ── */}
      {aiGenerating ? (
        <div style={{ minHeight: effectiveMinHeight, padding: '14px 16px', background: '#FAFBFC' }}>
          {[100, 90, 75, 60, 85, 50].map((w, i) => (
            <div key={i} style={{
              height: 14, marginBottom: 10, borderRadius: 4, width: `${w}%`,
              background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
              backgroundSize: '200% 100%', animation: 'sdm-shimmer 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

      {/* ── Image bubble menu ── */}
      <ImageBubbleMenu
        editor={editor}
        position={bubbleMenuPos}
        visible={bubbleMenuVisible}
        onClose={() => setBubbleMenuVisible(false)}
      />

      {/* ── Footer ── */}
      {aiMode ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          borderTop: '1px solid #BFDBFE', background: '#EFF6FF',
        }}>
          <Sparkles size={12} style={{ color: '#2563EB', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#1E40AF', fontWeight: 500, flex: 1 }}>AI-generated content — review and save or cancel</span>
          <button type="button" onClick={handleAiSave} style={{
            height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, fontWeight: 500,
            background: '#0052CC', color: '#FFFFFF', border: 'none', cursor: 'pointer',
          }}>Save</button>
          <button type="button" onClick={handleAiCancel} style={{
            height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, fontWeight: 500,
            background: 'transparent', color: '#42526E', border: 'none', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      ) : mode === 'autosave' ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', borderTop: '1px solid #EBECF0', background: '#FAFBFC',
        }}>
          <span style={{ fontSize: 11, color: '#97A0AF' }}>
            Tip: <kbd style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: '#F4F5F7', border: '1px solid #DFE1E6', borderRadius: 3, padding: '1px 4px' }}>Ctrl+B</kbd> bold
          </span>
          <span style={{ fontSize: 11, color: '#97A0AF' }}>Auto-saved</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: '1px solid #EBECF0' }}>
          <button type="button" onClick={handleSave} disabled={isComment && isSubmitting}
            style={{
              height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, fontWeight: 500,
              background: (isComment && isSubmitting) ? '#F4F5F7' : '#0052CC',
              color: (isComment && isSubmitting) ? '#A5ADBA' : '#FFFFFF',
              border: 'none', cursor: (isComment && isSubmitting) ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!(isComment && isSubmitting)) e.currentTarget.style.background = '#0747A6'; }}
            onMouseLeave={e => { if (!(isComment && isSubmitting)) e.currentTarget.style.background = '#0052CC'; }}
          >Save</button>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{
              height: 32, padding: '0 16px', borderRadius: 3, fontSize: 14, fontWeight: 500,
              background: 'transparent', color: '#42526E', border: 'none', cursor: 'pointer',
            }}>Cancel</button>
          )}
        </div>
      )}
    </div>
  );
});
