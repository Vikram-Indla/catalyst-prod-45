/**
 * Message Input Component
 * Chat input with send button and keyboard shortcuts
 */

import React, { useRef, useEffect } from 'react';
import { Send, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { SuggestedQuestion } from '../types';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  isTyping: boolean;
  suggestedQuestions: SuggestedQuestion[];
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onCancel,
  isTyping,
  suggestedQuestions,
  placeholder = "Ask about tests, coverage, defects, or request test generation...",
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isTyping && value.trim()) {
        onSend();
      }
    }
    if (e.key === 'Escape' && isTyping && onCancel) {
      onCancel();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [value]);

  return (
    <div className="bg-white border-t border-slate-200 p-5">
      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && !isTyping && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => onChange(q.text)}
              className="flex-shrink-0 px-4 py-2 text-[13px] text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              {q.text}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isTyping}
            className={cn(
              "w-full min-h-[52px] max-h-[150px] resize-none px-5 py-4 text-sm",
              "bg-[#fafafa] border-slate-200 rounded-xl",
              "focus:bg-white focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20",
              "placeholder:text-slate-400"
            )}
            rows={1}
          />
        </div>
        
        {isTyping ? (
          <Button
            onClick={onCancel}
            className="h-[52px] w-[52px] bg-slate-500 hover:bg-slate-600 rounded-xl flex-shrink-0"
          >
            <StopCircle className="w-6 h-6" />
          </Button>
        ) : (
          <Button
            onClick={onSend}
            disabled={!value.trim()}
            className={cn(
              "h-[52px] w-[52px] rounded-xl flex-shrink-0 transition-colors",
              value.trim() 
                ? "bg-[#2563eb] hover:bg-[#1d4ed8]" 
                : "bg-slate-300 cursor-not-allowed"
            )}
          >
            <Send className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
        <span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">Shift+Enter</kbd> for new line
        </span>
        {isTyping && (
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">Esc</kbd> to stop
          </span>
        )}
      </div>
    </div>
  );
}
