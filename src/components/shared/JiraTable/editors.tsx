// @ts-nocheck
/**
 * JiraTable -- canonical inline editors.
 *
 * Editors expose a clickable cell that opens a popover with options. The
 * popover content is built ENTIRELY from @atlaskit/* primitives:
 *   - @atlaskit/lozenge   (status pills in cell + menu)
 *   - @atlaskit/avatar    (assignee picker rows)
 *   - @atlaskit/inline-edit + @atlaskit/textfield  (Summary inline edit)
 *
 * The popover POSITIONING uses a manual conditional-render with
 * absolute positioning. We tried @atlaskit/popup and @atlaskit/dropdown-menu
 * first — both render fine in SubtasksPanel but silently produce no content
 * in the Story Backlog surface. The surface-specific provider issue is
 * tracked separately; using a simple controlled wrapper is the pragmatic
 * choice and keeps the entire visible UI Atlaskit-native.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Popup from '@atlaskit/popup';
import Tooltip from '@atlaskit/tooltip';
import { DatePicker } from '@atlaskit/datetime-picker';
import { token } from '@atlaskit/tokens';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkMoreIcon from '@atlaskit/icon/glyph/more';
import AkPriorityCriticalIcon from '@atlaskit/icon/core/priority-critical';
import AkPriorityHighestIcon from '@atlaskit/icon/core/priority-highest';
import AkPriorityHighIcon from '@atlaskit/icon/core/priority-high';
import AkPriorityMediumIcon from '@atlaskit/icon/core/priority-medium';
import AkPriorityLowIcon from '@atlaskit/icon/core/priority-low';
import AkPriorityLowestIcon from '@atlaskit/icon/core/priority-lowest';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkLinkExternalIcon from '@atlaskit/icon/core/link-external';
import AkAddIcon from '@atlaskit/icon/core/add';
import { StatusPill } from './cells';
import type { CellProps, LozengeAppearance } from './types';

/* ─── Tiny popover used by every editor ────────────────────────────────────
   Portals to document.body so we escape the table's overflow:hidden cells.
   Position is computed from the trigger's getBoundingClientRect each open. */

interface EditorPopoverProps {
  trigger: (props: { onClick: (e: React.MouseEvent) => void; isOpen: boolean; ref: React.Ref<HTMLButtonElement> }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  width?: number;
  align?: 'start' | 'end';
}

function EditorPopover({ trigger, children, width = 240, align = 'start' }: EditorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Compute popover position when opening / on resize / scroll.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const t = triggerRef.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      setAnchor({ top: r.bottom + 4, left: r.left, right: window.innerWidth - r.right });
    };
    update();
    const ro = window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen]);

  // Outside-click + Esc.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      // Don't close if click landed inside an Atlaskit portal child (e.g. DatePicker
      // calendar, Select dropdown) — those render outside popRef in .atlaskit-portal-container.
      if (document.querySelector('.atlaskit-portal-container')?.contains(target)) return;
      setIsOpen(false);
    };
    // Capture-phase so Escape closes the popover before any parent modal's
    // bubble-phase Escape handler fires (prevents CatalystViewBase modal
    // or @atlaskit/modal-dialog from closing when user dismisses popover).
    // Per CLAUDE.md 2026-05-08 WatchersChip lesson.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setIsOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen]);

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: (e) => { e.stopPropagation(); setIsOpen(v => !v); },
        isOpen,
      })}
      {isOpen && anchor && createPortal(
        <div
          ref={popRef}
          role="menu"
          data-jira-table-editor
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: anchor.top,
            ...(align === 'end' ? { right: anchor.right } : { left: anchor.left }),
            zIndex: 1000,
            minWidth: width,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 1px 1px rgba(9,30,66,0.25), 0 8px 24px -4px rgba(9,30,66,0.18)'),
            padding: 4,
            maxHeight: 360,
            overflowY: 'auto',
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            color: '#292A2E',
          }}
        >
          {children(close)}
        </div>,
        document.body,
      )}
    </>
  );
}

function MenuItemBtn({
  onClick, children, active,
}: { onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 8px',
        border: 'none',
        background: active ? token('color.background.selected', '#E9F2FF') : 'transparent',
        color: '#292A2E',
        fontSize: 14,
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        borderRadius: 3,
        outline: 'none',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '8px 10px 4px',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: token('color.text.subtlest', '#6B778C'),
    }}>{children}</div>
  );
}

/* ─── Status editor ─────────────────────────────────────────────────────── */

export interface StatusOption {
  value: string;
  label: string;
  appearance: LozengeAppearance;
  group?: string;
}

export function makeStatusEditCell<T>({
  getStatus,
  appearanceFor,
  labelFor,
  options,
  canEdit,
  onChange,
}: {
  getStatus: (row: T) => string | null;
  appearanceFor: (status: string | null) => LozengeAppearance;
  labelFor?: (status: string | null) => string;
  options: StatusOption[];
  canEdit?: (row: T) => boolean;
  onChange: (row: T, next: string) => void;
}) {
  // Group options by `group` field
  const grouped: Record<string, StatusOption[]> = {};
  for (const opt of options) {
    const k = opt.group || '';
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(opt);
  }
  const groupKeys = Object.keys(grouped);

  return function StatusEditCell({ row }: CellProps<T>) {
    const status = getStatus(row);
    const editable = canEdit ? canEdit(row) : true;

    // Non-editable + empty: just a dash, no affordance.
    if (!status && !editable) return <span style={{ color: token('color.text.subtlest', '#7A869A') }}>—</span>;

    const lozenge = status ? (
      <StatusPill appearance={appearanceFor(status)}>
        {labelFor ? labelFor(status) : status}
      </StatusPill>
    ) : null;

    if (!editable && lozenge) return lozenge;

    // Editable trigger — renders a Lozenge if status set, or a "Set status"
    // ghost label if empty. Whole-cell hover tint is driven by the
    // `data-jira-cell-editor` attribute (handled by JiraTable.tsx CSS).
    return (
      <EditorPopover
        width={260}
        trigger={({ onClick, isOpen, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-expanded={isOpen}
            data-jira-cell-editor
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              margin: '-2px -4px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {lozenge ?? (
              <span data-jira-cell-ghost style={{ fontSize: 13 }}>
                Set status
              </span>
            )}
            {/* status chevron ▾ — Jira parity */}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden style={{ flexShrink: 0, opacity: 0.55, marginLeft: 1 }}>
              <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      >
        {(close) =>
          groupKeys.map((g) => (
            <div key={g || '__none'}>
              {g && <MenuLabel>{g}</MenuLabel>}
              {grouped[g].map((opt) => (
                <MenuItemBtn
                  key={opt.value}
                  active={opt.value === status}
                  onClick={() => { onChange(row, opt.value); close(); }}
                >
                  <StatusPill appearance={opt.appearance}>{opt.label}</StatusPill>
                </MenuItemBtn>
              ))}
            </div>
          ))
        }
      </EditorPopover>
    );
  };
}

/* ─── Status editor (Atlaskit Popup variant — B.4 trial) ───────────────────
   Same API as makeStatusEditCell but built on @atlaskit/popup. The handover
   (§5a) noted that Popup didn't render content in this surface pre-ADS.
   Phase A activated proper ADS token inheritance; this trial tests whether
   Popup now works so we can sweep the other editors off the bespoke portal.

   ── Rules-of-Hooks note ──
   The caller (BacklogPage) rebuilds its `columns` useMemo any time filter/
   selection/etc. state changes. Each rebuild calls the factory and gets a
   fresh component-function identity. Hooks inside a renamed-on-every-render
   component can trigger "Rendered fewer hooks than expected" under React 18.
   To keep hook identity stable we split the render path into a module-level
   inner component (StatusPopupCell) that owns the useState. The exported
   factory closes over options/handlers via props instead of closure. */

interface StatusPopupCellProps<T> {
  row: T;
  status: string | null;
  editable: boolean;
  lozenge: React.ReactNode | null;
  groupKeys: string[];
  grouped: Record<string, StatusOption[]>;
  onChange: (row: T, next: string) => void;
}

function StatusPopupCell<T>({
  row,
  status,
  editable,
  lozenge,
  groupKeys,
  grouped,
  onChange,
}: StatusPopupCellProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  if (!status && !editable) return <span style={{ color: token('color.text.subtlest', '#7A869A') }}>—</span>;
  if (!editable && lozenge) return <>{lozenge}</>;

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      content={() => (
        <div
          role="menu"
          data-jira-table-editor
          style={{
            minWidth: 260,
            padding: 4,
            maxHeight: 360,
            overflowY: 'auto',
            color: '#292A2E',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {groupKeys.map((g) => (
            <div key={g || '__none'}>
              {g && <MenuLabel>{g}</MenuLabel>}
              {grouped[g].map((opt) => (
                <MenuItemBtn
                  key={opt.value}
                  active={opt.value === status}
                  onClick={() => { onChange(row, opt.value); setIsOpen(false); }}
                >
                  <StatusPill appearance={opt.appearance}>{opt.label}</StatusPill>
                </MenuItemBtn>
              ))}
            </div>
          ))}
        </div>
      )}
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
          aria-expanded={isOpen}
          data-jira-cell-editor
          style={{
            background: 'transparent',
            border: 'none',
            padding: '2px 4px',
            margin: '-2px -4px',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {lozenge ?? (
            <span data-jira-cell-ghost style={{ fontSize: 13 }}>
              Set status
            </span>
          )}
        </button>
      )}
    />
  );
}

export function makeStatusEditCellAkPopup<T>({
  getStatus,
  appearanceFor,
  labelFor,
  options,
  canEdit,
  onChange,
}: {
  getStatus: (row: T) => string | null;
  appearanceFor: (status: string | null) => LozengeAppearance;
  labelFor?: (status: string | null) => string;
  options: StatusOption[];
  canEdit?: (row: T) => boolean;
  onChange: (row: T, next: string) => void;
}) {
  const grouped: Record<string, StatusOption[]> = {};
  for (const opt of options) {
    const k = opt.group || '';
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(opt);
  }
  const groupKeys = Object.keys(grouped);

  // Cell renderer is a thin wrapper: it computes derived values from the row
  // and hands them to the stable StatusPopupCell component below. This keeps
  // hook identity stable across columns-memo rebuilds.
  return function StatusEditCellAkPopupCell({ row }: CellProps<T>) {
    const status = getStatus(row);
    const editable = canEdit ? canEdit(row) : true;
    const lozenge = status ? (
      <StatusPill appearance={appearanceFor(status)}>
        {labelFor ? labelFor(status) : status}
      </StatusPill>
    ) : null;
    return (
      <StatusPopupCell<T>
        row={row}
        status={status}
        editable={editable}
        lozenge={lozenge}
        groupKeys={groupKeys}
        grouped={grouped}
        onChange={onChange}
      />
    );
  };
}

/* ─── Summary editor (Atlaskit InlineEdit) ──────────────────────────────── */

export function makeSummaryInlineEditCell<T>({
  getSummary,
  canEdit,
  getReadOnlyTooltip,
  onChange,
  onOpenWorkItem,
  onCreateChild,
  canCreateChild,
}: {
  getSummary: (row: T) => string;
  canEdit?: (row: T) => boolean;
  /**
   * Optional read-only affordance. When `canEdit(row) === false`, the cell
   * is rendered as a non-editable display. Without an affordance the user
   * has no signal that the cell is intentionally inert (audit P1, see
   * .catalyst/audits/jira-compare/2026-04-26-bau-backlog/A-finding.md).
   *
   * If this returns a non-null string, the read-only branch wraps the
   * summary in @atlaskit/tooltip with that text as `content`, and the
   * span gets `cursor: not-allowed`. Returning null/undefined keeps the
   * legacy bare-span behaviour.
   *
   * Spec: https://atlassian.design/components/tooltip
   */
  getReadOnlyTooltip?: (row: T) => string | null;
  onChange: (row: T, next: string) => void;
  /**
   * 2026-05-12 Jira parity: row hover reveals ↗ "Open work item" button at
   * the right edge of the Summary cell. Opens detail in full-width view.
   * When omitted, button is not rendered (back-compat for other surfaces).
   */
  onOpenWorkItem?: (row: T) => void;
  /**
   * 2026-05-12 Jira parity: row hover reveals + "Create child item" button.
   * When omitted, button is not rendered. canCreateChild gate filters per row.
   */
  onCreateChild?: (row: T) => void;
  canCreateChild?: (row: T) => boolean;
}) {
  return function SummaryInlineEditCell({ row }: CellProps<T>) {
    const summary = getSummary(row);
    const editable = canEdit ? canEdit(row) : true;

    if (!editable) {
      const readOnlyTooltip = getReadOnlyTooltip?.(row) ?? null;
      const display = (
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            // Affordance: when a tooltip explains the read-only state,
            // pair it with cursor: not-allowed so the inert cell is
            // discoverable on hover (not just via tooltip delay).
            cursor: readOnlyTooltip ? 'not-allowed' : undefined,
            // Jira-parity: summary text color = --ds-text-subtle (rgb 80,82,88)
            color: 'var(--ds-text-subtle, #505258)',
          }}
        >
          {summary}
        </span>
      );

      if (!readOnlyTooltip) return display;

      return (
        <Tooltip content={readOnlyTooltip} position="top">
          {(tooltipProps) => (
            <span
              {...tooltipProps}
              style={{ display: 'block', width: '100%', cursor: 'not-allowed' }}
            >
              {display}
            </span>
          )}
        </Tooltip>
      );
    }

    // 2026-05-12 Jira parity: row hover reveals ↗ "Open work item" and
    // + "Create child item" buttons on the right edge of the Summary cell.
    // CSS in JiraTable.tsx ([data-jira-row-hover-action]) handles visibility
    // via tr:hover (matches the .jira-drag-handle pattern at line 784).
    const showOpen = !!onOpenWorkItem;
    const showCreateChild = !!onCreateChild && (canCreateChild ? canCreateChild(row) : true);
    const showHoverActions = showOpen || showCreateChild;

    return (
      <span
        data-jira-table-editor
        data-jira-cell-editor
        data-jira-cell-summary
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
        }}
      >
        <div
          className="cv-cell-inline-edit-no-label"
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}
        >
          <InlineEdit<string>
            // Fix #2 (iter-9): Atlaskit InlineEdit defaults to fit-content
            // sizing on its readView container. Without this prop the inner
            // span's max-width: 100% resolves against a shrunk wrapper and
            // "Test, 25 April." renders as "Test, 25 A...".
            readViewFitContainerWidth
            // Bug 3 fix (2026-06-16): Atlaskit InlineEdit's `defaultValue` is
            // uncontrolled — it pins the initial value on first mount and
            // never re-syncs even when the prop changes. This caused stale
            // values to appear in editView after the parent updated. Keying
            // the InlineEdit on the current summary remounts it whenever the
            // underlying value actually changes (i.e. after a successful
            // save), restoring the correct edit baseline.
            key={summary}
            defaultValue={summary}
            editView={({ errorMessage, ...fieldProps }) => (
              <Textfield {...fieldProps} autoFocus />
            )}
            readView={() => (
              <span
                title={summary || undefined}
                style={{
                  display: 'block',
                  padding: '0 2px',
                  borderRadius: 3,
                  // Jira-parity: summary cell shows text cursor on hover (measured
                  // 2026-05-08 from digital-transformation.atlassian.net BAU list —
                  // cursor: text on the .text-cell-wrapper span, matching the
                  // "click anywhere in cell to edit" UX pattern). Previously used
                  // cursor: pointer which implies a navigation action, not a text edit.
                  cursor: 'text',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  // 2026-05-08 DOM probe: Jira summary = rgb(80,82,88) = --ds-text-subtle.
                  // Inheriting --ds-text (rgb 41,42,46) from tbody td baseline was wrong.
                  color: 'var(--ds-text-subtle, #505258)',
                  // 2026-06-11: lineHeight 1.4 (was 1) so the descenders of g/y/p/q/j
                  // are not clipped by the overflow:hidden parent. Combined with
                  // the .cv-cell-inline-edit-no-label override that zeros the
                  // Atlaskit 2px transparent border on the readView wrapper, the
                  // title now sits at the same vertical centre as the icon and key.
                  lineHeight: 1.4,
                }}
              >
                {summary || (
                  <span data-jira-cell-ghost>
                    Click to add summary
                  </span>
                )}
              </span>
            )}
            onConfirm={(value) => {
              if (value !== undefined && value !== summary) onChange(row, value);
            }}
          />
        </div>
        {showHoverActions && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              flexShrink: 0,
            }}
          >
            {showOpen && (
              <Tooltip content="Open in side panel" position="top">
                <button
                  type="button"
                  data-jira-row-hover-action
                  aria-label="Open in side panel"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onOpenWorkItem!(row);
                  }}
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    padding: 0,
                    border: '1px solid transparent',
                    background: 'transparent',
                    borderRadius: 3,
                    cursor: 'pointer',
                    color: 'var(--ds-text-subtle, #505258)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                    <line x1="17.5" y1="8" x2="19" y2="8" />
                    <line x1="17.5" y1="12" x2="19" y2="12" />
                    <line x1="17.5" y1="16" x2="19" y2="16" />
                  </svg>
                </button>
              </Tooltip>
            )}
            {showCreateChild && (
              <Tooltip content="Create child item" position="top">
                <button
                  type="button"
                  data-jira-row-hover-action
                  aria-label="Create child item"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onCreateChild!(row);
                  }}
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    padding: 0,
                    border: '1px solid transparent',
                    background: 'transparent',
                    borderRadius: 3,
                    cursor: 'pointer',
                    color: 'var(--ds-text-subtle, #505258)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  <AkAddIcon label="" />
                </button>
              </Tooltip>
            )}
          </span>
        )}
      </span>
    );
  };
}

/* ─── Assignee editor ───────────────────────────────────────────────────── */

export interface AssigneeChoice {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export function makeAssigneeEditCell<T>({
  getAssignee,
  options,
  canEdit,
  onChange,
}: {
  getAssignee: (row: T) => AssigneeChoice | null;
  options: AssigneeChoice[];
  canEdit?: (row: T) => boolean;
  onChange: (row: T, next: AssigneeChoice | null) => void;
}) {
  return function AssigneeEditCell({ row }: CellProps<T>) {
    // All hooks FIRST (Rules of Hooks — no early returns before hooks).
    const [search, setSearch] = useState('');
    const q = search.trim().toLowerCase();
    const filtered = useMemo(
      () => (q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options),
      [q, options],
    );

    const a = getAssignee(row);
    const editable = canEdit ? canEdit(row) : true;

    const display = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
        {a ? (
          <>
            <Avatar size="small" name={a.name} src={a.avatarUrl || undefined} appearance="circle" />
            <span
              style={{
                color: '#292A2E',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.name}
            </span>
          </>
        ) : (
          <>
            <Avatar size="small" appearance="circle" />
            <span data-jira-cell-ghost>Unassigned</span>
          </>
        )}
      </span>
    );

    if (!editable) return display;

    return (
      <EditorPopover
        width={280}
        trigger={({ onClick, isOpen, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-expanded={isOpen}
            data-jira-cell-editor
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 6px',
              margin: '-2px -6px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
          >
            {display}
          </button>
        )}
      >
        {(close) => (
          <>
            <div style={{ padding: 4 }}>
              <Textfield
                isCompact
                autoFocus
                placeholder="Search people"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                elemBeforeInput={
                  <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                    <AkSearchIcon label="" size="small" />
                  </span>
                }
              />
            </div>
            <MenuItemBtn onClick={() => { onChange(row, null); close(); }}>
              <Avatar size="small" appearance="circle" />
              <span style={{ color: token('color.text.subtlest', '#7A869A') }}>Unassigned</span>
            </MenuItemBtn>
            {filtered.slice(0, 12).map((opt) => (
              <MenuItemBtn
                key={opt.id}
                active={a?.id === opt.id}
                onClick={() => { onChange(row, opt); close(); }}
              >
                <Avatar size="small" name={opt.name} src={opt.avatarUrl || undefined} appearance="circle" />
                <span>{opt.name}</span>
              </MenuItemBtn>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 13, color: token('color.text.subtlest', '#7A869A') }}>No matches</div>
            )}
          </>
        )}
      </EditorPopover>
    );
  };
}

/* ─── Priority editor ───────────────────────────────────────────────────── */

// Jira-parity priority display: icon + text label.
// Measured from digital-transformation.atlassian.net BAU list 2026-05-04:
//   Priority cell shows icon (16px) + label text at 14px, inline-flex, gap 4px.
//   Colors: Highest=#E5484D Highest/Critical, High=#E2730D, Medium=var(--cp-warning, #D97706),
//   Low=#0065FF, Lowest=#7A869A. No colored bars — text label is the primary affordance.
const PRIORITY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  critical:  { icon: <AkPriorityCriticalIcon label="" size="small" />, color: '#E5484D', label: 'Critical'  },
  highest:   { icon: <AkPriorityHighestIcon  label="" size="small" />, color: '#E5484D', label: 'Highest'   },
  high:      { icon: <AkPriorityHighIcon     label="" size="small" />, color: '#E2730D', label: 'High'      },
  medium:    { icon: <AkPriorityMediumIcon   label="" size="small" />, color: 'var(--cp-warning, #D97706)', label: 'Medium'    },
  low:       { icon: <AkPriorityLowIcon      label="" size="small" />, color: '#0065FF', label: 'Low'       },
  lowest:    { icon: <AkPriorityLowestIcon   label="" size="small" />, color: '#7A869A', label: 'Lowest'    },
};

function PriorityBars({ priority }: { priority: string | null }) {
  const p = (priority || '').toLowerCase();
  const cfg = PRIORITY_CONFIG[p];
  if (!cfg) {
    return (
      <span style={{ color: token('color.text.subtlest', '#7A869A'), fontSize: 14 }}>—</span>
    );
  }
  return (
    <span
      title={cfg.label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: cfg.color, fontSize: 14, whiteSpace: 'nowrap' }}
    >
      {cfg.icon}
      <span style={{ color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))') }}>{cfg.label}</span>
    </span>
  );
}

export function makePriorityEditCell<T>({
  getPriority,
  canEdit,
  onChange,
  options = ['critical', 'high', 'medium', 'low', 'lowest'],
}: {
  getPriority: (row: T) => string | null;
  canEdit?: (row: T) => boolean;
  onChange: (row: T, next: string) => void;
  options?: string[];
}) {
  return function PriorityEditCell({ row }: CellProps<T>) {
    const p = getPriority(row);
    const editable = canEdit ? canEdit(row) : true;
    const display = <PriorityBars priority={p} />;

    if (!editable) return display;

    return (
      <EditorPopover
        width={200}
        trigger={({ onClick, isOpen, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-expanded={isOpen}
            data-jira-cell-editor
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              margin: '-2px -4px',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            {display}
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>Priority</MenuLabel>
            {options.map((opt) => (
              <MenuItemBtn
                key={opt}
                active={(p || '').toLowerCase() === opt}
                onClick={() => { onChange(row, opt); close(); }}
              >
                <PriorityBars priority={opt} />
                <span>{opt[0].toUpperCase() + opt.slice(1)}</span>
              </MenuItemBtn>
            ))}
          </>
        )}
      </EditorPopover>
    );
  };
}

/* ─── Parent picker editor ──────────────────────────────────────────────── */

export interface ParentChoice {
  id: string;
  key: string | null;
  label: string;
  /** Parent's work-item type icon (Epic / Story / MDT Business Request / …).
   *  Rendered inline with the key so the chip matches Jira's list view. */
  icon?: React.ReactNode;
}

// Chip style used for the selected parent AND for options in the dropdown.
// Measured directly from Jira's production list view on
// digital-transformation.atlassian.net on 2026-04-18:
//   background: rgb(34, 125, 155)  // #227D9B — Jira's "epic parent" teal
//   color:      var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))
//   padding:    2px 4px
//   border-radius: 3px
//   font-size:  14px (we use 13 to match our compact row density)
//   font-weight: 400
function ParentChip({ choice }: { choice: { key: string | null; label: string; icon?: React.ReactNode } }) {
  const display = choice.key ? `${choice.key} ${choice.label}` : choice.label;
  // Apr 27, 2026 (L64): switched from Atlaskit Lozenge to a plain
  // bordered chip matching the table baseline (14/20/400, normal-case).
  // The Lozenge was rendering 11px/653/UPPERCASE — visually different
  // from every other cell in the table. Per Jira-parity spec for
  // Parent/Hierarchy fields: 14/20/400, key in `color.link`, label in
  // `color.text`, single-line ellipsis. Catalyst now matches.
  return (
    <span
      title={display}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: 260,
        padding: '2px 8px',
        border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
        borderRadius: 3,
        fontSize: 14,
        lineHeight: '20px',
        fontWeight: 400,
        color: token('color.text', '#292A2E'),
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {choice.icon && (
        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          {choice.icon}
        </span>
      )}
      {choice.key && (
        <strong style={{
          fontWeight: 500,
          color: token('color.link', '#0C66E4'),
          flexShrink: 0,
        }}>
          {choice.key}
        </strong>
      )}
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {choice.label}
      </span>
    </span>
  );
}

export function makeParentEditCell<T>({
  getParent,
  options,
  canEdit,
  onChange,
}: {
  getParent: (row: T) => ParentChoice | null;
  options: ParentChoice[];
  canEdit?: (row: T) => boolean;
  onChange: (row: T, next: ParentChoice | null) => void;
}) {
  return function ParentEditCell({ row }: CellProps<T>) {
    // All hooks FIRST (Rules of Hooks — no early returns before hooks).
    const [search, setSearch] = useState('');
    const q = search.trim().toLowerCase();
    const filtered = useMemo(
      () => q ? options.filter(o => o.label.toLowerCase().includes(q) || (o.key || '').toLowerCase().includes(q)) : options,
      [q, options],
    );

    const current = getParent(row);
    const editable = canEdit ? canEdit(row) : true;

    const filledDisplay = current ? <ParentChip choice={current} /> : null;

    // Non-editable + empty: just a dash, no affordance.
    if (!editable && !filledDisplay) return <span style={{ color: token('color.text.subtlest', '#7A869A') }}>—</span>;
    if (!editable && filledDisplay) return filledDisplay;

    return (
      <EditorPopover
        width={320}
        trigger={({ onClick, isOpen, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-expanded={isOpen}
            data-jira-cell-editor
            style={{
              display: 'block',
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              margin: '-2px -4px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              textAlign: 'left',
            }}
          >
            {/* Jira renders "None" when there's no parent — plain muted text. */}
            {filledDisplay ?? (
              <span style={{ color: token('color.text.subtlest', '#7A869A'), fontSize: 14 }}>None</span>
            )}
          </button>
        )}
      >
        {(close) => (
          <>
            <div style={{ padding: 4 }}>
              <Textfield
                isCompact
                autoFocus
                placeholder="Search epics"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                elemBeforeInput={
                  <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                    <AkSearchIcon label="" size="small" />
                  </span>
                }
              />
            </div>
            <MenuItemBtn onClick={() => { onChange(row, null); close(); }}>
              <span style={{ color: token('color.text.subtlest', '#7A869A') }}>No parent</span>
            </MenuItemBtn>
            {filtered.slice(0, 20).map((opt) => (
              <MenuItemBtn
                key={opt.id}
                active={current?.id === opt.id}
                onClick={() => { onChange(row, opt); close(); }}
              >
                <ParentChip choice={opt} />
              </MenuItemBtn>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 13, color: token('color.text.subtlest', '#7A869A') }}>No matches</div>
            )}
          </>
        )}
      </EditorPopover>
    );
  };
}

/* ─── Workstream picker editor ──────────────────────────────────────────────
   Tasks Hub analog of makeParentEditCell. Mirrors its structure exactly:
   same trigger button, same EditorPopover, same MenuItemBtn rows, same
   "no value" reset row, same dash for non-editable empty. The only
   differences are:
     - the data type (WorkstreamChoice instead of ParentChoice)
     - the chip renders a color dot + name (no key prefix, no type icon)
     - the search placeholder + "no value" label use workstream copy. */

export interface WorkstreamChoice {
  id: string;
  name: string;
  /** Workstream dot color — data-bound (e.g. var(--cp-workstream-*-primary, #hex)).
   *  Rendered as an 8px dot to the left of the name. */
  color?: string | null;
}

// Chip style for the selected workstream AND for options in the dropdown.
// Mirrors ParentChip's structure: bordered chip, 14/20/400, single-line
// ellipsis. The leading element is a color dot (data-bound), not a type
// icon. The bordered chip keeps visual rhythm with Parent column rows.
function WorkstreamChip({ choice }: { choice: WorkstreamChoice }) {
  return (
    <span
      title={choice.name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: 260,
        padding: '2px 8px',
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 3,
        fontSize: 14,
        lineHeight: '20px',
        fontWeight: 400,
        color: token('color.text', '#292A2E'),
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {choice.color && (
        <span
          aria-hidden="true"
          style={{
            // 2026-06-16 Fix #8: dot 8→6px so the leading element visually
            // rhymes with ParentChip's small leading icon. Keeps the chip
            // feeling "lighter" rather than a saturated lozenge.
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: choice.color,
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {choice.name}
      </span>
    </span>
  );
}

export function makeWorkstreamEditCell<T>({
  getValue,
  options,
  canEdit,
  onChange,
}: {
  getValue: (row: T) => WorkstreamChoice | null;
  options: WorkstreamChoice[];
  canEdit?: (row: T) => boolean;
  onChange: (row: T, next: WorkstreamChoice | null) => void;
}) {
  return function WorkstreamEditCell({ row }: CellProps<T>) {
    // All hooks FIRST (Rules of Hooks — no early returns before hooks).
    const [search, setSearch] = useState('');
    const q = search.trim().toLowerCase();
    const filtered = useMemo(
      () => (q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options),
      [q, options],
    );

    const current = getValue(row);
    const editable = canEdit ? canEdit(row) : true;

    const filledDisplay = current ? <WorkstreamChip choice={current} /> : null;

    // Non-editable + empty: just a dash, no affordance.
    if (!editable && !filledDisplay) return <span style={{ color: token('color.text.subtlest', '#7A869A') }}>—</span>;
    if (!editable && filledDisplay) return filledDisplay;

    return (
      <EditorPopover
        width={320}
        trigger={({ onClick, isOpen, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-expanded={isOpen}
            data-jira-cell-editor
            data-cv-workstream-select
            style={{
              display: 'block',
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              margin: '-2px -4px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              textAlign: 'left',
            }}
          >
            {filledDisplay ?? (
              <span style={{ color: token('color.text.subtlest', '#7A869A'), fontSize: 14 }}>None</span>
            )}
          </button>
        )}
      >
        {(close) => (
          <>
            <div style={{ padding: 4 }}>
              <Textfield
                isCompact
                autoFocus
                placeholder="Search workstreams"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                elemBeforeInput={
                  <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                    <AkSearchIcon label="" size="small" />
                  </span>
                }
              />
            </div>
            <MenuItemBtn onClick={() => { onChange(row, null); close(); }}>
              <span style={{ color: token('color.text.subtlest', '#7A869A') }}>No workstream</span>
            </MenuItemBtn>
            {filtered.slice(0, 20).map((opt) => (
              <MenuItemBtn
                key={opt.id}
                active={current?.id === opt.id}
                onClick={() => { onChange(row, opt); close(); }}
              >
                <WorkstreamChip choice={opt} />
              </MenuItemBtn>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 13, color: token('color.text.subtlest', '#7A869A') }}>No matches</div>
            )}
          </>
        )}
      </EditorPopover>
    );
  };
}

/* ─── Row actions (⋯ hover menu) ─────────────────────────────────────────── */

export interface RowAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  /** Destructive — renders red + separated from main actions. */
  danger?: boolean;
  /** Hide this action for this row (e.g. Jira-synced rows can't delete). */
  hidden?: (row: T) => boolean;
  /** Disabled for this row with optional tooltip. */
  disabled?: (row: T) => boolean;
}

export function makeRowActionsCell<T>({
  actions,
}: {
  actions: RowAction<T>[];
}) {
  return function RowActionsCell({ row }: CellProps<T>) {
    const visible = actions.filter((a) => !a.hidden?.(row));
    const danger = visible.filter((a) => a.danger);
    const normal = visible.filter((a) => !a.danger);
    if (visible.length === 0) return null;

    return (
      <EditorPopover
        width={200}
        align="end"
        trigger={({ onClick, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-label="Row actions"
            className="jira-row-actions-trigger"
            style={{
              width: 28,
              height: 28,
              boxSizing: 'border-box',
              padding: 0,
              flex: 'none',
              alignSelf: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              border: 'none',
              background: 'transparent',
              color: token('color.text.subtlest', '#6B778C'),
              cursor: 'pointer',
              // Always visible per 2026-06-09 spec (Jira parity — the row
              // actions trigger no longer requires hover to appear).
              opacity: 1,
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <AkMoreIcon label="" size="small" />
          </button>
        )}
      >
        {(close) => (
          <>
            {normal.map((a) => (
              <MenuItemBtn
                key={a.id}
                onClick={() => {
                  if (a.disabled?.(row)) return;
                  a.onClick(row);
                  close();
                }}
              >
                {a.icon}
                <span style={{ flex: 1 }}>{a.label}</span>
              </MenuItemBtn>
            ))}
            {danger.length > 0 && (
              <>
                <div style={{ height: 1, background: token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))'), margin: '4px 0' }} />
                {danger.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="menuitem"
                    onClick={() => { a.onClick(row); close(); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'transparent',
                      color: token('color.text.danger', '#AE2A19'),
                      fontSize: 14,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      borderRadius: 3,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = token('color.background.danger', '#FFEBE6'))}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    {a.icon}
                    <span style={{ flex: 1 }}>{a.label}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </EditorPopover>
    );
  };
}

/* ─── Date editor ─────────────────────────────────────────────────────────── */

export function makeDateEditCell<T>({
  getDate,
  canEdit,
  onChange,
}: {
  getDate: (row: T) => string | null | undefined;
  canEdit?: (row: T) => boolean;
  onChange: (row: T, next: string | null) => void;
}) {
  return function DateEditCell({ row }: CellProps<T>) {
    const dateVal = getDate(row) ?? null;
    const editable = canEdit ? canEdit(row) : true;

    const formatted = dateVal
      ? (() => {
          const d = new Date(dateVal);
          const day = d.getDate();
          const mon = d.toLocaleString('en-US', { month: 'short' });
          const yr = d.getFullYear();
          return `${day}/${mon}/${yr}`;
        })()
      : null;

    const display = formatted
      ? <span style={{ fontSize: 14, color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))') }}>{formatted}</span>
      : <span style={{ display: 'inline-block', minWidth: 1, height: 18 }} />;

    if (!editable) return display;

    return (
      <EditorPopover
        width={300}
        trigger={({ onClick, isOpen, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-expanded={isOpen}
            data-jira-cell-editor
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              margin: '-2px -4px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
          >
            {display}
          </button>
        )}
      >
        {(close) => (
          <div style={{ padding: 8 }}>
            <DatePicker
              autoFocus
              value={dateVal || ''}
              onChange={(val) => {
                onChange(row, val || null);
                close();
              }}
              placeholder="Pick a date"
              dateFormat="DD/MMM/YYYY"
            />
            {dateVal && (
              <button
                type="button"
                onClick={() => { onChange(row, null); close(); }}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '6px 10px',
                  border: 'none',
                  background: 'transparent',
                  color: token('color.text.subtlest', '#6B778C'),
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: 3,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                Clear date
              </button>
            )}
          </div>
        )}
      </EditorPopover>
    );
  };
}

/* ─── Labels editor ──────────────────────────────────────────────────────── */

export function makeLabelsEditCell<T>({
  getLabels,
  canEdit,
  onChange,
}: {
  getLabels: (row: T) => string[] | null | undefined;
  canEdit?: (row: T) => boolean;
  onChange: (row: T, next: string[]) => void;
}) {
  return function LabelsEditCell({ row }: CellProps<T>) {
    const labels = getLabels(row) || [];
    const editable = canEdit ? canEdit(row) : true;

    const display = (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {labels.length > 0
          ? labels.map((l) => (
              <span
                key={l}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: token('color.background.neutral', '#F4F5F7'),
                  color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >{l}</span>
            ))
          : <span style={{ display: 'inline-block', minWidth: 1, height: 18 }} />
        }
      </span>
    );

    if (!editable) return display;

    return (
      <EditorPopover
        width={300}
        trigger={({ onClick, isOpen, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={onClick}
            aria-expanded={isOpen}
            data-jira-cell-editor
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              margin: '-2px -4px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              width: '100%',
              maxWidth: '100%',
              textAlign: 'left',
              display: 'block',
            }}
          >
            {display}
          </button>
        )}
      >
        {(close) => <LabelsPopoverContent row={row} labels={labels} onChange={onChange} close={close} />}
      </EditorPopover>
    );
  };
}

function LabelsPopoverContent<T>({ row, labels, onChange, close }: {
  row: T;
  labels: string[];
  onChange: (row: T, next: string[]) => void;
  close: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [current, setCurrent] = useState<string[]>(labels);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLabel = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !current.includes(trimmed)) {
      const next = [...current, trimmed];
      setCurrent(next);
      onChange(row, next);
    }
    setDraft('');
  };

  const removeLabel = (l: string) => {
    const next = current.filter((x) => x !== l);
    setCurrent(next);
    onChange(row, next);
  };

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: current.length ? 8 : 0 }}>
        {current.map((l) => (
          <span
            key={l}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 3,
              background: token('color.background.neutral', '#F4F5F7'),
              color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
              fontSize: 12,
            }}
          >
            {l}
            <button
              type="button"
              onClick={() => removeLabel(l)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: token('color.text.subtlest', '#6B778C') }}
            >
              <AkCloseIcon label="" size="small" />
            </button>
          </span>
        ))}
      </div>
      <Textfield
        ref={inputRef}
        isCompact
        autoFocus
        placeholder="Add label, press Enter"
        value={draft}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') { e.preventDefault(); addLabel(draft); }
          if (e.key === 'Escape') close();
        }}
      />
      <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={close}
          style={{ fontSize: 12, padding: '4px 8px', border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`, borderRadius: 3, background: 'transparent', cursor: 'pointer', color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))') }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// Inject the tiny CSS that reveals the ⋯ button when its row is hovered.
// Always-fresh stylesheet — re-uses the same #jira-row-actions-css element
// when it already exists so HMR-driven content changes apply on every
// module reload. (The previous "guard once" pattern stuck the first version
// of the rules into the DOM and made later edits invisible until a hard
// browser reload.)
if (typeof document !== 'undefined') {
  let styleEl = document.getElementById('jira-row-actions-css') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'jira-row-actions-css';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    tr:hover .jira-row-actions-trigger,
    .jira-row-actions-trigger[aria-expanded="true"] {
      opacity: 1 !important;
    }
    /* Type icon in the Work / Key column stays always visible — no hover
       swap. The sidebar trigger lives on the Summary cell's right-edge
       hover button only (jira-row-actions-trigger pattern). */

    /* Stacked side-panel mode for CatalystViewBase. When the host wrapper
       carries [data-cv-stacked-panel="true"]:
         - body            → flex column, scroll container
         - splitter        → hidden
         - left & sidebar  → display: contents (their children become flex
                             items of body), enabling per-section order
         - order map       → title (1) → status header (2) → rest of body
                             (3) → other sidebar fields (4)
       container-type:normal disables the @container query that would
       otherwise hide the sidebar at body widths < 440px. */
    [data-cv-stacked-panel="true"] .cv-drawer-body {
      display: flex !important;
      flex-direction: column !important;
      flex-wrap: nowrap !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      align-items: stretch !important;
      container-type: normal !important;
      padding: 0 !important;
    }
    [data-cv-stacked-panel="true"] .cv-drawer-splitter {
      display: none !important;
    }
    /* display:contents collapses the column box so its children are now
       direct flex items of cv-drawer-body. Selectors below still work
       against the DOM tree, which is unchanged. */
    [data-cv-stacked-panel="true"] .cv-drawer-left,
    [data-cv-stacked-panel="true"] .cv-drawer-sidebar {
      display: contents !important;
    }
    /* Default order = 3 for every body section (post-title body content). */
    [data-cv-stacked-panel="true"] .cv-drawer-left > * {
      order: 3;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      padding: 0 16px;
    }
    /* Title (first DOM child of left) leads the stack. */
    [data-cv-stacked-panel="true"] .cv-drawer-left > :first-child {
      order: 1 !important;
      padding-top: 16px;
    }
    /* Status header (sidebar's status pill + improve + discuss row)
       slots right between title and the rest of the body. */
    [data-cv-stacked-panel="true"] .cv-drawer-sidebar [data-cv-sidebar-status-header="true"] {
      order: 2 !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 0 12px 0 !important;
      padding: 0 16px !important;
      box-sizing: border-box !important;
    }
    /* Everything else from the sidebar (status field, sprint/assignee/
       reporter, timestamps) lands after the body. Use specific
       padding-left/right (not shorthand) so children with their own inline
       top/bottom padding (e.g. the Created/Updated block at
       CatalystSidebarDetails:855 which sets padding-top:12) keep that
       vertical rhythm but still get the 16px horizontal inset. */
    [data-cv-stacked-panel="true"] .cv-drawer-sidebar > *:not([data-cv-sidebar-status-header="true"]) {
      order: 4;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      padding-left: 16px !important;
      padding-right: 16px !important;
    }
    /* Add a soft divider above the post-body sidebar group. */
    [data-cv-stacked-panel="true"] .cv-drawer-sidebar > *:not([data-cv-sidebar-status-header="true"]):first-of-type {
      border-top: 1px solid var(--ds-border, #DFE1E6);
      padding-top: 16px;
      margin-top: 16px;
    }
    /* Phase C — hide CatalystViewBase's built-in "Open in full page" button
       inside the stacked panel: our custom panel header (rendered by
       BacklogPage above the router) already has a navigate-to-detail
       trigger (the dynamic type-icon button), so the built-in one is
       redundant and visually clutters the top bar. */
    [data-cv-stacked-panel="true"] button[aria-label="Open in full page"] {
      display: none !important;
    }
  `;
}