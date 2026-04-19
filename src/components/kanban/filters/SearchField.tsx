/**
 * SearchField — Atlaskit Textfield wrapper for the Kanban filter bar.
 *
 * Single-purpose: typed query debounced upstream by the host. We keep
 * the clear-X visible only when there is text, and a ⌘/Ctrl+K hint is
 * surfaced as a tiny kbd chip on the right so power users notice it.
 */
import { useRef } from 'react';
import Textfield from '@atlaskit/textfield';
import { token } from '@atlaskit/tokens';
import { Search, X } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  width?: number;
  autoFocus?: boolean;
}

export function SearchField({ value, onChange, placeholder = 'Search work items…', width = 240, autoFocus }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ width }}>
      <Textfield
        ref={inputRef}
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        isCompact
        elemBeforeInput={
          <Search size={14} color={token('color.icon.subtle')} style={{ marginLeft: 8 }} aria-hidden />
        }
        elemAfterInput={
          value ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { onChange(''); inputRef.current?.focus(); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, marginRight: 4,
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderRadius: 4, color: token('color.icon.subtle'),
              }}
            >
              <X size={13} />
            </button>
          ) : (
            <kbd style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, marginRight: 8,
              padding: '1px 5px', borderRadius: 4,
              background: token('color.background.neutral'),
              color: token('color.text.subtle'),
              border: `1px solid ${token('color.border')}`,
            }}>⌘K</kbd>
          )
        }
      />
    </div>
  );
}
