import React, { useRef, useState } from 'react';
import { Mic, ArrowUp } from 'lucide-react';

type Lang = 'en';

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
  const isRTL = false;

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
          background: '#FAFAFA',
          border: `1.5px solid ${inputFocused ? '#2563EB' : '#E4E4E7'}`,
          borderRadius: 14,
          padding: '6px 12px',
          minHeight: 52,
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          boxShadow: inputFocused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
        }}
      >
        {/* Mic */}
        <button
          onClick={onToggleListening}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: isListening ? '#DC2626' : 'transparent',
            transition: 'all 200ms ease',
            animation: isListening ? 'kb-mic-pulse 1.5s infinite' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isListening) e.currentTarget.style.color = '#2563EB';
          }}
          onMouseLeave={(e) => {
            if (!isListening) e.currentTarget.style.color = '#71717A';
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
          className="kb-input-field"
          style={{
            flex: 1,
            width: '100%',
            minWidth: 0,
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            cursor: hasText ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: hasText ? '#2563EB' : 'transparent',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            if (hasText) e.currentTarget.style.background = '#1D4ED8';
          }}
          onMouseLeave={(e) => {
            if (hasText) e.currentTarget.style.background = '#2563EB';
            else e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowUp size={18} color={hasText ? '#FFFFFF' : '#A1A1AA'} />
        </button>
      </div>

      {/* Footer text */}
      <p style={{ fontSize: 11, color: '#A1A1AA', textAlign: 'center', marginTop: 10, margin: '10px 0 0' }}>
        Verified against indexed sources · Cited responses
      </p>

      <style>{`
        .kb-input-field,
        .kb-input-field:focus,
        .kb-input-field:active,
        .kb-input-field:hover {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          border-radius: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }
        .kb-input-field::placeholder {
          color: #71717A;
        }
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
