/**
 * InlineTextEdit — Click-to-edit text/textarea with autosave
 * 
 * Shows text in view mode, switches to input/textarea on click
 * Auto-saves on blur with debounce, shows saving indicator
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface InlineTextEditProps {
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  disabled?: boolean;
  emptyMessage?: string;
  rows?: number;
}

export function InlineTextEdit({
  value,
  onSave,
  placeholder = 'Click to edit...',
  multiline = false,
  className,
  textClassName,
  inputClassName,
  disabled = false,
  emptyMessage = 'Not provided',
  rows = 4,
}: InlineTextEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '');
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      } else if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim();
    
    // Skip if unchanged
    if (trimmedValue === (value || '').trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    } catch (error) {
      // Revert on error
      setEditValue(value || '');
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value || '');
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
    // Only Enter saves for single-line inputs
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  }, [handleCancel, handleSave, multiline]);

  if (disabled) {
    return (
      <div className={cn("text-[13px] text-gray-500", className)}>
        {value || emptyMessage}
      </div>
    );
  }

  // EDITING MODE
  if (isEditing) {
    const commonProps = {
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      disabled: isSaving,
      placeholder,
    };

    return (
      <div className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
        {multiline ? (
          <Textarea
            ref={textareaRef}
            {...commonProps}
            rows={rows}
            className={cn(
              "text-[13px] resize-none border-blue-500 focus:border-blue-500 focus:ring-blue-500/20",
              inputClassName
            )}
          />
        ) : (
          <Input
            ref={inputRef}
            {...commonProps}
            className={cn(
              "h-8 text-[13px] border-blue-500 focus:border-blue-500 focus:ring-blue-500/20",
              inputClassName
            )}
          />
        )}
        
        {/* Saving/Save indicator */}
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {isSaving ? (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-1 rounded hover:bg-emerald-100 transition-colors"
                title="Save (Blur or Enter)"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancel();
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Cancel (Esc)"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // VIEW MODE
  return (
    <div
      className={cn(
        "group cursor-pointer rounded-md px-2 py-1.5 -mx-2 -my-1.5 transition-colors hover:bg-gray-100",
        className
      )}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      {value ? (
        <p className={cn("text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap", textClassName)}>
          {value}
        </p>
      ) : (
        <p className="text-[13px] text-gray-400 italic">{emptyMessage}</p>
      )}
      
      {/* Saved indicator */}
      {showSaved && (
        <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-emerald-600">
          <Check className="w-3 h-3" />
          Saved
        </span>
      )}
    </div>
  );
}
