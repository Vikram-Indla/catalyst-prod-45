import React, { useEffect, useRef } from 'react';
import { token } from '@atlaskit/tokens';
import type { SuggestionResult } from '@/lib/jql';

interface Props {
  result: SuggestionResult | null;
  anchorRect: DOMRect | null;
  selectedIndex?: number;
  onSelect: (value: string) => void;
  onDismiss: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  fields:    'Fields',
  operators: 'Operators',
  values:    'Values',
  functions: 'Functions',
  keywords:  'Keywords',
  direction: 'Sort direction',
};

// Subtle accent color per suggestion type (left border indicator)
const TYPE_ACCENT: Record<string, string> = {
  fields:    'var(--ds-text-success)',
  operators: 'var(--ds-text-discovery)',
  values:    'var(--ds-text-danger)',
  functions: 'var(--ds-text-selected)',
  keywords:  'var(--ds-text-information)',
  direction: 'var(--ds-text-information)',
};

export function JQLAutocompleteDropdown({ result, anchorRect, selectedIndex = 0, onSelect, onDismiss }: Props) {
  const ref     = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard: Escape
  useEffect(() => {
    if (!result) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onDismiss(); }
    }
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [result, onDismiss]);

  // Click-outside
  useEffect(() => {
    if (!result) return;
    function handleMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener('mousedown', handleMouse);
    return () => document.removeEventListener('mousedown', handleMouse);
  }, [result, onDismiss]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector<HTMLElement>('[data-sel="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!result || !result.items.length || !anchorRect) return null;

  const accent = TYPE_ACCENT[result.type] ?? 'var(--ds-text-subtle)';
  const items  = result.items.slice(0, 12);

  const style: React.CSSProperties = {
    position: 'fixed',
    top:      anchorRect.bottom + 4,
    left:     anchorRect.left,
    minWidth: Math.max(anchorRect.width, 220),
    maxWidth: 380,
    zIndex:   9000,
    background:   `var(--ds-surface-overlay)`,
    border:       `1px solid ${token('color.border')}`,
    borderRadius: 4,
    boxShadow:    `var(--ds-shadow-overlay, 0 4px 8px rgba(9,30,66,0.15))`,
    overflow:     'hidden',
    display:      'flex',
    flexDirection: 'column',
  };

  return (
    <div ref={ref} style={style} role="listbox" aria-label="JQL suggestions">
      {/* Header */}
      <div style={{
        padding: '4px 10px',
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: token('font.weight.semibold'),
        color:      accent,
        borderBottom: `1px solid ${token('color.border')}`,
        letterSpacing: '0.05em',
        background: `var(--ds-background-neutral-subtle)`,
      }}>
        {TYPE_LABEL[result.type] ?? result.type}
      </div>

      {/* Items */}
      <div ref={listRef} style={{ overflowY: 'auto', maxHeight: 256 }}>
        {items.map((item, idx) => {
          const isSel = idx === selectedIndex;
          return (
            <button
              key={item.value}
              data-sel={isSel ? 'true' : undefined}
              role="option"
              aria-selected={isSel}
              onMouseDown={e => e.preventDefault()} // prevent blur on click
              onClick={() => onSelect(item.value)}
              style={{
                display:     'block',
                width:       '100%',
                textAlign:   'left',
                padding:     '8px 12px',
                background:  isSel
                  ? `var(--ds-background-neutral)`
                  : 'none',
                border:        'none',
                borderLeft:    isSel ? `3px solid ${accent}` : '3px solid transparent',
                cursor:        'pointer',
                fontSize: 'var(--ds-font-size-300)',
                color:         token('color.text'),
                transition:    'background 0.1s',
              }}
              onMouseEnter={e => {
                if (!isSel) (e.currentTarget as HTMLButtonElement).style.background =
                  `var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))`;
              }}
              onMouseLeave={e => {
                if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'none';
              }}
            >
              <span style={{ fontWeight: token('font.weight.medium') }}>
                {item.label ?? item.value}
              </span>
              {item.description && (
                <span style={{ marginLeft: 8, fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
                  {item.description}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Keyboard hint footer */}
      <div style={{
        padding:      '4px 10px',
        borderTop:    `1px solid ${token('color.border')}`,
        fontSize: 'var(--ds-font-size-100)',
        color:        token('color.text.subtlest'),
        background:   `var(--ds-background-neutral-subtle)`,
        display:      'flex',
        gap:          12,
      }}>
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span>esc dismiss</span>
      </div>
    </div>
  );
}
