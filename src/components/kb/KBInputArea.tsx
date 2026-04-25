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
        background: 'var(--cp-bg-page, var(--bg-app))',
        borderTop: '0.75px solid var(--cp-border-subtle, rgba(15,23,42,0.06))',
        padding: '12px 24px 16px',
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Quick chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 2, flexWrap: 'wrap' }}>
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => onSend(chip)}
            style={{
              padding: '6px 14px',
              fontSize: 'var(--cp-type-body-sm, 13px)',
              fontWeight: 500,
              borderRadius: 16,
              border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
              background: 'transparent',
              color: 'var(--cp-text-secondary, var(--fg-2))',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cp-primary-60, #2563EB)';
              e.currentTarget.style.color = 'var(--cp-primary-60, #2563EB)';
              e.currentTarget.style.background = 'var(--cp-primary-5, #EFF6FF)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--cp-border-default, rgba(15,23,42,0.12))';
              e.currentTarget.style.color = 'var(--cp-text-secondary, #334155)';
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
          background: 'var(--cp-input-bg, var(--bg-app))',
          border: `1.5px solid ${inputFocused ? 'var(--cp-input-border-focus, var(--cp-blue))' : 'var(--cp-input-border, rgba(15,23,42,0.14))'}`,
          borderRadius: 12,
          padding: '6px 12px',
          minHeight: 48,
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          boxShadow: inputFocused ? 'var(--cp-shadow-focus, 0 0 0 2px rgba(37,99,235,0.18))' : 'none',
        }}
      >
        {/* Mic */}
        <button
          onClick={onToggleListening}
          style={{
            width: 36,
            height: 50,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: isListening ? 'var(--cp-danger-60, var(--sem-danger))' : 'transparent',
            transition: 'all 200ms ease',
            animation: isListening ? 'kb-mic-pulse 1.5s infinite' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isListening) e.currentTarget.style.color = 'var(--cp-primary-60, #2563EB)';
          }}
          onMouseLeave={(e) => {
            if (!isListening) e.currentTarget.style.color = 'var(--cp-text-tertiary, #64748B)';
          }}
          title={isListening ? 'Stop listening' : 'Voice input'}
        >
          <Mic size={18} color={isListening ? 'var(--cp-text-inverse, #FFFFFF)' : 'var(--cp-text-tertiary, #64748B)'} />
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
            fontSize: 'var(--cp-type-body, 14px)',
            fontWeight: 400,
            color: 'var(--cp-text-primary, var(--fg-1))',
            direction: isRTL ? 'rtl' : 'ltr',
            fontFamily: "var(--cp-font-body)",
          }}
        />

        {/* Send */}
        <button
          onClick={() => onSend()}
          disabled={!hasText || isLoading}
          style={{
            width: 36,
            height: 50,
            borderRadius: '50%',
            border: 'none',
            cursor: hasText ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: hasText ? 'var(--cp-primary-60, var(--cp-blue))' : 'transparent',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            if (hasText) e.currentTarget.style.background = 'var(--cp-primary-70, #1D4ED8)';
          }}
          onMouseLeave={(e) => {
            if (hasText) e.currentTarget.style.background = 'var(--cp-primary-60, #2563EB)';
            else e.currentTarget.style.background = 'transparent';
          }}
        >
          <ArrowUp size={18} color={hasText ? 'var(--cp-text-inverse, #FFFFFF)' : 'var(--cp-text-muted, #94A3B8)'} />
        </button>
      </div>

      {/* Footer text */}
      <p style={{ fontSize: 'var(--cp-type-caption, 11px)', color: 'var(--cp-text-muted, var(--fg-4))', textAlign: 'center', marginTop: 8, margin: '8px 0 0' }}>
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
          color: var(--cp-text-tertiary, #64748B);
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
