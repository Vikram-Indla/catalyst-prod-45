import { useRef, useState, useCallback, useEffect } from 'react';
import TextBoldIcon from '@atlaskit/icon/core/text-bold';
import TextItalicIcon from '@atlaskit/icon/core/text-italic';
import TextUnderlineIcon from '@atlaskit/icon/core/text-underline';
import ListBulletedIcon from '@atlaskit/icon/core/list-bulleted';
import ImageIcon from '@atlaskit/icon/core/image';
import LinkIcon from '@atlaskit/icon/core/link';
import UndoIcon from '@atlaskit/icon/core/undo';
import RedoIcon from '@atlaskit/icon/core/redo';
import { supabase } from '@/integrations/supabase/client';

interface RichTextCommentEditorProps {
  onSubmit: (html: string) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  placeholder?: string;
  initialValue?: string;
  /** Team members for @mention */
  teamMembers?: Array<{ id: string; full_name: string; avatar_url?: string | null }>;
  workItemId: string;
}

export function RichTextCommentEditor({
  onSubmit, onCancel, isSubmitting, placeholder = 'Add a comment…',
  initialValue = '', teamMembers = [], workItemId,
}: RichTextCommentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [uploading, setUploading] = useState(false);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  useEffect(() => {
    if (initialValue && editorRef.current) {
      editorRef.current.innerHTML = initialValue;
      checkEmpty();
    }
  }, []);

  const checkEmpty = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText.trim();
    setIsEmpty(text.length === 0 && !editorRef.current.querySelector('img'));
  };

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    checkEmpty();
  };

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (file.size > 10 * 1024 * 1024) return null;
    const ext = file.name?.split('.').pop() || 'png';
    const path = `comment-images/${workItemId}/${Date.now()}.${ext}`;
    setUploading(true);
    try {
      const { error } = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type });
      if (error) { console.error('Upload error:', error); return null; }
      const { data } = supabase.storage.from('attachments').getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  }, [workItemId]);

  const insertImage = useCallback(async (file: File) => {
    const url = await uploadImage(file);
    if (!url || !editorRef.current) return;
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width:100%;border-radius:4px;margin:8px 0;display:block;';
    img.setAttribute('data-comment-image', 'true');

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }
    checkEmpty();
  }, [uploadImage]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(i => i.type.startsWith('image/'));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) await insertImage(file);
      return;
    }
    // Allow normal text paste but strip complex HTML
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, [insertImage]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files) await insertImage(file);
  }, [insertImage]);

  // @mention detection
  const handleInput = useCallback(() => {
    checkEmpty();
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setMentionQuery(null); return; }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) { setMentionQuery(null); return; }
    const text = node.textContent ?? '';
    const offset = range.startOffset;
    const beforeCursor = text.slice(0, offset);
    const atMatch = beforeCursor.match(/@([a-zA-Z0-9 ]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setMentionIndex(0);
      // Position
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setMentionPos({ top: rect.bottom - editorRect.top + 4, left: rect.left - editorRect.left });
    } else {
      setMentionQuery(null);
    }
  }, []);

  const filteredMembers = mentionQuery !== null
    ? teamMembers.filter(m => m.full_name?.toLowerCase().includes(mentionQuery))
    : [];

  const insertMention = useCallback((member: { id: string; full_name: string }) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent ?? '';
    const offset = range.startOffset;
    const beforeCursor = text.slice(0, offset);
    const atIdx = beforeCursor.lastIndexOf('@');
    if (atIdx === -1) return;

    // Replace @query with chip
    const before = text.slice(0, atIdx);
    const after = text.slice(offset);
    node.textContent = before;

    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.setAttribute('data-mention-id', member.id);
    chip.style.cssText = 'background:#DEEBFF;color:#0747A6;padding:2px 6px;border-radius:3px;font-weight:500;font-size:13px;cursor:default;display:inline;';
    chip.textContent = `@${member.full_name}`;

    const afterNode = document.createTextNode(after || '\u00A0');
    const parent = node.parentNode!;
    parent.insertBefore(chip, node.nextSibling);
    parent.insertBefore(afterNode, chip.nextSibling);

    const newRange = document.createRange();
    newRange.setStart(afterNode, after ? 0 : 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setMentionQuery(null);
    checkEmpty();
  }, []);

  const handleMentionKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery === null || filteredMembers.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, filteredMembers.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredMembers[mentionIndex]); }
    else if (e.key === 'Escape') { setMentionQuery(null); }
  };

  const handleSubmit = () => {
    if (!editorRef.current || isEmpty) return;
    const html = editorRef.current.innerHTML;
    onSubmit(html);
    if (editorRef.current) { editorRef.current.innerHTML = ''; checkEmpty(); }
  };

  const handleCancel = () => {
    if (editorRef.current) { editorRef.current.innerHTML = initialValue || ''; checkEmpty(); }
    onCancel?.();
  };

  const toolbarBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
    borderRadius: 3, color: '#42526E', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        border: `1px solid ${isFocused ? '#4C9AFF' : 'var(--ds-border, #DFE1E6)'}`,
        borderRadius: 6, overflow: 'hidden',
        boxShadow: isFocused ? '0 0 0 1px #4C9AFF' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px',
          borderBottom: '1px solid #F4F5F7', background: 'var(--ds-surface-sunken, #FAFBFC)', flexWrap: 'wrap',
        }}>
          <button style={toolbarBtnStyle} onClick={() => execCmd('bold')} title="Bold"
            onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          ><TextBoldIcon label="Bold" /></button>
          <button style={toolbarBtnStyle} onClick={() => execCmd('italic')} title="Italic"
            onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          ><TextItalicIcon label="Italic" /></button>
          <button style={toolbarBtnStyle} onClick={() => execCmd('underline')} title="Underline"
            onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          ><TextUnderlineIcon label="Underline" /></button>
          <div style={{ width: 1, height: 16, background: 'var(--ds-border, #DFE1E6)', margin: '0 4px' }} />
          <button style={toolbarBtnStyle} onClick={() => execCmd('insertUnorderedList')} title="Bullet list"
            onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          ><ListBulletedIcon label="Bullet list" /></button>
          <button style={toolbarBtnStyle} onClick={() => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.onchange = async () => { if (input.files?.[0]) await insertImage(input.files[0]); };
            input.click();
          }} title="Insert image"
            onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          ><ImageIcon label="Insert image" /></button>
          <button style={toolbarBtnStyle} onClick={() => {
            const url = prompt('Enter link URL:');
            if (url) execCmd('createLink', url);
          }} title="Insert link"
            onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          ><LinkIcon label="Insert link" /></button>
          <div style={{ width: 1, height: 16, background: 'var(--ds-border, #DFE1E6)', margin: '0 4px' }} />
          <button style={toolbarBtnStyle} onClick={() => execCmd('undo')} title="Undo"
            onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          ><UndoIcon label="Undo" /></button>
          <button style={toolbarBtnStyle} onClick={() => execCmd('redo')} title="Redo"
            onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          ><RedoIcon label="Redo" /></button>
        </div>

        {/* Editor area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleMentionKeyDown}
          data-placeholder={placeholder}
          style={{
            minHeight: 80, padding: '12px 14px', outline: 'none',
            fontSize: 14, color: 'var(--ds-text, #172B4D)', lineHeight: 1.6, fontFamily: 'inherit',
            background: 'var(--ds-surface, #FFF)', overflowY: 'auto', maxHeight: 300,
            position: 'relative',
          }}
        />

        {/* @mention dropdown */}
        {mentionQuery !== null && filteredMembers.length > 0 && mentionPos && (
          <div style={{
            position: 'absolute', top: mentionPos.top + 48, left: mentionPos.left + 8,
            background: 'var(--ds-surface, #FFF)', border: '1px solid #DFE1E6', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(9,30,66,0.18)', zIndex: 100, minWidth: 240,
            maxHeight: 200, overflowY: 'auto',
          }}>
            {filteredMembers.slice(0, 8).map((m, idx) => (
              <button key={m.id}
                onMouseDown={e => { e.preventDefault(); insertMention(m); }}
                style={{
                  width: '100%', padding: '8px 12px', border: 'none', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ds-text, #172B4D)',
                  background: idx === mentionIndex ? '#DEEBFF' : 'transparent',
                }}
                onMouseEnter={() => setMentionIndex(idx)}
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#0747A6', color: 'var(--ds-surface, #FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {m.full_name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span>{m.full_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>Uploading image…</div>
      )}

      {/* Save / Cancel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button
          onClick={handleSubmit}
          disabled={isEmpty || isSubmitting}
          style={{
            padding: '6px 16px', borderRadius: 4, border: 'none', cursor: isEmpty || isSubmitting ? 'not-allowed' : 'pointer',
            background: isEmpty || isSubmitting ? 'var(--ds-surface-sunken, #F4F5F7)' : '#0052CC', color: isEmpty || isSubmitting ? '#A5ADBA' : 'var(--ds-surface, #FFF)',
            fontSize: 14, fontWeight: 600, transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!isEmpty && !isSubmitting) e.currentTarget.style.background = '#0747A6'; }}
          onMouseLeave={e => { if (!isEmpty && !isSubmitting) e.currentTarget.style.background = '#0052CC'; }}
        >Save</button>
        <button
          onClick={handleCancel}
          style={{
            padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#42526E', fontSize: 14, fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >Cancel</button>
      </div>
    </div>
  );
}
