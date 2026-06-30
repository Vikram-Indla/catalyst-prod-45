import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { token } from '@atlaskit/tokens';
import { getSuggestions, translate } from '@/lib/jql';
import { JQLAutocompleteDropdown } from './JQLAutocompleteDropdown';
import { useJQLValidation } from '@/hooks/workhub/useJQLValidation';
import type { SuggestionResult, ValuePool } from '@/lib/jql';
import type { Suggestion } from '@/lib/jql';

interface Props {
  value: string;
  onChange: (jql: string) => void;
  onFiltersChange?: (filters: ReturnType<typeof translate>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isInvalid?: boolean;
  showFilterCount?: boolean;
  singleLine?: boolean;
  /**
   * Map of JQL field name → list of actual project values.
   * Keys must match JQL_FIELD_MAP keys: status, assignee, issuetype, etc.
   */
  valuePool?: Record<string, string[]>;
}

// ── Syntax highlighting ───────────────────────────────────────────────────────

const KW_SET  = new Set(['AND','OR','NOT','ORDER BY','ORDER','BY','ASC','DESC']);
const OP_SET  = new Set(['=','!=','<','>','<=','>=','IN','NOT IN','IS','IS NOT','WAS','CHANGED']);
// Known JQL field names (lower-case keys from JQL_FIELD_MAP)
const FIELD_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

type TokenKind = 'kw' | 'op' | 'field' | 'str' | 'fn' | 'punct' | 'plain';

interface SynToken { start: number; end: number; kind: TokenKind }

const KIND_COLOR: Record<TokenKind, string> = {
  kw:    'var(--ds-text-information)',
  field: 'var(--ds-text-success)',
  op:    'var(--ds-text-discovery)',
  str:   'var(--ds-text-danger)',
  fn:    'var(--ds-text-selected)',
  punct: 'var(--ds-text-subtle)',
  plain: 'var(--ds-text)',
};

function syntaxTokenize(src: string): SynToken[] {
  const out: SynToken[] = [];
  let i = 0;
  const len = src.length;

  while (i < len) {
    // Whitespace
    if (/\s/.test(src[i])) { i++; continue; }

    // Quoted string
    if (src[i] === '"') {
      const start = i++;
      while (i < len && src[i] !== '"') i++;
      if (i < len) i++; // closing "
      out.push({ start, end: i, kind: 'str' });
      continue;
    }

    // Punctuation
    if ('(),'.includes(src[i])) {
      out.push({ start: i, end: i + 1, kind: 'punct' });
      i++;
      continue;
    }

    // Symbols (operators)
    if ('!=<>'.includes(src[i])) {
      const start = i;
      while (i < len && '!=<>'.includes(src[i])) i++;
      const word = src.slice(start, i).toUpperCase();
      out.push({ start, end: i, kind: OP_SET.has(word) ? 'op' : 'plain' });
      continue;
    }

    // Bare word
    const start = i;
    while (i < len && !/[\s=!<>(),"']/.test(src[i])) i++;
    if (i === start) { i++; continue; }

    const raw  = src.slice(start, i);
    const up   = raw.toUpperCase();

    // "ORDER BY" two-word keyword
    if (up === 'ORDER') {
      let j = i;
      while (j < len && /\s/.test(src[j])) j++;
      if (src.slice(j, j + 2).toUpperCase() === 'BY') {
        out.push({ start, end: j + 2, kind: 'kw' });
        i = j + 2;
        continue;
      }
    }

    let kind: TokenKind = 'plain';
    if (KW_SET.has(up))                          kind = 'kw';
    else if (OP_SET.has(up))                     kind = 'op';
    else if (/^[a-zA-Z][a-zA-Z0-9_]*\(\)$/.test(raw)) kind = 'fn';
    else if (FIELD_RE.test(raw))                 kind = 'field';

    out.push({ start, end: i, kind });
  }

  return out;
}

function buildHighlightSpans(src: string): React.ReactNode[] {
  const tokens = syntaxTokenize(src);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const tok of tokens) {
    if (tok.start > cursor) {
      nodes.push(src.slice(cursor, tok.start));
    }
    nodes.push(
      <span key={tok.start} style={{ color: KIND_COLOR[tok.kind] }}>
        {src.slice(tok.start, tok.end)}
      </span>
    );
    cursor = tok.end;
  }
  if (cursor < src.length) nodes.push(src.slice(cursor));
  return nodes;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JQLEditor({
  value,
  onChange,
  onFiltersChange,
  placeholder = 'project = BAU AND status in (Done, Blocked) ORDER BY created DESC',
  autoFocus,
  isInvalid,
  showFilterCount,
  singleLine,
  valuePool,
}: Props) {
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const overlayRef   = useRef<HTMLDivElement>(null);

  const [suggestions,  setSuggestions]  = useState<SuggestionResult | null>(null);
  const [anchorRect,   setAnchorRect]   = useState<DOMRect | null>(null);
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [focused,      setFocused]      = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validation  = useJQLValidation(value);

  // Reset selected index when suggestion list changes
  useEffect(() => { setSelectedIdx(0); }, [suggestions]);

  // Deduplicate and clean valuePool entries
  const resolvedPool: ValuePool | undefined = valuePool
    ? Object.fromEntries(
        Object.entries(valuePool).map(([field, vals]) => {
          const seen = new Set<string>();
          return [
            field,
            vals
              .filter(v => { const k = v.trim(); return k && !seen.has(k) && seen.add(k); })
              .map((v): Suggestion => ({ value: v.trim() })),
          ];
        })
      )
    : undefined;

  // Auto-quote a picked value if it contains spaces
  function maybeQuote(v: string): string {
    return v.includes(' ') ? `"${v}"` : v;
  }

  // Shared insert-suggestion logic for both textarea and input
  const insertSuggestion = useCallback((picked: string, ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>) => {
    const el = ref.current;
    if (!el) return;
    const cursor    = el.selectionStart ?? value.length;
    const before    = value.slice(0, cursor);
    const after     = value.slice(cursor);
    const wordStart = before.search(/[\w("]*$/);
    const quoted    = maybeQuote(picked);
    const newVal    = before.slice(0, wordStart) + quoted + ' ' + after;
    onChange(newVal);
    setSuggestions(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = wordStart + quoted.length + 1;
      el.setSelectionRange(pos, pos);
    });
  }, [value, onChange]);

  // Shared keyDown handler for both branches
  function sharedKeyDown(e: React.KeyboardEvent, ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>) {
    if (suggestions) {
      const items = suggestions.items;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, items.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const item = items[selectedIdx];
        if (item) {
          e.preventDefault();
          insertSuggestion(item.value, ref);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions(null);
        return;
      }
    }
    // Ctrl/Cmd+Enter submits
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      setSuggestions(null);
      onFiltersChange?.(translate(value));
    }
  }

  // Textarea handlers
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const cursor = e.target.selectionStart ?? newValue.length;
    const result = getSuggestions(newValue, cursor, resolvedPool);
    setSuggestions(result.items.length ? result : null);
    setAnchorRect(e.target.getBoundingClientRect());
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { onFiltersChange?.(translate(newValue)); }, 300);
  }, [onChange, onFiltersChange]);

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    sharedKeyDown(e, textareaRef);
  }, [suggestions, selectedIdx, value, onFiltersChange, insertSuggestion]);

  const handleTextareaSelect = useCallback((picked: string) => {
    insertSuggestion(picked, textareaRef);
  }, [insertSuggestion]);

  // Scroll sync: overlay mirrors textarea scroll position
  const syncScroll = useCallback(() => {
    const ta  = textareaRef.current;
    const ov  = overlayRef.current;
    if (ta && ov) { ov.scrollTop = ta.scrollTop; ov.scrollLeft = ta.scrollLeft; }
  }, []);

  // Input (singleLine) handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const cursor = e.target.selectionStart ?? newValue.length;
    const result = getSuggestions(newValue, cursor, resolvedPool);
    setSuggestions(result.items.length ? result : null);
    setAnchorRect(e.target.getBoundingClientRect());
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { onFiltersChange?.(translate(newValue)); }, 300);
  }, [onChange, onFiltersChange]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    sharedKeyDown(e, inputRef);
  }, [suggestions, selectedIdx, value, onFiltersChange, insertSuggestion]);

  const handleInputSelect = useCallback((picked: string) => {
    insertSuggestion(picked, inputRef);
  }, [insertSuggestion]);

  // Border colors
  const hasServerErrors = !validation.valid && validation.errors.length > 0;
  const borderBase  = (isInvalid || hasServerErrors)
    ? token('color.border.danger')
    : `var(--ds-border)`;
  const borderFocus = token('color.border.focused');
  const borderColor = focused ? borderFocus : borderBase;

  // Filter count
  const filterCount = React.useMemo(() => {
    try { return translate(value).length; } catch { return 0; }
  }, [value]);

  // Shared inline styles for textarea/input text
  const textStyle: React.CSSProperties = {
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: 'var(--ds-font-size-300)',
    lineHeight: 1.5,
    color: singleLine ? token('color.text') : 'transparent',
    caretColor: token('color.text'),
  };

  // ── singleLine branch ──────────────────────────────────────────────────────
  if (singleLine) {
    return (
      <div style={{
        position: 'relative',
        width: '100%',
        background: `var(--ds-surface)`,
        border: `2px solid ${borderColor}`,
        borderRadius: 3,
        transition: 'border-color 0.15s',
      }}>
        {/* Highlight overlay — sits behind the transparent input; provides syntax colour */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            padding: '0 12px',
            height: 32,
            lineHeight: '32px',
            fontSize: 'var(--ds-font-size-300)',
            fontFamily: 'var(--ds-font-family-code, monospace)',
            whiteSpace: 'pre',
            overflow: 'hidden',
            pointerEvents: 'none',
            userSelect: 'none',
            color: token('color.text'),
          }}
        >
          {buildHighlightSpans(value)}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          spellCheck={false}
          style={{
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            height: 32,
            padding: '0 12px',
            ...textStyle,
            color: 'transparent',
            caretColor: token('color.text'),
            background: 'transparent',
            border: 'none',
            outline: 'none',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setSuggestions(null), 150);
          }}
          onKeyDown={handleInputKeyDown}
        />
        <JQLAutocompleteDropdown
          result={suggestions}
          anchorRect={anchorRect}
          selectedIndex={selectedIdx}
          onSelect={handleInputSelect}
          onDismiss={() => setSuggestions(null)}
        />
      </div>
    );
  }

  // ── multi-line branch ──────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Highlight overlay */}
        <div
          ref={overlayRef}
          aria-hidden
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            padding: '8px 12px',
            fontSize: 'var(--ds-font-size-300)',
            fontFamily: 'var(--ds-font-family-code, monospace)',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
            pointerEvents: 'none',
            userSelect: 'none',
            borderRadius: 3,
            color: token('color.text'),
          }}
        >
          {buildHighlightSpans(value)}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleTextareaKeyDown}
          onScroll={syncScroll}
          placeholder={placeholder}
          autoFocus={autoFocus}
          spellCheck={false}
          rows={3}
          style={{
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            padding: '8px 12px',
            ...textStyle,
            color: 'transparent',
            caretColor: token('color.text'),
            background: `var(--ds-surface)`,
            border: `2px solid ${borderColor}`,
            borderRadius: 3,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setSuggestions(null), 150);
          }}
        />
      </div>

      {showFilterCount && filterCount > 0 && (
        <div style={{ marginTop: 4, fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
          {filterCount} active {filterCount === 1 ? 'filter' : 'filters'}
          {validation.isChecking && (
            <span style={{ marginLeft: 8, color: token('color.text.subtlest') }}>Validating…</span>
          )}
        </div>
      )}

      {hasServerErrors && (
        <div style={{ marginTop: 4 }}>
          {validation.errors.map((err, i) => (
            <div key={i} style={{
              fontSize: 'var(--ds-font-size-200)',
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

      {validation.warnings && validation.warnings.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {validation.warnings.map((w, i) => (
            <div key={i} style={{
              fontSize: 'var(--ds-font-size-200)',
              color: 'var(--ds-text-warning)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 4,
            }}>
              <span aria-hidden>⚠</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <JQLAutocompleteDropdown
        result={suggestions}
        anchorRect={anchorRect}
        selectedIndex={selectedIdx}
        onSelect={handleTextareaSelect}
        onDismiss={() => setSuggestions(null)}
      />
    </div>
  );
}
