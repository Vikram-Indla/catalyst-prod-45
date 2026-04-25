/**
 * InlineEditTitle — Double-click to edit, Enter to save, Escape to cancel
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil } from 'lucide-react';

interface InlineEditTitleProps {
  value: string;
  onSave: (newValue: string) => void;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  style?: React.CSSProperties;
  forceEdit?: boolean;
  onCancelForceEdit?: () => void;
}

export { type InlineEditTitleProps };

export function InlineEditTitle({ value, onSave, fontSize = 13, fontWeight = 500, color = 'var(--fg-1, #0F172A)', style, forceEdit, onCancelForceEdit }: InlineEditTitleProps) {
  const [editing, setEditing] = useState(false);
  const isEditing = editing || forceEdit;
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const save = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
    onCancelForceEdit?.();
  }, [draft, value, onSave, onCancelForceEdit]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
    onCancelForceEdit?.();
  }, [value, onCancelForceEdit]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); save(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          e.stopPropagation();
        }}
        onBlur={save}
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1, fontSize, fontWeight, color, fontFamily: 'var(--ds-font-family-body)',
          border: '1px solid #2563EB', borderRadius: 4, padding: '2px 6px',
          outline: 'none', background: 'var(--bg-app, #FFFFFF)', minWidth: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="hi-inline-title"
      style={{
        flex: 1, fontSize, fontWeight, color, display: 'flex', alignItems: 'center',
        overflow: 'hidden', cursor: 'text', position: 'relative', minWidth: 0,
        ...style,
      }}
      title={value}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{value}</span>
      <Pencil
        size={12}
        className="hi-edit-icon"
        style={{
          marginLeft: 4, color: '#94A3B8', flexShrink: 0,
          opacity: 0, transition: 'opacity 150ms ease',
        }}
      />
      <style>{`
        .hi-inline-title:hover .hi-edit-icon { opacity: 1 !important; }
      `}</style>
    </span>
  );
}
