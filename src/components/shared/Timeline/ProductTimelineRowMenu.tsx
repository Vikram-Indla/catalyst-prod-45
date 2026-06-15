/**
 * ProductTimelineRowMenu — Jira-parity three-dots menu for the product
 * hub timeline. Replaces the default flat menu inside SidebarRow when
 * `menuVariant="product-jira"` is set on TimelineView.
 *
 * Structure (matches Jira BAU "Plan" timeline three-dots):
 *
 *   Create work item       ›   Create child work item     (parent only)
 *   Move work item         ›   Move to first / up / down / last
 *   Change parent work item ›  search popup with BR icons (child only)
 *   Change work item color ›   8-colour palette grid      (parent only)
 *   ───────────────────────────────────────────────────────
 *   Edit dates
 *   Remove dates           ›   Remove start / due / all   (only if dates)
 *   Edit dependencies
 *
 * The component owns its own submenu state. Edit dates / Change parent
 * search / Edit dependencies trigger callbacks back to SidebarRow which
 * owns the modals (existing EditDatesModal, parent-picker modal, deps
 * modal). Move / Change colour / Remove dates fire mutations directly.
 *
 * Submenus open on hover with a small delay (Jira's behaviour). Click is
 * also supported. Each submenu is its own document.body portal anchored
 * to the right edge of its parent row.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { JIRA_EPIC_COLORS, type TimelineIssue } from './types';

const MENU_W = 260;
const SUBMENU_OPEN_DELAY = 80;
const SUBMENU_CLOSE_DELAY = 140;

type SubmenuKey = 'create' | 'move' | 'changeParent' | 'color' | 'removeDates' | null;

export interface ProductTimelineRowMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  issue: TimelineIssue;
  /** Siblings in row order. Includes self. Used to compute first/last
   *  and to greying out Move boundary items. */
  siblings: TimelineIssue[];
  /** Top-level BR (or any row treated as a parent). Gates Create child,
   *  Change colour. Children get Change parent instead. */
  isParent: boolean;
  hasStartDate: boolean;
  hasDueDate: boolean;

  /* callbacks back to SidebarRow (modal owners). Change parent is now
   *  inline (search + list submenu) — its modal callback is gone. */
  onOpenCreateChild: () => void;
  onOpenEditDates: () => void;
  onOpenEditDependencies: () => void;

  /* mutations bound to this row's issueKey */
  onReorderSibling?: (direction: 'first' | 'up' | 'down' | 'last') => Promise<void>;
  onChangeColor?: (hex: string) => Promise<void>;
  onChangeParent?: (newParentKey: string) => Promise<void>;
  onRemoveStartDate?: () => Promise<void>;
  onRemoveDueDate?: () => Promise<void>;
  onRemoveAllDates?: () => Promise<void>;

  /** Candidates rendered in the Change parent submenu list. Filtered by
   *  the caller (SidebarRow) to exclude self and any obviously-invalid
   *  rows. The submenu's search input filters this list further by key
   *  and summary. */
  parentCandidates: TimelineIssue[];

  /* Jira-parity: every menu row is ALWAYS rendered; visibility flags
   *  here only control whether the row is interactive. A `false` value
   *  means the row is shown greyed out. Pass `true` when the action is
   *  available in this context. */
  showCreateChild: boolean;
  showChangeParent: boolean;
  showChangeColor: boolean;
  showMove: boolean;
  showEditDates: boolean;
  showRemoveDates: boolean;
  showEditDependencies: boolean;
}

const rowBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: 'var(--ds-font-family-body)',
  color: 'var(--ds-text, #172B4D)',
  cursor: 'pointer',
  userSelect: 'none',
  lineHeight: 1.3,
};

const submenuShellStyle: React.CSSProperties = {
  position: 'fixed',
  background: 'var(--ds-surface-overlay, #FFFFFF)',
  border: '1px solid var(--ds-border, #DFE1E6)',
  borderRadius: 6,
  boxShadow: '0 8px 28px var(--ds-shadow-overlay, rgba(9,30,66,0.25))',
  padding: '4px 0',
  zIndex: 10000,
  fontFamily: 'var(--ds-font-family-body)',
};

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function MenuRow({
  label,
  disabled = false,
  hasSubmenu = false,
  isActive = false,
  onClick,
  onMouseEnter,
  rowRef,
}: {
  label: string;
  disabled?: boolean;
  hasSubmenu?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  rowRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const showHover = !disabled && (hovered || isActive);
  return (
    <div
      ref={rowRef}
      role="menuitem"
      aria-disabled={disabled}
      aria-haspopup={hasSubmenu || undefined}
      onMouseDown={e => { /* portal click leaks through React tree to the
         row's onClick handler (React events follow React tree, not DOM).
         Swallow at mouseDown so the row's mousedown-bound handlers also
         don't see it. */
        e.stopPropagation();
      }}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        if (disabled) return;
        onClick?.();
      }}
      onMouseEnter={() => { setHovered(true); if (!disabled) onMouseEnter?.(); }}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...rowBaseStyle,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--ds-text-disabled, #A5ADBA)' : 'var(--ds-text, #172B4D)',
        background: showHover ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))' : 'transparent',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {hasSubmenu && (
        <span style={{ color: disabled ? 'var(--ds-text-disabled, #A5ADBA)' : 'var(--ds-text-subtlest, #626F86)', lineHeight: 0 }}>
          <ChevronRight />
        </span>
      )}
    </div>
  );
}

function Separator() {
  return <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />;
}

export function ProductTimelineRowMenu(props: ProductTimelineRowMenuProps) {
  const {
    isOpen, onClose, triggerRef, issue, siblings, isParent,
    hasStartDate, hasDueDate,
    onOpenCreateChild, onOpenEditDates, onOpenEditDependencies,
    onReorderSibling, onChangeColor, onChangeParent,
    onRemoveStartDate, onRemoveDueDate, onRemoveAllDates,
    parentCandidates,
    showCreateChild, showChangeParent, showChangeColor, showMove,
    showEditDates, showRemoveDates, showEditDependencies,
  } = props;

  const outerRef = useRef<HTMLDivElement>(null);
  const createRowRef = useRef<HTMLDivElement>(null);
  const moveRowRef = useRef<HTMLDivElement>(null);
  const parentRowRef = useRef<HTMLDivElement>(null);
  const colorRowRef = useRef<HTMLDivElement>(null);
  const removeDatesRowRef = useRef<HTMLDivElement>(null);

  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuKey>(null);
  const [parentSearch, setParentSearch] = useState('');
  const parentSearchInputRef = useRef<HTMLInputElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  /* outside-click + escape — capture phase so we close before any parent
     modal handler swallows Escape. */
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (outerRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      /* Any open submenu portal sits outside outerRef; ignore clicks on
         elements tagged data-ptrm-submenu. */
      const el = e.target as Element;
      if (el && el.closest && el.closest('[data-ptrm-submenu="true"]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  }, []);

  /* When the Change parent submenu opens, reset the search and autofocus
     the input so the user can start typing immediately. */
  useEffect(() => {
    if (activeSubmenu !== 'changeParent') return;
    setParentSearch('');
    const t = window.setTimeout(() => parentSearchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [activeSubmenu]);

  const filteredParents = useMemo(() => {
    if (!parentCandidates) return [];
    const q = parentSearch.trim().toLowerCase();
    if (!q) return parentCandidates.slice(0, 100);
    return parentCandidates.filter(c =>
      c.issueKey.toLowerCase().includes(q) || (c.summary ?? '').toLowerCase().includes(q),
    ).slice(0, 100);
  }, [parentCandidates, parentSearch]);

  const handlePickParent = async (newKey: string) => {
    setActiveSubmenu(null);
    onClose();
    if (!onChangeParent) return;
    try { await onChangeParent(newKey); }
    catch (err) { console.warn('change parent failed:', err); }
  };

  const scheduleOpen = useCallback((key: SubmenuKey) => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setActiveSubmenu(key), SUBMENU_OPEN_DELAY);
  }, []);

  const scheduleClose = useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setActiveSubmenu(null), SUBMENU_CLOSE_DELAY);
  }, []);

  if (!isOpen || !triggerRef.current) return null;

  const triggerRect = triggerRef.current.getBoundingClientRect();
  /* anchor right-aligned to the trigger (Jira parity — the menu opens
     leftwards from the ⋯ button so it sits within the sidebar column). */
  const outerTop = triggerRect.bottom + 4;
  const outerRight = window.innerWidth - triggerRect.right;

  /* Move boundary computation — index in the parent's sibling list. When
     siblings has 0 or 1 item, every option is disabled (nothing to reorder). */
  const idx = siblings.findIndex(s => s.issueKey === issue.issueKey);
  const isAtFirst = idx <= 0;
  const isAtLast = idx === -1 || idx >= siblings.length - 1;
  const onlyOne = siblings.length <= 1;

  const handleReorder = async (direction: 'first' | 'up' | 'down' | 'last') => {
    setActiveSubmenu(null);
    onClose();
    if (!onReorderSibling) return;
    try { await onReorderSibling(direction); }
    catch (err) { console.warn('reorder failed:', err); }
  };

  const handleColor = async (hex: string) => {
    setActiveSubmenu(null);
    onClose();
    if (!onChangeColor) return;
    try { await onChangeColor(hex); }
    catch (err) { console.warn('color change failed:', err); }
  };

  const handleRemove = async (which: 'start' | 'due' | 'all') => {
    setActiveSubmenu(null);
    onClose();
    try {
      if (which === 'start' && onRemoveStartDate) await onRemoveStartDate();
      else if (which === 'due' && onRemoveDueDate) await onRemoveDueDate();
      else if (which === 'all' && onRemoveAllDates) await onRemoveAllDates();
    } catch (err) { console.warn('remove dates failed:', err); }
  };

  /* ─── outer menu ─── */
  const outerMenu = (
    <div
      ref={outerRef}
      role="menu"
      aria-label={`Actions for ${issue.issueKey}`}
      data-ptrm-outer="true"
      style={{
        ...submenuShellStyle,
        top: outerTop,
        right: outerRight,
        minWidth: MENU_W,
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onMouseLeave={scheduleClose}
    >
      <MenuRow
        label="Create work item"
        hasSubmenu
        isActive={activeSubmenu === 'create'}
        rowRef={createRowRef}
        disabled={!showCreateChild}
        onMouseEnter={() => scheduleOpen('create')}
        onClick={() => setActiveSubmenu('create')}
      />
      <MenuRow
        label="Move work item"
        hasSubmenu
        isActive={activeSubmenu === 'move'}
        rowRef={moveRowRef}
        disabled={!showMove || onlyOne}
        onMouseEnter={() => scheduleOpen('move')}
        onClick={() => setActiveSubmenu('move')}
      />
      <MenuRow
        label="Change parent work item"
        hasSubmenu
        isActive={activeSubmenu === 'changeParent'}
        rowRef={parentRowRef}
        disabled={!showChangeParent}
        onMouseEnter={() => scheduleOpen('changeParent')}
        onClick={() => setActiveSubmenu('changeParent')}
      />
      <MenuRow
        label="Change work item color"
        hasSubmenu
        isActive={activeSubmenu === 'color'}
        rowRef={colorRowRef}
        disabled={!showChangeColor}
        onMouseEnter={() => scheduleOpen('color')}
        onClick={() => setActiveSubmenu('color')}
      />
      <Separator />
      <MenuRow
        label="Edit dates"
        disabled={!showEditDates}
        onMouseEnter={() => { setActiveSubmenu(null); }}
        onClick={() => { setActiveSubmenu(null); onClose(); onOpenEditDates(); }}
      />
      <MenuRow
        label="Remove dates"
        hasSubmenu
        isActive={activeSubmenu === 'removeDates'}
        rowRef={removeDatesRowRef}
        disabled={!showRemoveDates || (!hasStartDate && !hasDueDate)}
        onMouseEnter={() => scheduleOpen('removeDates')}
        onClick={() => setActiveSubmenu('removeDates')}
      />
      <MenuRow
        label="Edit dependencies"
        disabled={!showEditDependencies}
        onMouseEnter={() => { setActiveSubmenu(null); }}
        onClick={() => { setActiveSubmenu(null); onClose(); onOpenEditDependencies(); }}
      />
    </div>
  );

  /* ─── submenus ─── */
  const submenuPos = (anchorRef: React.RefObject<HTMLDivElement | null>) => {
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return { top: 0, left: 0 };
    return {
      top: r.top - 4,
      left: r.left - 4,    /* overlap parent row slightly so cursor can travel */
      anchorRight: r.left, /* fallback to right side if not enough room */
    };
  };

  const renderSubmenuPortal = (
    key: SubmenuKey,
    anchorRef: React.RefObject<HTMLDivElement | null>,
    width: number,
    content: React.ReactNode,
  ) => {
    if (activeSubmenu !== key || !anchorRef.current) return null;
    const r = anchorRef.current.getBoundingClientRect();
    /* prefer right side; fall back left if it would overflow viewport */
    const fitsRight = r.right + 4 + width < window.innerWidth - 8;
    const top = r.top;
    const pos = fitsRight
      ? { top, left: r.right + 4 }
      : { top, right: window.innerWidth - r.left + 4 };
    return createPortal(
      <div
        data-ptrm-submenu="true"
        role="menu"
        /* Fixed width — submenus must NOT stretch to fit their widest row,
           or long titles (e.g. Arabic BR summaries) push the panel to
           viewport-wide. The list inside ellipsizes per row. */
        style={{ ...submenuShellStyle, ...pos, width, maxWidth: width }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => { window.clearTimeout(closeTimer.current); }}
        onMouseLeave={scheduleClose}
      >
        {content}
      </div>,
      document.body,
    );
  };

  const createSubmenu = renderSubmenuPortal('create', createRowRef, 200, (
    <MenuRow
      label="Create child work item"
      onClick={() => { setActiveSubmenu(null); onClose(); onOpenCreateChild(); }}
    />
  ));

  const moveSubmenu = renderSubmenuPortal('move', moveRowRef, 180, (
    <>
      <MenuRow label="Move to first" disabled={onlyOne || isAtFirst} onClick={() => handleReorder('first')} />
      <MenuRow label="Move up" disabled={onlyOne || isAtFirst} onClick={() => handleReorder('up')} />
      <MenuRow label="Move down" disabled={onlyOne || isAtLast} onClick={() => handleReorder('down')} />
      <MenuRow label="Move to last" disabled={onlyOne || isAtLast} onClick={() => handleReorder('last')} />
    </>
  ));

  const colorSubmenu = renderSubmenuPortal('color', colorRowRef, 220, (
    <div style={{ padding: '8px 12px' }}>
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: 'var(--ds-text-subtlest, #6B778C)',
        marginBottom: 8,
      }}>
        Work item color
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 24px)', gap: 8 }}>
        {JIRA_EPIC_COLORS.map(({ label, hex }) => {
          const selected = issue.epicColor === hex;
          return (
            <button
              key={hex}
              type="button"
              title={label}
              aria-label={`Set color to ${label}`}
              aria-pressed={selected}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); handleColor(hex); }}
              style={{
                width: 24, height: 24, borderRadius: 4, padding: 0, cursor: 'pointer',
                background: hex,
                border: selected
                  ? '2px solid var(--ds-border-selected, #0052CC)'
                  : '1px solid var(--ds-border, #DFE1E6)',
                outline: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 6l2.5 2.5L10 3"
                    stroke="var(--ds-text-inverse, #FFFFFF)" strokeWidth="2"
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {issue.epicColor && (
        <button
          type="button"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); handleColor(''); }}
          style={{
            marginTop: 8, padding: '4px 8px',
            background: 'transparent', border: 'none',
            color: 'var(--ds-text-subtle, #44546F)',
            fontSize: 12, fontFamily: 'var(--ds-font-family-body)',
            cursor: 'pointer', borderRadius: 3,
          }}
        >
          Remove color
        </button>
      )}
    </div>
  ));

  const removeDatesSubmenu = renderSubmenuPortal('removeDates', removeDatesRowRef, 200, (
    <>
      <MenuRow
        label="Remove start date"
        disabled={!hasStartDate}
        onClick={() => handleRemove('start')}
      />
      <MenuRow
        label="Remove due date"
        disabled={!hasDueDate}
        onClick={() => handleRemove('due')}
      />
      <MenuRow
        label="Remove all dates"
        disabled={!hasStartDate && !hasDueDate}
        onClick={() => handleRemove('all')}
      />
    </>
  ));

  /* Change parent submenu — Jira parity (Image #22 / #29). Search input on
     top, scrollable list of candidate parents below. Each row mounts a
     JiraIssueTypeIcon + key + summary. Click commits the new parent. */
  const changeParentSubmenu = renderSubmenuPortal('changeParent', parentRowRef, 320, (
    <div style={{ padding: 4, fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ padding: '4px 8px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 8px',
          border: '1.5px solid var(--ds-border-focused, #388BFF)',
          borderRadius: 4, height: 36,
          background: 'var(--ds-background-input, #FFFFFF)',
        }}>
          <span style={{ color: 'var(--ds-text-subtle, #44546F)', lineHeight: 0, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            ref={parentSearchInputRef}
            value={parentSearch}
            onChange={e => setParentSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && filteredParents[0]) {
                e.preventDefault();
                handlePickParent(filteredParents[0].issueKey);
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setActiveSubmenu(null);
              }
            }}
            placeholder="Search work items"
            aria-label="Search work items"
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: 14, fontFamily: 'var(--ds-font-family-body)',
              color: 'var(--ds-text, #172B4D)',
              padding: 0, minWidth: 0,
            }}
          />
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)' }} />
      <div role="listbox" style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
        {filteredParents.length === 0 ? (
          <div style={{
            padding: '16px 12px', textAlign: 'center', fontSize: 13,
            color: 'var(--ds-text-subtlest, #626F86)', fontStyle: 'italic',
          }}>
            No matching work items
          </div>
        ) : (
          filteredParents.map(c => (
            <ParentRow key={c.issueKey} candidate={c} onPick={() => handlePickParent(c.issueKey)} />
          ))
        )}
      </div>
    </div>
  ));

  return createPortal(
    <>
      {outerMenu}
      {createSubmenu}
      {moveSubmenu}
      {colorSubmenu}
      {removeDatesSubmenu}
      {changeParentSubmenu}
    </>,
    document.body,
  );
}

function ParentRow({ candidate, onPick }: { candidate: TimelineIssue; onPick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="option"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); e.preventDefault(); onPick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', cursor: 'pointer',
        background: hovered ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))' : 'transparent',
        fontFamily: 'var(--ds-font-family-body)',
      }}
    >
      <span style={{ flexShrink: 0, display: 'inline-flex' }}>
        <JiraIssueTypeIcon type={candidate.issueType} size={16} />
      </span>
      <span style={{
        fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {candidate.issueKey}
      </span>
      <span style={{
        fontSize: 14, color: 'var(--ds-text, #172B4D)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
      }}>
        {candidate.summary}
      </span>
    </div>
  );
}

export default ProductTimelineRowMenu;
