// Aqd¹⁰ Quick Add Input
import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AqdQuickAddProps {
  onAdd: (title: string, taskhubKey?: string) => void;
  disabled?: boolean;
}

const TASKHUB_PATTERN = /^[A-Z]{2,4}-\d+$/i;

export function AqdQuickAdd({ onAdd, disabled }: AqdQuickAddProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (TASKHUB_PATTERN.test(trimmed)) {
      onAdd(trimmed, trimmed.toUpperCase());
    } else {
      onAdd(trimmed);
    }
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setValue('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="border-2 border-dashed border-border rounded-xl p-4 flex items-center gap-4 transition-colors hover:border-primary/50 focus-within:border-primary">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Plus className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a priority or enter TaskHub key (e.g., PLN-001)..."
          className="border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
          disabled={disabled}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">↵</kbd>
        <span className="ml-1">to add</span>
      </div>
    </div>
  );
}
