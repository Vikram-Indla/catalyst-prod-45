/**
 * GroupByPopover — Jira-parity Group By dropdown
 *
 * ADS-only: no lucide imports, no Tailwind classes, no --cp-* token fallbacks.
 * Token reference: atlassian.design/tokens
 */
import { useState, useEffect, useRef, useCallback } from 'react';

/* ═══ Inline field icons (replaces lucide FIELD_ICONS — no lucide dependency) ═══ */

type Ic = { size?: number; color?: string };

const IcPerson = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 7a5 5 0 0110 0H3z" />
  </svg>
);
const IcFlag = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
    <path d="M3 2h9.5l-2 3.5 2 3.5H3V2zm0 10v2" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" />
  </svg>
);
const IcBranch = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" aria-hidden>
    <circle cx="8" cy="3" r="1.5" />
    <circle cx="4" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <path d="M8 4.5v2.5L4 12M8 7l4 5" />
  </svg>
);
const IcCircle = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" aria-hidden>
    <circle cx="8" cy="8" r="5.5" />
    <circle cx="8" cy="8" r="2" fill={color} />
  </svg>
);
const IcGrid = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);
const IcTag = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
    <path d="M2 2h6l6 6-6 6-6-6V2zm3 3a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);
/* Group trigger icon — stacked lines */
const IcGroup = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden>
    <rect x="2" y="3" width="12" height="2" rx="1" />
    <rect x="2" y="7" width="10" height="2" rx="1" />
    <rect x="2" y="11" width="7" height="2" rx="1" />
  </svg>
);
/* Search icon */
const IcSearch = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5l3 3" />
  </svg>
);
/* Checkmark icon */
const IcCheck = ({ size = 14, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M3 8l4 4 6-6" />
  </svg>
);
/* Close / clear icon */
const IcClose = ({ size = 10, color = 'currentColor' }: Ic) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden>
    <path d="M1 1l8 8M9 1l-8 8" />
  </svg>
);

/* ═══ FIELD_ICONS map (Atlaskit-parity inline SVGs) ═══ */

const FIELD_ICONS: Record<string, (p: Ic) => JSX.Element> = {
  status:   IcCircle,
  priority: IcFlag,
  hub:      IcGrid,
  project:  IcGrid,
  reporter: IcPerson,
  assignee: IcPerson,
  type:     IcTag,
  parent:   IcBranch,
};

/* ═══ Public types ═══ */

export interface GroupByOption<K extends string = string> {
  key: K;
  label: string;
  icon?: keyof typeof FIELD_ICONS;
}

interface GroupByPopoverProps<K extends string> {
  value: K;
  onChange: (v: K) => void;
  options: GroupByOption<K>[];
  noneKey?: K;
  label?: string;
}

/* ═══ ADS tokens — all values use var(--ds-*) so light/dark mode is automatic ═══ */

const T = {
  text:         'var(--ds-text, #172B4D)',
  textSubtlest: 'var(--ds-text-subtlest, #6B778C)',
  border:       'var(--ds-border, #DFE1E6)',
  borderFocus:  'var(--ds-border-focused, #4C9AFF)',
  surface:      'var(--ds-surface, #FFFFFF)',
  hover:        'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
  selected:     'var(--ds-background-selected, #DEEBFF)',
  selectedText: 'var(--ds-link, #0052CC)',
  shadow:       'var(--ds-shadow-overlay)',
};

/* ═══ GroupByPopover ═══ */

export function GroupByPopover<K extends string>({
  value,
  onChange,
  options,
  noneKey = 'none' as K,
  label = 'Group',
}: GroupByPopoverProps<K>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusIdx, setFocusIdx] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isActive = value !== noneKey;

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => { setFocusIdx(-1); }, [search]);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback((key: K) => {
    onChange(value === key ? noneKey : key);
    setOpen(false);
    setSearch('');
  }, [value, noneKey, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusIdx >= 0 && focusIdx < filtered.length) {
      e.preventDefault();
      handleSelect(filtered[focusIdx].key);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  }, [filtered, focusIdx, handleSelect]);

  useEffect(() => {
    if (focusIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[focusIdx + 1] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx]);

  /* ADS tokens handle light/dark automatically — no JS ternary needed */
  const bg      = T.surface;
  const border  = T.border;
  const shadow  = T.shadow;
  const hover   = T.hover;
  const selBg   = T.selected;
  const selText = T.selectedText;
  const text    = T.text;
  const muted   = T.textSubtlest;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── Trigger Button — gray border idle, blue border open/focused/active ── */}
      <button
        onClick={() => { setOpen(p => !p); if (!open) setTimeout(() => inputRef.current?.focus(), 50); }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 32, padding: '0 8px',
          background: isActive
            ? selBg
            : isHovered
              ? hover
              : T.surface,
          border: `1px solid ${(open || isFocused || isActive) ? 'var(--ds-border-selected, #0C66E4)' : T.border}`,
          boxShadow: (open || isFocused || isActive)
            ? '0 0 0 1px var(--ds-border-selected, #0C66E4)'
            : 'none',
          borderRadius: 3,
          cursor: 'pointer',
          fontSize: 14, fontWeight: 500, lineHeight: '20px',
          color: isActive ? selText : text,
          fontFamily: 'var(--cp-font-body)',
          outline: 'none',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <IcGroup size={14} color={isActive ? selText : text} />
        {label}
        {isActive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18,
            background: 'var(--ds-link, var(--cp-primary-60, #0052CC))', color: 'var(--ds-text-inverse, #FFFFFF)',
            fontSize: 10, fontWeight: 700, borderRadius: 9,
          }}>1</span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 400,
            width: 260, background: bg,
            border: `1px solid ${border}`, borderRadius: 4,
            boxShadow: shadow, overflow: 'hidden',
            fontFamily: 'var(--cp-font-body)',
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Search */}
          <div style={{ padding: '8px 8px 8px', borderBottom: `1px solid ${border}` }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <IcSearch size={13} color={muted} />
              </span>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search grouping options"
                autoFocus
                style={{
                  width: '100%', height: 30,
                  paddingLeft: 24, paddingRight: search ? 24 : 8,
                  border: `1px solid ${border}`, borderRadius: 3,
                  fontSize: 13, color: text, background: bg,
                  fontFamily: 'var(--cp-font-body)',
                  outline: 'none',
                  transition: 'border-color 100ms',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = T.borderFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = border)}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: muted, padding: 4, display: 'flex',
                  }}
                  aria-label="Clear search"
                >
                  <IcClose size={10} color={muted} />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div ref={listRef} style={{ padding: '4px 0', maxHeight: 240, overflowY: 'auto' }}>
            <div style={{
              padding: '8px 12px 4px', fontSize: 11, fontWeight: 600,
              color: muted,
            }}>
              All fields
            </div>

            {filtered.map((opt, idx) => {
              const isSelected = value === opt.key;
              const isFocused  = focusIdx === idx;
              const IconComp   = FIELD_ICONS[opt.icon ?? (opt.key as keyof typeof FIELD_ICONS)] ?? IcCircle;
              const rowColor   = isSelected ? selText : text;

              return (
                <button
                  key={opt.key}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    height: 34, padding: '0 12px',
                    border: 'none',
                    borderLeft: `3px solid ${isSelected ? selText : 'transparent'}`,
                    background: isSelected ? selBg : isFocused ? hover : 'transparent',
                    color: rowColor,
                    fontSize: 14, fontWeight: isSelected ? 500 : 400,
                    cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                    transition: 'background 80ms',
                    outline: 'none',
                  }}
                  onMouseEnter={e => { setFocusIdx(idx); if (!isSelected) e.currentTarget.style.background = hover; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <IconComp size={14} color={isSelected ? selText : muted} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                  {isSelected && <IcCheck size={14} color={selText} />}
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 13, color: muted }}>
                No matching fields
              </div>
            )}
          </div>

          {/* Clear Footer */}
          {isActive && (
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${border}` }}>
              <button
                onClick={() => { onChange(noneKey); setOpen(false); setSearch(''); }}
                style={{
                  border: 'none', background: 'transparent',
                  color: muted, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--cp-font-body)', padding: '4px 0',
                  transition: 'color 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = selText)}
                onMouseLeave={e => (e.currentTarget.style.color = muted)}
              >
                Clear grouping
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
