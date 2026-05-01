// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10EditableTitle
// Purpose: Inline editable title with autosave for priority items
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { useT10UpdateItem } from '../../hooks/useT10Items';

interface T10EditableTitleProps {
  itemId: string;
  title: string;
  onSaved?: () => void;
  className?: string;
}

export function T10EditableTitle({
  itemId,
  title,
  onSaved,
  className,
}: T10EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateItem = useT10UpdateItem();

  // Sync title when prop changes
  useEffect(() => {
    setEditValue(title);
  }, [title]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === title) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateItem.mutateAsync({ id: itemId, title: trimmed });
      onSaved?.();
      setIsEditing(false);
    } catch (error) {
      console.error('[T10] Error saving title:', error);
      setEditValue(title);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={className}
        style={{
          padding: '0px 2px',
          background: 'var(--ds-surface, #ffffff)',
          border: '2px solid #2563eb',
          borderRadius: '4px',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          fontFamily: 'inherit',
          width: '100%',
          opacity: isSaving ? 0.7 : 1,
        }}
        disabled={isSaving}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={className}
      style={{
        cursor: 'text',
        borderRadius: '4px',
        padding: '0px 2px',
        transition: 'background-color 0.15s ease',
        display: 'inline-block',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLSpanElement).style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLSpanElement).style.backgroundColor = 'transparent';
      }}
      title="Click to edit"
    >
      {title}
    </span>
  );
}
