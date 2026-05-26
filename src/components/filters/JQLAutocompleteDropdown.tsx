import React, { useEffect, useRef } from 'react';
import { token } from '@atlaskit/tokens';
import type { SuggestionResult } from '@/lib/jql';

interface Props {
  result: SuggestionResult | null;
  anchorRect: DOMRect | null;
  onSelect: (value: string) => void;
  onDismiss: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  fields:    'Fields',
  operators: 'Operators',
  values:    'Values',
  functions: 'Functions',
  keywords:  'Keywords',
};

export function JQLAutocompleteDropdown({ result, anchorRect, onSelect, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onDismiss(); }
    }
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [result, onDismiss]);

  useEffect(() => {
    if (!result) return;
    function handleMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener('mousedown', handleMouse);
    return () => document.removeEventListener('mousedown', handleMouse);
  }, [result, onDismiss]);

  if (!result || !result.items.length || !anchorRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.bottom + 4,
    left: anchorRect.left,
    minWidth: Math.max(anchorRect.width, 200),
    maxWidth: 360,
    zIndex: 9000,
    background: `var(--ds-surface-overlay, #FFFFFF)`,
    border: `1px solid ${token('color.border')}`,
    borderRadius: 4,
    boxShadow: `var(--ds-shadow-overlay, 0 4px 8px rgba(9,30,66,0.15))`,
    overflow: 'hidden',
  };

  return (
    <div ref={ref} style={style} role="listbox" aria-label="JQL suggestions">
      <div style={{
        padding: '4px 8px',
        fontSize: 11,
        fontWeight: token('font.weight.semibold'),
        color: token('color.text.subtlest'),
        borderBottom: `1px solid ${token('color.border')}`,
        letterSpacing: '0.05em',
      }}>
        {TYPE_LABEL[result.type] ?? result.type}
      </div>
      {result.items.slice(0, 12).map(item => (
        <button
          key={item.value}
          role="option"
          aria-selected={false}
          onClick={() => onSelect(item.value)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: token('color.text'),
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        >
          <span style={{ fontWeight: token('font.weight.medium') }}>{item.value}</span>
          {item.description && (
            <span style={{ marginLeft: 8, fontSize: 12, color: token('color.text.subtlest') }}>
              {item.description}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
