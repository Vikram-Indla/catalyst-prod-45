/**
 * Release filter pills — Status (multi-checkbox), Product (search + multi-select), Group (single-select).
 *
 * Portal pattern: createPortal to document.body + position:fixed below trigger.
 * Tracks scroll/resize so the menu stays anchored to the trigger.
 * Click-outside + Escape close. Capture-phase Escape avoids parent modal swallow.
 * Self-rolled — @atlaskit/popup has a known empty-portal bug on filter chips
 * (see CLAUDE.md 2026-05-08 + 2026-06-13).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Checkbox } from '@atlaskit/checkbox';
import SearchIcon from '@atlaskit/icon/glyph/search';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import AkChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import Tooltip from '@atlaskit/tooltip';

// ───────────────────────── shared pill + portal ─────────────────────────

const PILL_HEIGHT = 32;
const PILL_BLUE = 'var(--ds-border-selected, #1868DB)';
const PILL_BG_ACTIVE = 'var(--ds-background-selected, #E9F2FE)';
const PILL_TEXT_ACTIVE = 'var(--ds-text-selected, #0C66E4)';

function pillStyle(active: boolean, whiteBg = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: PILL_HEIGHT,
    padding: '0 10px',
    borderRadius: 3,
    border: `1px solid ${active ? PILL_BLUE : 'var(--ds-border, #DFE1E6)'}`,
    background: active && !whiteBg ? PILL_BG_ACTIVE : 'var(--ds-surface, #FFFFFF)',
    color: active ? PILL_TEXT_ACTIVE : 'var(--ds-text, #292A2E)',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    outline: 'none',
  };
}

function useAnchoredPopup(open: boolean, triggerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => update();
    const onResize = () => update();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, update]);

  return pos;
}

function useDismiss(
  open: boolean,
  onClose: () => void,
  triggerRef: React.RefObject<HTMLElement | null>,
  popupRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose, triggerRef, popupRef]);
}

function PopupShell({
  open,
  pos,
  popupRef,
  width = 240,
  children,
}: {
  open: boolean;
  pos: { top: number; left: number; width: number } | null;
  popupRef: React.RefObject<HTMLDivElement | null>;
  width?: number;
  children: React.ReactNode;
}) {
  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={popupRef}
      role="listbox"
      data-filter-portal="true"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: Math.max(width, pos.width),
        maxHeight: 360,
        zIndex: 10000,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

// ───────────────────────── search input (autofocus + blue border on focus) ─────────────────────────

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 8px',
        borderRadius: 3,
        border: `1px solid ${focused ? PILL_BLUE : 'var(--ds-border, #DFE1E6)'}`,
        background: 'var(--ds-surface, #FFFFFF)',
        boxShadow: focused ? '0 0 0 1px rgba(24,104,219,0.2)' : 'none',
        transition: 'border-color 80ms ease, box-shadow 80ms ease',
      }}
    >
      <span style={{ display: 'inline-flex', color: 'var(--ds-text-subtlest, #6B778C)' }}>
        <SearchIcon label="" size="small" />
      </span>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 14,
          color: 'var(--ds-text, #292A2E)',
          fontFamily: 'inherit',
          padding: 0,
        }}
      />
    </div>
  );
}

// ───────────────────────── row helper ─────────────────────────

function CheckboxRow({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: React.ReactNode;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const showBar = checked || hover;
  return (
    <label
      role="option"
      aria-selected={checked}
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
        padding: '6px 12px 6px 16px',
        cursor: 'pointer',
        background: checked ? PILL_BG_ACTIVE : hover ? 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)' : 'transparent',
        userSelect: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: showBar ? PILL_BLUE : 'transparent',
          borderRadius: '0 2px 2px 0',
        }}
      />
      <Checkbox isChecked={checked} onChange={() => { /* handled by label click */ }} />
      <span
        style={{
          fontSize: 14,
          color: checked ? PILL_TEXT_ACTIVE : 'var(--ds-text, #292A2E)',
          fontWeight: checked ? 500 : 400,
        }}
      >
        {label}
      </span>
    </label>
  );
}

function RadioRow({
  checked,
  label,
  onSelect,
}: {
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const showBar = checked || hover;
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: 'unset',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
        padding: '8px 12px 8px 16px',
        cursor: 'pointer',
        background: checked ? PILL_BG_ACTIVE : hover ? 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)' : 'transparent',
        fontSize: 14,
        color: checked ? PILL_TEXT_ACTIVE : 'var(--ds-text, #292A2E)',
        fontWeight: checked ? 500 : 400,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: showBar ? PILL_BLUE : 'transparent',
          borderRadius: '0 2px 2px 0',
        }}
      />
      {label}
    </button>
  );
}

// ───────────────────────── Status filter (multi-checkbox) ─────────────────────────

export type StatusValue = 'released' | 'unreleased' | 'archived';

const STATUS_ORDER: { value: StatusValue; label: string }[] = [
  { value: 'released', label: 'Released' },
  { value: 'unreleased', label: 'Unreleased' },
  { value: 'archived', label: 'Archived' },
];

export function StatusFilter({
  value,
  onChange,
}: {
  value: StatusValue[];
  onChange: (next: StatusValue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPopup(open, triggerRef);
  useDismiss(open, () => setOpen(false), triggerRef, popupRef);

  const allSelected = value.length === STATUS_ORDER.length;
  const active = open || value.length > 0;

  const toggle = (v: StatusValue) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return 'All';
    return STATUS_ORDER
      .filter((s) => value.includes(s.value))
      .map((s) => s.label)
      .join(', ');
  }, [value]);

  const tooltipContent = useMemo(() => {
    if (value.length === 0) return 'Status: all';
    return `Status: ${triggerLabel}`;
  }, [value.length, triggerLabel]);

  return (
    <>
      <Tooltip content={tooltipContent} position="bottom">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={pillStyle(active)}
        >
          <span>{triggerLabel}</span>
          <AkChevronDownIcon label="" size="small" />
        </button>
      </Tooltip>
      <PopupShell open={open} pos={pos} popupRef={popupRef} width={200}>
        <div style={{ padding: '6px 0' }}>
          {STATUS_ORDER.map((opt) => (
            <CheckboxRow
              key={opt.value}
              checked={value.includes(opt.value)}
              label={opt.label}
              onToggle={() => toggle(opt.value)}
            />
          ))}
        </div>
      </PopupShell>
    </>
  );
}

// ───────────────────────── Product filter (search + multi-select) ─────────────────────────

export interface ProductOption {
  id: string;
  name: string;
  tag?: string;
}

export function ProductFilter({
  options,
  value,
  onChange,
  placeholder = 'Search products',
}: {
  options: ProductOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPopup(open, triggerRef);
  useDismiss(open, () => { setOpen(false); setQuery(''); }, triggerRef, popupRef);

  const active = open || value.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.tag?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  };

  const selectedNames = useMemo(
    () => value.map((id) => options.find((o) => o.id === id)?.name).filter(Boolean) as string[],
    [value, options],
  );

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return 'Product';
    return selectedNames.join(', ');
  }, [value.length, selectedNames]);

  const tooltipContent = value.length === 0
    ? 'Filter by product'
    : `Product: ${selectedNames.join(', ')}`;

  return (
    <>
      <Tooltip content={tooltipContent} position="bottom">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={pillStyle(active)}
        >
          <span>{triggerLabel}</span>
          <AkChevronDownIcon label="" size="small" />
        </button>
      </Tooltip>
      <PopupShell open={open} pos={pos} popupRef={popupRef} width={280}>
        <div style={{ padding: 8, borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
          <SearchInput value={query} onChange={setQuery} placeholder={placeholder} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              No matches
            </div>
          ) : (
            filtered.map((opt) => (
              <CheckboxRow
                key={opt.id}
                checked={value.includes(opt.id)}
                label={
                  <>
                    {opt.name}
                    {opt.tag && (
                      <span style={{ color: 'var(--ds-text-subtle, #626F86)' }}> ({opt.tag})</span>
                    )}
                  </>
                }
                onToggle={() => toggle(opt.id)}
              />
            ))
          )}
        </div>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => { onChange([]); setQuery(''); }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '10px 12px',
              borderTop: '1px solid var(--ds-border, #DFE1E6)',
              fontSize: 13,
              color: PILL_TEXT_ACTIVE,
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Clear selection
          </button>
        )}
      </PopupShell>
    </>
  );
}

// ───────────────────────── Group filter (single-select) ─────────────────────────

export type GroupValue = 'none' | 'status' | 'product' | 'release_date' | 'start_date';

const GROUP_OPTIONS: { value: GroupValue; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'product', label: 'Product' },
  { value: 'release_date', label: 'Release date' },
  { value: 'start_date', label: 'Start date' },
];

export function GroupFilter({
  value,
  onChange,
}: {
  value: GroupValue;
  onChange: (next: GroupValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPopup(open, triggerRef);
  useDismiss(open, () => setOpen(false), triggerRef, popupRef);

  const active = open || value !== 'none';
  const current = GROUP_OPTIONS.find((o) => o.value === value);
  const triggerLabel = value === 'none' ? 'Group' : `Group: ${current?.label ?? ''}`;
  const tooltipContent = value === 'none'
    ? 'Group releases'
    : `Grouped by ${current?.label ?? ''}`;

  return (
    <>
      <Tooltip content={tooltipContent} position="bottom">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={pillStyle(active)}
        >
          <span>{triggerLabel}</span>
          <AkChevronDownIcon label="" size="small" />
        </button>
      </Tooltip>
      <PopupShell open={open} pos={pos} popupRef={popupRef} width={200}>
        <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column' }}>
          {GROUP_OPTIONS.map((opt) => (
            <RadioRow
              key={opt.value}
              checked={value === opt.value}
              label={opt.label}
              onSelect={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopupShell>
    </>
  );
}

// ───────────────────────── Product select (single value, search) ─────────────────────────
// Single-select autofill — used inside forms (Create release modal, etc.).
// Trigger renders as a full-width form field: white bg, gray border idle,
// blue border on open. Selected value shown as plain text inside.

export function ProductSelect({
  options,
  value,
  onChange,
  placeholder = 'Select a product',
  searchPlaceholder = 'Search products',
  hasError = false,
  width = '100%',
  disabled = false,
}: {
  options: ProductOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  hasError?: boolean;
  width?: number | string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPopup(open, triggerRef);
  useDismiss(open, () => { setOpen(false); setQuery(''); }, triggerRef, popupRef);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.tag?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  const selected = options.find((o) => o.id === value) ?? null;

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width,
    height: 36,
    padding: '0 10px',
    borderRadius: 3,
    border: `1px solid ${open ? PILL_BLUE : hasError ? 'var(--ds-border-danger, #AE2A19)' : 'var(--ds-border, #DFE1E6)'}`,
    background: disabled ? 'var(--ds-background-disabled, #F1F2F4)' : 'var(--ds-surface, #FFFFFF)',
    color: disabled ? 'var(--ds-text-disabled, #A5ADBA)' : selected ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-subtlest, #6B778C)',
    fontSize: 14,
    fontWeight: 400,
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    outline: 'none',
    textAlign: 'left',
    boxShadow: open ? '0 0 0 1px rgba(24,104,219,0.2)' : 'none',
    opacity: disabled ? 0.7 : 1,
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        style={fieldStyle}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : placeholder}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear product"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(null);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              marginLeft: 8,
              borderRadius: 3,
              color: 'var(--ds-text-subtle, #6B778C)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)';
              (e.currentTarget as HTMLElement).style.color = 'var(--ds-text, #292A2E)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, #6B778C)';
            }}
          >
            <CrossIcon label="" size="small" />
          </span>
        )}
      </button>
      <PopupShell open={open} pos={pos} popupRef={popupRef} width={280}>
        <div style={{ padding: 8, borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
          <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              No matches
            </div>
          ) : (
            filtered.map((opt) => (
              <RadioRow
                key={opt.id}
                checked={value === opt.id}
                label={opt.tag ? `${opt.name} (${opt.tag})` : opt.name}
                onSelect={() => {
                  onChange(opt.id);
                  setOpen(false);
                  setQuery('');
                }}
              />
            ))
          )}
        </div>
      </PopupShell>
    </>
  );
}
