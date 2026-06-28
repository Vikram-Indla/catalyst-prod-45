/**
 * QuickSearchInput — lightweight client-side filter for Timeline/Board views.
 * Matches ticket key or title. Uses @atlaskit/textfield for ADS compliance.
 * Jira pattern: small search field above list, filters instantly on keystroke.
 */
import React, { useRef } from 'react';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';

interface QuickSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** When set, shows "N of M" result indicator */
  resultCount?: number;
  totalCount: number;
}

export function QuickSearchInput({ value, onChange, resultCount, totalCount }: QuickSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12, maxWidth: 320,
    }}>
      <div data-voice-zone="true" style={{ flex: 1 }}>
        <Textfield
          ref={inputRef}
          placeholder="Search by key or title..."
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          isCompact
          elemAfterInput={
            value.trim() ? (
              <button
                onClick={() => { onChange(''); inputRef.current?.focus(); }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '0 8px', fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'),
                  lineHeight: 1,
                }}
                aria-label="Clear search"
              >
                &times;
              </button>
            ) : undefined
          }
        />
      </div>
      {resultCount !== undefined && (
        <span style={{
          fontSize: 'var(--ds-font-size-100)', fontWeight: 500, whiteSpace: 'nowrap',
          color: resultCount === 0
            ? token('color.text.warning', 'var(--ds-text-warning, #974F0C)')
            : token('color.text.subtlest', 'var(--ds-icon-subtle, #626F86)'),
        }}>
          {resultCount} of {totalCount}
        </span>
      )}
    </div>
  );
}
