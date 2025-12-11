import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditTextareaProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  minHeight?: string;
}

export function InlineEditTextarea({
  value,
  onSave,
  placeholder = 'Enter text...',
  emptyText = 'None found.',
  className,
  minHeight = '80px',
}: InlineEditTextareaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-md border border-brand-gold bg-background px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground resize-y',
            'focus:outline-none focus:ring-2 focus:ring-brand-gold/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          style={{ minHeight }}
          disabled={isSaving}
        />
        {isSaving && (
          <div className="absolute top-2 right-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand-gold" />
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Press Escape to cancel • Click outside or press Ctrl+Enter to save
        </p>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
      className={cn(
        'group relative cursor-pointer rounded-md px-2 py-1 -mx-2 -my-1',
        'transition-colors hover:bg-brand-gold/5',
        className
      )}
      aria-label="Click to edit"
    >
      {value ? (
        <p className="text-sm text-foreground leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm font-medium text-brand-gold">{emptyText}</p>
      )}
      <Pencil className="absolute top-1 right-1 h-3.5 w-3.5 text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
