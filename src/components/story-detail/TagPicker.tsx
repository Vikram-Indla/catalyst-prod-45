import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Search } from 'lucide-react';

/* ── Types ── */
export interface TagPickerProps {
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  allowCreate?: boolean;
  placeholder?: string;
  label?: string;
}

/* ── Tokens (hex only, V12) ── */
const T = {
  chipBg:       '#F5F5F5',
  border:       '#E2E8F0',
  borderHover:  '#CBD5E1',
  primary:      '#2563EB',
  textPrimary:  '#0F172A',
  textMuted:    '#94A3B8',
  textSecondary:'#475569',
  white:        '#FFFFFF',
  hoverBg:      'rgba(0,0,0,0.04)',
  subtleBg:     'rgba(0,0,0,0.02)',
  shadow:       '0 4px 12px rgba(0,0,0,0.12)',
  font:         "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

/* ── Chip ── */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 22,
        padding: '0 6px',
        background: T.chipBg,
        border: `1px solid ${T.border}`,
        borderRadius: 3,
        fontSize: 12,
        fontFamily: T.font,
        color: T.textPrimary,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {label}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove ${label}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          margin: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: T.textSecondary,
          flexShrink: 0,
        }}
      >
        <X size={12} />
      </button>
    </span>
  );
}

/* ── Main ── */
export function TagPicker({
  values,
  options,
  onChange,
  allowCreate = true,
  placeholder = 'None',
  label,
}: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hoverIdx, setHoverIdx] = useState(-1);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  /* position */
  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 200) });
  }, []);

  useEffect(() => {
    if (isOpen) {
      reposition();
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
      setHoverIdx(-1);
    }
  }, [isOpen, reposition]);

  /* outside click */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  /* escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  /* filtered */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  const canCreate = useMemo(() => {
    if (!allowCreate || !search.trim()) return false;
    const q = search.trim().toLowerCase();
    return !options.some((o) => o.toLowerCase() === q) && !values.some((v) => v.toLowerCase() === q);
  }, [allowCreate, search, options, values]);

  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  };

  const create = () => {
    const v = search.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
      setSearch('');
    }
  };

  /* keyboard in search */
  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHoverIdx((i) => Math.min(i + 1, filtered.length - 1 + (canCreate ? 1 : 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHoverIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hoverIdx >= 0 && hoverIdx < filtered.length) {
        toggle(filtered[hoverIdx]);
      } else if (canCreate && hoverIdx === filtered.length) {
        create();
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {label && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: T.font,
            color: T.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 4,
            userSelect: 'none',
          }}
        >
          {label}
        </span>
      )}

      {/* Trigger */}
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={label || 'Tag picker'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen((o) => !o); } }}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          padding: '4px 8px',
          minHeight: 32,
          background: T.white,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
          cursor: 'pointer',
          transition: 'border-color 150ms ease',
          fontFamily: T.font,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = T.borderHover; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = T.border; }}
      >
        {values.length === 0 ? (
          <span style={{ fontSize: 13, color: T.textMuted }}>{placeholder}</span>
        ) : (
          values.map((v) => <Chip key={v} label={v} onRemove={() => onChange(values.filter((x) => x !== v))} />)
        )}
      </div>

      {/* Portal dropdown */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: 340,
              background: T.white,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              boxShadow: T.shadow,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
              overflow: 'hidden',
              fontFamily: T.font,
            }}
          >
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${T.border}` }}>
              <Search size={14} color={T.textMuted} style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setHoverIdx(0); }}
                onKeyDown={onSearchKey}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontFamily: T.font,
                  color: T.textPrimary,
                }}
              />
            </div>

            {/* Options */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 260 }}>
              {filtered.length === 0 && !canCreate && (
                <div style={{ padding: 12, textAlign: 'center', fontSize: 13, color: T.textMuted }}>No options found</div>
              )}
              {filtered.map((opt, i) => {
                const checked = values.includes(opt);
                const highlighted = i === hoverIdx;
                return (
                  <label
                    key={opt}
                    onMouseEnter={() => setHoverIdx(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      height: 32,
                      padding: '0 12px',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: T.textPrimary,
                      background: highlighted ? T.hoverBg : 'transparent',
                      transition: 'background 120ms ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        border: `1.5px solid ${checked ? T.primary : T.borderHover}`,
                        background: checked ? T.primary : T.white,
                        flexShrink: 0,
                        transition: 'all 120ms ease',
                      }}
                    >
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt)}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                      tabIndex={-1}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{opt}</span>
                  </label>
                );
              })}

              {/* Create */}
              {canCreate && (
                <button
                  onMouseEnter={() => setHoverIdx(filtered.length)}
                  onClick={create}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    height: 36,
                    padding: '0 12px',
                    border: 'none',
                    borderTop: `1px solid ${T.border}`,
                    background: hoverIdx === filtered.length ? T.hoverBg : 'transparent',
                    color: T.primary,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: T.font,
                    fontWeight: 500,
                    textAlign: 'left',
                    transition: 'background 120ms ease',
                  }}
                >
                  <Plus size={14} /> Create "{search.trim()}"
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ── Demo ── */
const DEMO_OPTIONS = ['Bug', 'Enhancement', 'Documentation', 'Feature', 'Performance', 'Security', 'UX'];

export function TagPickerDemo() {
  const [v1, setV1] = useState(['Bug', 'Enhancement']);
  const [v2, setV2] = useState<string[]>([]);

  return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 400 }}>
      <TagPicker values={v1} options={DEMO_OPTIONS} onChange={setV1} label="Labels" />
      <TagPicker values={v2} options={DEMO_OPTIONS} onChange={setV2} label="Fix Versions" placeholder="Select or create…" />
    </div>
  );
}

export default TagPicker;
