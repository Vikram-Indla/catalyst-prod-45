import { useMemo, useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom'; // portal-fix
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import Avatar from '@atlaskit/avatar';
import SearchIcon from '@atlaskit/icon/glyph/search';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';

// FilterDropdown — Jira-parity multi-select filter chip for GlobalSearchPanel.
//
// Uses createPortal to escape the parent's overflow:hidden (confirmed via
// getComputedStyle 2026-05-08: panel has overflow:hidden, clipping absolute
// children). Popup renders to document.body at position:fixed using trigger
// bounding rect. Self-rolled mousedown click-outside — @atlaskit/popup has
// empty-portal bug on this surface.

export interface FilterOption {
  id: string;
  name: string;
  tag?: string;
  avatarSrc?: string;
  icon?: ReactNode;
}

interface FilterDropdownProps {
  label: string;
  searchPlaceholder: string;
  leadingIcon: React.ComponentType<{ label: string }>;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}

const chipBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 36,
  padding: '0 10px 0 8px',
  borderRadius: 4,
  border: '1px solid var(--ds-border)',
  background: 'var(--ds-surface)',
  color: 'var(--ds-text)',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'var(--cp-font-body)',
  cursor: 'pointer',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

const chipActive: React.CSSProperties = {
  ...chipBase,
  background: 'var(--ds-background-selected)',
  border: '1px solid var(--ds-border-selected)',
  color: 'var(--ds-text-selected)',
};

export function FilterDropdown({
  label,
  searchPlaceholder,
  leadingIcon: LeadingIcon,
  options,
  selectedIds,
  onChange,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  // Recompute popup position whenever it opens
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopupPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  // Click-outside closes the popup
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inPopup = popupRef.current?.contains(target);
      if (!inTrigger && !inPopup) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Escape closes without bubbling to parent search panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [open, close]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.tag && o.tag.toLowerCase().includes(q)),
    );
  }, [query, options]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const isActive = selectedIds.length > 0 || open;

  const popup = open && popupPos
    ? createPortal(
        <div
          ref={popupRef}
          role="listbox"
          data-filter-portal="true"
          style={{
            position: 'fixed',
            top: popupPos.top,
            left: popupPos.left,
            zIndex: 10000,
            width: 460,
            maxHeight: 460,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--ds-surface, #FFFFFF)',
            borderRadius: 4,
            border: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, #DFE1E6))',
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding: 10, borderBottom: '1px solid var(--ds-border)' }}>
            <Textfield
              autoFocus
              value={query}
              onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder={searchPlaceholder}
              elemAfterInput={
                <span style={{ display: 'inline-flex', paddingRight: 8, color: 'var(--ds-text-subtlest)' }}>
                  <SearchIcon label="" />
                </span>
              }
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            <div style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, color: 'var(--ds-text-subtle)' }}>
              Suggested
            </div>
            {filtered.map((opt) => {
              const checked = selectedIds.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  role="option"
                  aria-selected={checked}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 16px',
                    cursor: 'pointer',
                    background: checked ? 'var(--ds-background-neutral)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!checked) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = checked ? 'var(--ds-background-neutral)' : 'transparent';
                  }}
                >
                  <Checkbox isChecked={checked} onChange={() => toggle(opt.id)} />
                  {opt.icon ?? <Avatar appearance="circle" size="small" name={opt.name} src={opt.avatarSrc} />}
                  <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--cp-font-body)' }}>
                    {opt.name}
                    {opt.tag ? <span style={{ color: 'var(--ds-text-subtle, #626F86)' }}> ({opt.tag})</span> : null}
                  </span>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ds-text-subtlest)', fontFamily: 'var(--cp-font-body)' }}>
                No matches
              </div>
            )}
          </div>

          {/* Clear filter */}
          <button
            type="button"
            onClick={() => { onChange([]); setQuery(''); }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '12px 16px',
              borderTop: '1px solid var(--ds-border)',
              fontSize: 14,
              color: 'var(--ds-text, #172B4D)',
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            Clear filter
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={isActive ? chipActive : chipBase}
      >
        <LeadingIcon label="" />
        <span>{label}</span>
        {selectedIds.length > 0 && (
          <span
            style={{
              marginLeft: 2,
              padding: '0 6px',
              borderRadius: 8,
              background: 'var(--ds-background-brand-bold)',
              color: 'var(--ds-surface, #FFFFFF)',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: '16px',
            }}
          >
            {selectedIds.length}
          </span>
        )}
        <ChevronDownIcon label="" />
      </button>
      {popup}
    </>
  );
}
