import { useState, useRef, useCallback } from 'react';
import CatalystAvatar from '@/components/shared/CatalystAvatar';

interface ReplyComposerProps {
  avatarName?: string;
  avatarSrc?: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
  onAiSuggest?: () => void;
  isDark?: boolean;
}

export default function ReplyComposer({
  avatarName = 'Me',
  avatarSrc,
  placeholder = 'Leave a reply',
  onSubmit,
  onAiSuggest,
  isDark = false,
}: ReplyComposerProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
        onSubmit(value.trim());
        setValue('');
      }
    },
    [onSubmit, value],
  );

  const borderTop = isDark ? 'var(--ds-border, #2C3E50)' : 'var(--ds-border, #DFE1E6)';
  const inputBorderBottom = isDark ? 'var(--ds-border, #34495E)' : 'var(--ds-border, #DFE1E6)';
  const textColor = isDark ? 'var(--ds-text, #E6EDFA)' : 'var(--ds-text, #172B4D)';
  const placeholderColor = isDark ? 'var(--ds-text-subtlest, #5E6C84)' : 'var(--ds-text-subtlest, #6B778C)';
  const btnBorder = isDark ? 'var(--ds-border, #34495E)' : 'var(--ds-border, #DFE1E6)';
  const btnText = isDark ? 'var(--ds-text-subtle, #8C9CB5)' : 'var(--ds-text-subtle, #42526E)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        paddingTop: 16,
        marginTop: 16,
        borderTop: `1px solid ${borderTop}`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <CatalystAvatar name={avatarName} src={avatarSrc} size="small" appearance="circle" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            width: '100%',
            height: 32,
            padding: '8px 0',
            border: 'none',
            borderBottom: `2px solid ${inputBorderBottom}`,
            background: 'transparent',
            fontFamily: 'var(--cp-font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
            fontSize: 14,
            lineHeight: '20px',
            color: textColor,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderBottomColor = 'var(--ds-border-focused, #4C9AFF)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = inputBorderBottom;
          }}
        />

        {onAiSuggest && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAiSuggest(); }}
            aria-label="Suggest a reply using AI"
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              border: `1px solid ${btnBorder}`,
              borderRadius: 4,
              background: 'transparent',
              fontFamily: 'var(--cp-font-body, inherit)',
              fontSize: 13,
              fontWeight: 500,
              color: btnText,
              cursor: 'pointer',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ds-surface-sunken, #F7F8F9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* sparkle icon — mirrors @atlaskit/icon-lab/core/ai-sparkle */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5L9.25 6.75L14.5 8L9.25 9.25L8 14.5L6.75 9.25L1.5 8L6.75 6.75L8 1.5Z"
                fill="currentColor"
                opacity="0.85"
              />
              <path d="M13 1L13.6 3.4L16 4L13.6 4.6L13 7L12.4 4.6L10 4L12.4 3.4L13 1Z" fill="currentColor" opacity="0.6"/>
            </svg>
            Suggest a reply
          </button>
        )}
      </div>
    </div>
  );
}
