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
import { token } from '@atlaskit/tokens';
import { Search as SearchIcon, MoreHorizontal } from 'lucide-react';
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
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
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
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
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
        gap: 10,
        width: '100%',
        padding: '8px 10px',
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
            }}
          >
            {lozenge ?? (
              <span data-jira-cell-ghost style={{ fontSize: 13 }}>
                Set status
              </span>
            )}
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

    return (
      <span
        data-jira-table-editor
        data-jira-cell-editor
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'block', width: '100%' }}
      >
        <InlineEdit<string>
          // Fix #2 (iter-9): Atlaskit InlineEdit defaults to fit-content
          // sizing on its readView container. Without this prop the inner
          // span's max-width: 100% resolves against a shrunk wrapper and
          // "Test, 25 April." renders as "Test, 25 A...".
          readViewFitContainerWidth
          defaultValue={summary}
          editView={({ errorMessage, ...fieldProps }) => (
            <Textfield {...fieldProps} autoFocus />
          )}
          readView={() => (
            <span
              style={{
                display: 'block',
                padding: '2px 6px',
                margin: '-2px -6px',
                borderRadius: 3,
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
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
                    <SearchIcon size={12} />
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

const PRIORITY_ORDER = ['critical', 'highest', 'high', 'medium', 'low', 'lowest'];

function PriorityBars({ priority }: { priority: string | null }) {
  const p = (priority || '').toLowerCase();
  const idx = PRIORITY_ORDER.indexOf(p);
  const level = idx >= 0 ? PRIORITY_ORDER.length - idx : 0;
  const color =
    level >= 4 ? token('color.icon.danger',  '#E5484D') :
    level >= 3 ? token('color.icon.warning', '#F59E0B') :
    level >= 1 ? token('color.icon.success', '#22C55E') :
    token('color.border', '#DFE1E6');
  const inactive = token('color.border', '#DFE1E6');
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} title={p || 'No priority'}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            width: 4, height: 16, borderRadius: 1,
            background: i <= level ? color : inactive,
          }}
        />
      ))}
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
//   color:      var(--ds-surface, #FFFFFF)
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
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            {/* Jira renders a BLANK parent cell when there's no parent
                (measured 2026-04-18 on digital-transformation.atlassian.net
                — no "Add parent" placeholder). The cell is still clickable
                because the entire trigger button spans the cell width, so
                users can open the picker by clicking anywhere in the column
                — we just don't show placeholder text. */}
            {filledDisplay ?? (
              <span style={{ display: 'inline-block', minWidth: 1, height: 18 }} />
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
                    <SearchIcon size={12} />
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              border: 'none',
              background: 'transparent',
              color: token('color.text.subtlest', '#6B778C'),
              cursor: 'pointer',
              // Only visible on row hover — the JiraTable row applies
              // .jira-row-actions-visible on hover via :hover CSS (injected below).
              opacity: 0,
              transition: 'opacity 100ms',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <MoreHorizontal size={16} />
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
                <div style={{ height: 1, background: token('color.border', '#DFE1E6'), margin: '4px 0' }} />
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

// Inject the tiny CSS that reveals the ⋯ button when its row is hovered.
// Idempotent — runs once.
if (typeof document !== 'undefined' && !document.getElementById('jira-row-actions-css')) {
  const style = document.createElement('style');
  style.id = 'jira-row-actions-css';
  style.textContent = `
    tr:hover .jira-row-actions-trigger,
    .jira-row-actions-trigger[aria-expanded="true"] {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
}