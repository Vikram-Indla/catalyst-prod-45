import React, { useCallback, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { getSuggestions, translate } from '@/lib/jql';
import { JQLAutocompleteDropdown } from './JQLAutocompleteDropdown';
import { useJQLValidation } from '@/hooks/workhub/useJQLValidation';
import type { SuggestionResult } from '@/lib/jql';

interface Props {
  value: string;
  onChange: (jql: string) => void;
  /** Called after debounce with the parsed filter descriptors */
  onFiltersChange?: (filters: ReturnType<typeof translate>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isInvalid?: boolean;
  /** Show the filter count below the editor */
  showFilterCount?: boolean;
}

export function JQLEditor({
  value,
  onChange,
  onFiltersChange,
  placeholder = 'project = BAU AND status in (Done, Blocked) ORDER BY created DESC',
  autoFocus,
  isInvalid,
  showFilterCount,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validation = useJQLValidation(value);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Autocomplete
    const cursor = e.target.selectionStart ?? newValue.length;
    const result = getSuggestions(newValue, cursor);
    setSuggestions(result.items.length ? result : null);
    setAnchorRect(e.target.getBoundingClientRect());

    // Debounce translation
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange?.(translate(newValue));
    }, 300);
  }, [onChange, onFiltersChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter / Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      setSuggestions(null);
      onFiltersChange?.(translate(value));
    }
  }, [onFiltersChange, value]);

  const handleSelect = useCallback((picked: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;

    // Replace the word being typed at cursor position with the suggestion
    const before = value.slice(0, cursor);
    const after  = value.slice(cursor);
    // Find start of current word
    const wordStart = before.search(/[\w(]*$/);
    const newVal = before.slice(0, wordStart) + picked + ' ' + after;
    onChange(newVal);
    setSuggestions(null);
    // Move cursor to end of inserted text
    requestAnimationFrame(() => {
      ta.focus();
      const pos = wordStart + picked.length + 1;
      ta.setSelectionRange(pos, pos);
    });
  }, [value, onChange]);

  const filterCount = React.useMemo(() => {
    try { return translate(value).length; } catch { return 0; }
  }, [value]);

  const hasServerErrors = !validation.valid && validation.errors.length > 0;
  const borderColor = (isInvalid || hasServerErrors)
    ? token('color.border.danger')
    : `var(--ds-border, #DFE1E6)`;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        spellCheck={false}
        rows={3}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          padding: '8px 12px',
          fontSize: 13,
          fontFamily: 'monospace',
          lineHeight: 1.5,
          color: token('color.text'),
          background: `var(--ds-surface, #FFFFFF)`,
          border: `2px solid ${borderColor}`,
          borderRadius: 3,
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = token('color.border.focused'); }}
        onBlur={e => {
          (e.target as HTMLTextAreaElement).style.borderColor = borderColor;
          // small delay so click on suggestion fires first
          setTimeout(() => setSuggestions(null), 150);
        }}
      />

      {showFilterCount && filterCount > 0 && (
        <div style={{
          marginTop: 4,
          fontSize: 12,
          color: token('color.text.subtlest'),
        }}>
          {filterCount} active {filterCount === 1 ? 'filter' : 'filters'}
          {validation.isChecking && <span style={{ marginLeft: 8, color: token('color.text.subtlest') }}>Validating…</span>}
        </div>
      )}

      {hasServerErrors && (
        <div style={{ marginTop: 4 }}>
          {validation.errors.map((err, i) => (
            <div key={i} style={{
              fontSize: 12,
              color: token('color.text.danger'),
              display: 'flex',
              alignItems: 'flex-start',
              gap: 4,
            }}>
              <span aria-hidden>✕</span>
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      <JQLAutocompleteDropdown
        result={suggestions}
        anchorRect={anchorRect}
        onSelect={handleSelect}
        onDismiss={() => setSuggestions(null)}
      />
    </div>
  );
}
