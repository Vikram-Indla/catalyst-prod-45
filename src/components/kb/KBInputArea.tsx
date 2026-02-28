import React, { useRef, useState } from 'react';
import { Mic, ArrowUp } from 'lucide-react';

type Lang = 'en' | 'ar';

interface KBInputAreaProps {
  input: string;
  onInputChange: (val: string) => void;
  onSend: (text?: string) => void;
  isLoading: boolean;
  lang: Lang;
  isListening: boolean;
  onToggleListening: () => void;
  chips?: string[];
}


export function KBInputArea({
  input,
  onInputChange,
  onSend,
  isLoading,
  lang,
  isListening,
  onToggleListening,
  chips = [],
}: KBInputAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const hasText = input.trim().length > 0;
  const isRTL = lang === 'ar';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      style={{
        flexShrink: 0,
        background: '#FFFFFF',
        borderTop: '1px solid #F4F4F5',
        padding: '16px 24px 20px',
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Quick chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => onSend(chip)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 20,
              border: '1px solid #E4E4E7',
              background: 'transparent',
              color: '#374151',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563EB';
              e.currentTarget.style.color = '#2563EB';
              e.currentTarget.style.background = '#EFF6FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E4E4E7';
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#F9FAFB',
          border: `1.5px solid ${inputFocused ? '#2563EB' : '#E4E4E7'}`,
          borderRadius: 14,
          padding: '8px 14px',
          minHeight: 52,
          transition: 'all 200ms ease',
          boxShadow: inputFocused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
        }}
      >
        {/* Mic */}
        <button
          onClick={onToggleListening}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: isListening ? '#DC2626' : '#F4F4F5',
            transition: 'all 200ms ease',
            animation: isListening ? 'kb-mic-pulse 1.5s infinite' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isListening) {
              e.currentTarget.style.background = '#EFF6FF';
            }
          }}
          onMouseLeave={(e) => {
            if (!isListening) {
              e.currentTarget.style.background = '#F4F4F5';
            }
          }}
          title={isListening ? 'Stop listening' : 'Voice input'}
        >
          <Mic size={18} color={isListening ? '#FFFFFF' : '#71717A'} />
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={isRTL ? '...اسأل أي شيء' : 'Ask anything...'}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            fontWeight: 400,
            color: '#18181B',
            direction: isRTL ? 'rtl' : 'ltr',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        />

        {/* Send */}
        <button
          onClick={() => onSend()}
          disabled={!hasText || isLoading}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            cursor: hasText ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: hasText ? '#2563EB' : '#F4F4F5',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            if (hasText) e.currentTarget.style.background = '#1D4ED8';
          }}
          onMouseLeave={(e) => {
            if (hasText) e.currentTarget.style.background = '#2563EB';
          }}
        >
          <ArrowUp size={18} color={hasText ? '#FFFFFF' : '#D4D4D8'} />
        </button>
      </div>

      {/* Footer text */}
      <p style={{ fontSize: 11, color: '#A1A1AA', textAlign: 'center', marginTop: 10, margin: '10px 0 0' }}>
        Verified against indexed sources · Cited responses
      </p>

      <style>{`
        @keyframes kb-mic-pulse {
          0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
      `}</style>
    </div>
  );
}

export default KBInputArea;
