/**
 * FacetFilterBar — generic row of faceted filter dropdowns (artifact IA parity).
 *
 * The artifact's Backlog and Change Records surfaces show a row of individual
 * facet dropdowns (e.g. Product · Status · Health · Type · Environment · Source),
 * each opening its own checkbox menu — NOT the two-pane `JiraBasicFilter`
 * popover used on work-item lists. This is the config-driven, module-scoped
 * primitive for that pattern. It deliberately does NOT fork the work-item
 * `BasicFilterBar` (which is hardwired to the JiraFilterValue model); instead
 * it takes arbitrary `{ id, label, options }` facets.
 *
 * Each facet menu portals to <body> (CLAUDE.md 2026-06-13 — @atlaskit/dropdown
 * positions at (0,0) inside overflow:hidden ancestors; direct getBoundingClientRect
 * + createPortal is the safe pattern). Multi-select within a facet (OR), AND
 * across facets — the caller applies the predicate.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X } from '@/lib/atlaskit-icons';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-overlay)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-link)',
  selectedBg: 'var(--ds-background-selected)',
  hover: 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))',
};

export interface FacetOption {
  id: string;
  label: string;
}
export interface Facet {
  id: string;
  label: string;
  options: FacetOption[];
}

interface FacetFilterBarProps {
  facets: Facet[];
  value: Record<string, string[]>;
  onChange: (facetId: string, optionIds: string[]) => void;
  onClear: () => void;
}

function FacetDropdown({ facet, selected, onChange }: {
  facet: Facet;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const count = selected.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const rect = open && btnRef.current ? btnRef.current.getBoundingClientRect() : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 8px', borderRadius: 6, cursor: 'pointer',
          fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 500,
          border: `1px solid ${count > 0 ? T.link : T.border}`,
          background: count > 0 ? T.selectedBg : T.card,
          color: count > 0 ? T.link : T.subtle,
        }}
      >
        {facet.label}
        {count > 0 && (
          <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px', background: T.link, color: 'var(--ds-text-inverse)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
        )}
        <ChevronDown size={14} style={{ color: count > 0 ? T.link : T.subtlest }} />
      </button>
      {open && rect && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-multiselectable="true"
          aria-label={facet.label}
          style={{
            position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999,
            minWidth: Math.max(180, rect.width), maxHeight: 320, overflowY: 'auto',
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 6,
            boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))', padding: '4px 0',
          }}
        >
          {facet.options.length === 0 && (
            <div style={{ padding: '8px 12px', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>No options</div>
          )}
          {facet.options.map((opt) => {
            const checked = selected.includes(opt.id);
            return (
              <div
                key={opt.id}
                role="option"
                aria-selected={checked}
                onClick={() => toggle(opt.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer',
                  fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text,
                  background: checked ? T.selectedBg : 'transparent',
                }}
                onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                onMouseLeave={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>
                  {checked && <Check size={14} style={{ color: T.link }} />}
                </span>
                {opt.label}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

export function FacetFilterBar({ facets, value, onChange, onClear }: FacetFilterBarProps) {
  const total = useMemo(() => Object.values(value).reduce((n, a) => n + a.length, 0), [value]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {facets.map((f) => (
        <FacetDropdown key={f.id} facet={f} selected={value[f.id] ?? []} onChange={(ids) => onChange(f.id, ids)} />
      ))}
      {total > 0 && (
        <button
          onClick={onClear}
          style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}
        >
          <X size={14} style={{ color: T.subtlest }} /> Clear filters
        </button>
      )}
    </div>
  );
}
