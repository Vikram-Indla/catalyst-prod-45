import React, { useEffect, useRef, useState } from 'react';
import { ComposerToolbar } from '../Composer/ComposerToolbar';
import { ComposerEditor, type ComposerEditorHandle } from '../Composer/ComposerEditor';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';
import { AaIcon, PlusIcon, SmileyIcon } from '../shared/Icon';
import { htmlToMarkdown } from '../../lib/markdown';

interface MessageEditInPlaceProps {
  initialMarkdown: string;
  onCancel: () => void;
  onSave: (markdown: string) => void;
}

export function MessageEditInPlace({ initialMarkdown, onCancel, onSave }: MessageEditInPlaceProps) {
  const editorRef = useRef<ComposerEditorHandle>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(initialMarkdown);
  const [showToolbar, setShowToolbar] = useState(true);
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    editorRef.current?.setMarkdown(initialMarkdown);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, [initialMarkdown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const handleSave = () => {
    const html = editorRef.current?.getHtml() ?? '';
    const md = htmlToMarkdown(html).trim();
    if (!md) return;
    onSave(md);
  };

  return (
    <div
      style={{
        border: '1px solid var(--cv2-bg-composer-border)',
        borderRadius: 'var(--cv2-radius-md)',
        background: 'var(--cv2-bg-panel)',
        marginTop: 4,
      }}
    >
      {showToolbar && <ComposerToolbar onFormat={a => editorRef.current?.toggleFormat(a)} />}
      <ComposerEditor
        ref={editorRef}
        value={value}
        onChange={setValue}
        onSubmit={handleSave}
        placeholder="Edit message"
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '4px 10px',
          borderTop: '1px solid var(--cv2-border)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <FooterBtn label="Attach" onClick={() => {}}><PlusIcon size={15} /></FooterBtn>
          <FooterBtn
            label="Formatting"
            onClick={() => setShowToolbar(v => !v)}
            active={showToolbar}
          >
            <AaIcon size={15} />
          </FooterBtn>
          <FooterBtn
            ref={emojiBtnRef}
            label="Emoji"
            onClick={() => setEmojiOpen(v => !v)}
          >
            <SmileyIcon size={15} />
          </FooterBtn>
        </div>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 32,
              padding: '0 14px',
              background: 'transparent',
              color: 'var(--cv2-text)',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit',
              fontSize: 'var(--ds-font-size-300)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!value.trim()}
            style={{
              height: 32,
              padding: '0 14px',
              background: value.trim() ? 'var(--cv2-success)' : 'transparent',
              color: value.trim() ? 'var(--ds-text-inverse)' : 'var(--cv2-text-muted)',
              border: '1px solid ' + (value.trim() ? 'var(--cv2-success)' : 'var(--cv2-border-strong)'),
              borderRadius: 'var(--cv2-radius-sm)',
              fontFamily: 'inherit',
              fontSize: 'var(--ds-font-size-300)',
              fontWeight: 700,
              cursor: value.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>
      </div>
      {emojiOpen && (
        <EmojiPicker
          anchor="composer"
          anchorRect={emojiBtnRef.current?.getBoundingClientRect() ?? null}
          onPick={emoji => {
            editorRef.current?.insertEmoji(emoji);
            setEmojiOpen(false);
          }}
          onClose={() => setEmojiOpen(false)}
        />
      )}
    </div>
  );
}

const FooterBtn = React.forwardRef<HTMLButtonElement, {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>(function FooterBtn({ label, active, onClick, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
});
