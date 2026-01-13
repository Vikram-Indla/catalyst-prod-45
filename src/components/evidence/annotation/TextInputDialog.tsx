// ═══════════════════════════════════════════════════════════════════════════
// TEXT INPUT DIALOG
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface TextInputDialogProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export const TextInputDialog: React.FC<TextInputDialogProps> = ({ 
  isOpen, 
  position, 
  onSubmit, 
  onCancel 
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setText('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim()) {
      onSubmit(text.trim());
      setText('');
    } else if (e.key === 'Escape') {
      onCancel();
      setText('');
    }
  };
  
  return (
    <div 
      className="absolute bg-background rounded-lg shadow-xl p-3 z-10 border border-border"
      style={{ left: position.x, top: position.y }}
    >
      <Input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!text.trim()) onCancel();
        }}
        placeholder="Enter text..."
        className="min-w-[200px]"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Press Enter to add, Escape to cancel
      </p>
    </div>
  );
};
