import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { buildExtensions } from './extensions';
import { JiraToolbar } from './Toolbar';
import { uploadImageToSupabase } from './mediaUpload';
import './styles.css';

export interface JiraDescriptionEditorProps {
  value?: string | null;
  onChange?: (json: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  minHeight?: number;
}

// ── ADF mark name → Tiptap mark name ─────────────────────────────────────────
const ADF_MARK_MAP: Record<string, string> = {
  strong: 'bold',
  em: 'italic',
  strike: 'strike',
  underline: 'underline',
  code: 'code',
  link: 'link',
};

function convertAdfMark(mark: any): any {
  if (!mark) return mark;
  const name = ADF_MARK_MAP[mark.type] ?? mark.type;
  if (mark.type === 'subsup') {
    return { type: mark.attrs?.type === 'sub' ? 'subscript' : 'superscript' };
  }
  if (mark.type === 'textColor') {
    return { type: 'textStyle', attrs: { color: mark.attrs?.color ?? null } };
  }
  if (mark.type === 'link') {
    return { type: 'link', attrs: { href: mark.attrs?.href ?? mark.attrs?.url ?? '', target: mark.attrs?.target ?? null } };
  }
  if (mark.type === 'annotation') return null; // strip ADF annotations
  return { type: name, ...(mark.attrs ? { attrs: mark.attrs } : {}) };
}

function convertAdfNode(node: any): any {
  if (!node) return null;
  const marks = (node.marks as any[] | undefined)
    ?.map(convertAdfMark)
    .filter(Boolean);

  // Leaf types
  if (node.type === 'text') {
    return { type: 'text', text: node.text ?? '', ...(marks?.length ? { marks } : {}) };
  }
  if (node.type === 'hardBreak') return { type: 'hardBreak' };
  if (node.type === 'emoji') {
    return { type: 'text', text: node.attrs?.text ?? node.attrs?.shortName ?? '😊' };
  }
  if (node.type === 'mention') {
    return { type: 'text', text: `@${node.attrs?.text ?? node.attrs?.displayName ?? ''}` };
  }
  if (node.type === 'inlineCard') {
    const url = node.attrs?.url ?? '';
    return { type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] };
  }

  // Block containers
  const content = (node.content as any[] | undefined)?.map(convertAdfNode).filter(Boolean);

  if (node.type === 'doc') {
    return { type: 'doc', content: content ?? [] };
  }
  if (node.type === 'mediaSingle') {
    // Extract the nested media node
    const media = node.content?.find((c: any) => c.type === 'media');
    if (media) {
      const src = media.attrs?.url ?? media.attrs?.id ?? '';
      return src ? { type: 'image', attrs: { src, alt: media.attrs?.alt ?? '' } } : null;
    }
    return null;
  }
  if (node.type === 'media') {
    const src = node.attrs?.url ?? node.attrs?.id ?? '';
    return src ? { type: 'image', attrs: { src, alt: '' } } : null;
  }
  if (node.type === 'rule') return { type: 'horizontalRule' };
  if (node.type === 'taskItem') {
    return {
      type: 'taskItem',
      attrs: { checked: node.attrs?.state === 'DONE' },
      content: content ?? [],
    };
  }
  if (node.type === 'tableHeader') {
    return { type: 'tableHeader', attrs: node.attrs ?? {}, content: content ?? [] };
  }
  if (node.type === 'tableCell') {
    return { type: 'tableCell', attrs: node.attrs ?? {}, content: content ?? [] };
  }
  if (node.type === 'listItem') {
    // Strip ADF listItem attrs (checked etc) — Tiptap uses taskItem separately
    return { type: 'listItem', content: content ?? [] };
  }
  // Pass through with converted content
  const out: any = { type: node.type, content: content ?? [] };
  if (node.attrs && Object.keys(node.attrs).length) out.attrs = node.attrs;
  if (marks?.length) out.marks = marks;
  return out;
}

function parseContent(raw: string | null | undefined) {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      // ADF has `version: 1`; Tiptap doc does not — convert if needed
      if (parsed.version === 1) {
        return convertAdfNode(parsed);
      }
      return parsed; // already Tiptap JSON
    }
  } catch {
    // legacy plain text — wrap in paragraph
  }
  if (raw.trim()) return `<p>${raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
  return '';
}

export function JiraDescriptionEditor({
  value,
  onChange,
  placeholder = 'Add a description…',
  readOnly = false,
  autoFocus = false,
  minHeight = 120,
}: JiraDescriptionEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const url = await uploadImageToSupabase(file);
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch {
      // silently skip on upload failure
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor({
    extensions: buildExtensions(placeholder, handleImageUpload),
    content: parseContent(value),
    editable: !readOnly,
    autofocus: autoFocus,
    onUpdate({ editor }) {
      onChangeRef.current?.(JSON.stringify(editor.getJSON()));
    },
  });

  // Sync external value changes (e.g. when storyId changes)
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (!editor || value === prevValueRef.current) return;
    prevValueRef.current = value;
    const parsed = parseContent(value);
    editor.commands.setContent(parsed, false);
  }, [editor, value]);

  // Update editable state
  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Pre-mount skeleton — avoids cold-start lag on first click.
  // The editor initialises in the background; skeleton shown only until ready.
  if (!editor) {
    return (
      <div className="jde-root" data-readonly={readOnly} style={{ minHeight }}>
        <div className="jde-content" style={{ minHeight, display: 'flex', alignItems: 'center', padding: '8px 12px' }}>
          <span style={{ color: '#A5ADBA', fontSize: 14, fontStyle: 'italic' }}>
            {placeholder}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="jde-root" data-readonly={readOnly}>
      {!readOnly && <JiraToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="jde-content"
        style={{ minHeight }}
      />
    </div>
  );
}
