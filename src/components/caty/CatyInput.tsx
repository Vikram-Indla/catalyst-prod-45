/**
 * Caty V4 — Input Component
 * Message input with send button
 */

import { forwardRef, KeyboardEvent } from 'react';
import { Send, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const CatyInput = forwardRef<HTMLInputElement, CatyInputProps>(
  ({ value, onChange, onSend, disabled = false, placeholder = "Ask Caty about capacity..." }, ref) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <div className="caty-input-wrapper">
        <div className={cn("caty-input-container", disabled && "disabled")}>
          <input
            ref={ref}
            type="text"
            className="caty-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="Ask Caty about capacity"
          />
          
          <div className="caty-input-actions">
            <button 
              className="caty-mic-btn"
              aria-label="Voice input (coming soon)"
              disabled
            >
              <Mic size={16} />
            </button>
            
            <button
              className={cn("caty-send-btn", !value.trim() && "disabled")}
              onClick={onSend}
              disabled={disabled || !value.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        
        <div className="caty-input-hint">
          <span>Press <kbd>Enter</kbd> to send · <kbd>Esc</kbd> to close</span>
        </div>
      </div>
    );
  }
);

CatyInput.displayName = 'CatyInput';
