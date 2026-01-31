/**
 * Caty AI V7 — Input Area Component
 */

import React, { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface CatyInputAreaProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const CatyInputArea: React.FC<CatyInputAreaProps> = ({
  onSend,
  disabled,
  placeholder = 'Ask about capacity, contracts, or resource allocation...',
}) => {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    setValue(textarea.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  return (
    <div className="caty-input-area">
      <div className="caty-input-wrapper">
        <button className="caty-input-btn" aria-label="Attach file">
          <Paperclip size={22} />
        </button>
        <div className="caty-input-field">
          <textarea
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            aria-label="Message input"
          />
        </div>
        <button
          className="caty-send-btn"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
        >
          <Send size={22} />
        </button>
      </div>
    </div>
  );
};
