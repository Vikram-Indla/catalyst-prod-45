import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineSummaryEditProps {
  value: string;
  onChange: (value: string) => void;
  isSelected?: boolean;
}

export function InlineSummaryEdit({ value, onChange, isSelected }: InlineSummaryEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="h-7 text-[13px] text-[#172B4D] border-[#4C9AFF] rounded-[3px] bg-white px-1.5 focus:ring-0 focus:ring-offset-0"
      />
    );
  }

  return (
    <span 
      className={cn(
        "text-[13px] text-[#172B4D] truncate block cursor-text px-1.5 py-1 -mx-1.5 rounded-[3px] hover:bg-[#F4F5F7]",
        isSelected && "bg-[#E9F2FF]"
      )}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}
