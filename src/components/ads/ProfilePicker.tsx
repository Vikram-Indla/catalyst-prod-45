/**
 * ProfilePicker — Canonical Catalyst people picker.
 *
 * 2026-06-21: single source of truth for every assignee / reporter / owner /
 * manager picker in the app. Each call site supplies:
 *   - `members` array (data-source agnostic)
 *   - `value` (selected userId | null)
 *   - `onChange(next)` callback (call site handles its own mutation)
 *
 * Built-in features (no call site repeats them):
 *   - Portal popover with click-outside + capture-phase Escape
 *   - Search input with autofocus
 *   - "Unassigned" row using canonical UnassignedAvatar
 *   - "Assign to me" affordance (when `currentUserId` provided and != value)
 *   - Avatar + name + presence ring per row
 *   - Selected row highlight
 *   - Trigger button rendering an avatar + name (or "Unassigned" + canonical glyph)
 *   - Custom trigger via `renderTrigger` (escape hatch for table cells, etc)
 *
 * Replaces (target migration list):
 *   - EditableAssignee / EditableReporter (sidebar)
 *   - WorkCardAssigneePicker (AllWork rail)
 *   - kanban/AssigneePickerPopover
 *   - kanban-board/AssigneePicker
 *   - hierarchy/AssigneeDropdown
 *   - incidents/InlineUserPicker
 *   - JiraTable assignee/reporter edit cells
 *   - defects/g25 AssigneeCell
 *
 * Adding a new picker? Mount <ProfilePicker /> — do NOT roll a new component.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { UnassignedAvatar } from './UnassignedAvatar';
import AkAvatar from '@atlaskit/avatar';

export interface ProfilePickerMember {
  userId: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  /** Optional presence string for visual hint ('on_leave' shows on-leave badge). */
  presenceState?: 'available' | 'on_leave' | 'busy' | null;
  /** Optional trailing content rendered after the name (e.g. workload count,
   *  custom badge). 2026-06-21: added for test-cycles workload display. */
  rightSlot?: React.ReactNode;
}

export type ProfilePickerSelection = ProfilePickerMember | null;

export interface ProfilePickerProps {
  /** Currently selected member (`null` = unassigned). Single-select mode. */
  value?: ProfilePickerSelection;
  /** Fired when the user picks a member or clears (single-select mode). */
  onChange?: (next: ProfilePickerSelection) => void;
  /**
   * Multi-select mode (2026-06-21). When set, the picker treats the array as
   * the source of truth. Selecting a row toggles inclusion; popover stays
   * open so the user can pick several. "Unassigned" + "Assign to me" rows
   * are hidden. The `value`/`onChange` props are ignored.
   */
  selectedIds?: string[];
  /** Fired with the next array when a member is toggled (multi-select mode). */
  onChangeMulti?: (next: string[]) => void;
  /** All selectable members. */
  members: ProfilePickerMember[];
  /** Current viewer's userId — enables the "Assign to me" row. */
  currentUserId?: string | null;
  /** Trigger button label prefix. Defaults to ''. Use "Assignee", "Reporter" etc. for tooltips. */
  fieldLabel?: string;
  /** Hide the "Assign to me" row even when `currentUserId` is set. */
  hideAssignToMe?: boolean;
  /** Hide the "Unassigned" row (rare — e.g. owner field that must always have a value). */
  hideUnassignedRow?: boolean;
  /** Disable interaction (read-only). */
  disabled?: boolean;
  /** Pixel size for the avatar in the trigger. Defaults to 24. */
  size?: number;
  /** Escape hatch: render a custom trigger. Receives `{ open, value, disabled }` + onClick handler. */
  renderTrigger?: (args: {
    open: boolean;
    value: ProfilePickerSelection;
    disabled: boolean;
    onClick: (e: React.MouseEvent) => void;
    ref: React.Ref<HTMLButtonElement>;
  }) => React.ReactNode;
  /** Visual variant of the default trigger. 'inline' = compact text button (sidebar / table). */
  triggerVariant?: 'inline' | 'cell';
  /**
   * Body-only mode (2026-06-21): when set, ProfilePicker renders ONLY the
   * popover body, positioned at `anchorRef.current.getBoundingClientRect()`.
   * The parent owns the visible trigger and mounts/unmounts ProfilePicker
   * conditionally. Used by hierarchy/AssigneeDropdown, kanban-board card
   * avatar popover, project-hub inline editors — patterns where the parent
   * already owns its trigger element.
   *
   * When `anchorRef` is provided:
   *   - `renderTrigger` is ignored
   *   - popover opens immediately on mount
   *   - on close (Escape, outside-click, selection), `onClose` fires so the
   *     parent can unmount ProfilePicker
   */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Required when `anchorRef` is set. Called when the popover dismisses. */
  onClose?: () => void;
  /**
   * 2026-06-21 (Vikram canonical rule): once `value` is set, lock the
   * picker. Reverting an assignee requires a backend admin. Default `false`
   * so non-work-item pickers (tasks form, test-cycles workload, chat
   * recipients) keep their normal re-assignment UX. Work-item assignee
   * pickers (sidebar, kanban, hierarchy, JiraTable inline editor, etc.)
   * MUST pass `lockWhenAssigned={true}`.
   *
   * Trigger mode: when locked, the trigger is rendered disabled.
   * Body-only mode: when locked, the popover does not open and `onClose`
   * fires immediately so the parent can unmount.
   */
  lockWhenAssigned?: boolean;
}

export function ProfilePicker({
  value = null,
  onChange,
  selectedIds,
  onChangeMulti,
  members,
  currentUserId,
  fieldLabel,
  hideAssignToMe,
  hideUnassignedRow,
  disabled,
  size = 24,
  renderTrigger,
  triggerVariant = 'inline',
  anchorRef,
  onClose,
  lockWhenAssigned,
}: ProfilePickerProps) {
  const bodyOnly = !!anchorRef;
  const multi = !!selectedIds && !!onChangeMulti;
  /* Canonical lock: once a value is set AND `lockWhenAssigned` is on,
     treat the picker as fully disabled. Body-only mode additionally tells
     the parent to unmount via onClose. Lock does NOT apply in multi mode
     (filter / recipient pickers have different semantics). */
  const isLocked = !multi && !!lockWhenAssigned && !!value;
  const effectivelyDisabled = !!disabled || isLocked;
  const [open, setOpen] = useState(bodyOnly && !isLocked);
  useEffect(() => {
    if (bodyOnly && isLocked) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* Tick state — forces a re-render after mount so body-only mode can read
     `anchorRef.current.getBoundingClientRect()` (ref is null during the
     first render of the popover when parent + body-only ProfilePicker mount
     together). */
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (open) forceTick((n) => n + 1);
  }, [open]);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      if (effectivelyDisabled) return;
      e.stopPropagation();
      e.preventDefault();
      setOpen((o) => !o);
      setSearch('');
    },
    [effectivelyDisabled],
  );

  /* Internal close — also notifies parent if running in body-only mode. */
  const closePopover = useCallback(() => {
    setOpen(false);
    if (bodyOnly) onClose?.();
  }, [bodyOnly, onClose]);

  /* Click outside → close. In body-only mode the trigger lives in the parent,
     so use `anchorRef` as the no-close zone instead of the internal trigger. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const anchorEl = bodyOnly ? anchorRef?.current : triggerRef.current;
      if (
        portalRef.current && !portalRef.current.contains(t) &&
        anchorEl && !anchorEl.contains(t)
      ) closePopover();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, bodyOnly, anchorRef, closePopover]);

  /* Capture-phase Escape — prevents parent modal closure. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closePopover();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, closePopover]);

  /* Autofocus search on open */
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (q
      ? members.filter((m) => m.name.toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q))
      : members),
    [members, q],
  );

  const handleSelect = useCallback(
    (m: ProfilePickerMember | null) => {
      if (multi) {
        if (!m) return;
        const next = (selectedIds ?? []).includes(m.userId)
          ? (selectedIds ?? []).filter((id) => id !== m.userId)
          : [...(selectedIds ?? []), m.userId];
        onChangeMulti?.(next);
        /* In multi mode keep popover open so user can pick several. */
        return;
      }
      onChange?.(m);
      setSearch('');
      closePopover();
    },
    [onChange, closePopover, multi, selectedIds, onChangeMulti],
  );

  /* "Assign to me" row — only when currentUserId present, not already selected,
     and they're in the members list. */
  const meMember = useMemo(
    () => (currentUserId ? members.find((m) => m.userId === currentUserId) ?? null : null),
    [currentUserId, members],
  );
  const showAssignToMe = !hideAssignToMe && !!meMember && value?.userId !== meMember.userId;

  /* ───── Trigger ───── */
  const multiSelectedMembers = useMemo(
    () => (multi ? members.filter((m) => (selectedIds ?? []).includes(m.userId)) : []),
    [multi, members, selectedIds],
  );
  const multiLabel = multi
    ? multiSelectedMembers.length === 0
      ? (fieldLabel ?? 'Select people')
      : multiSelectedMembers.length === 1
        ? multiSelectedMembers[0].name
        : `${multiSelectedMembers.length} selected`
    : null;

  const defaultTrigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleToggle}
      disabled={effectivelyDisabled}
      aria-label={multi
        ? `${fieldLabel ?? 'People'} (${multiSelectedMembers.length} selected)`
        : `${fieldLabel ? `Change ${fieldLabel.toLowerCase()}` : 'Change user'} (${value?.name ?? 'Unassigned'})`}
      title={
        multi
          ? (multiLabel ?? '')
          : isLocked
            ? `Locked: ${value?.name ?? ''}`
            : (value?.name ?? 'Unassigned')
      }
      style={{
        background: 'none',
        border: 'none',
        padding: triggerVariant === 'cell' ? '2px 4px' : '4px 8px',
        cursor: effectivelyDisabled ? 'default' : 'pointer',
        borderRadius: 3,
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: 400,
        color: 'var(--ds-text)',
        textAlign: 'left',
        fontFamily: 'var(--ds-font-family-body, var(--cp-font-body))',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {multi
        ? <UnassignedAvatar size={size} />
        : value
          ? <AkAvatar appearance="circle" size="small" name={value.name} src={value.avatarUrl ?? undefined} label={value.name} />
          : <UnassignedAvatar size={size} />}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {multi ? multiLabel : (value?.name ?? 'Unassigned')}
      </span>
    </button>
  );

  /* Custom trigger — caller passes ref + onClick wiring via the helper.
     Body-only mode: parent owns trigger, render nothing here. */
  const triggerNode = bodyOnly
    ? null
    : renderTrigger
      ? renderTrigger({ open, value, disabled: effectivelyDisabled, onClick: handleToggle, ref: triggerRef })
      : defaultTrigger;

  /* ───── Popover ───── */
  const anchorEl = bodyOnly ? anchorRef?.current : triggerRef.current;
  const rect = anchorEl?.getBoundingClientRect();
  const portalStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)),
        zIndex: 10000,
        width: 280,
      }
    : { display: 'none' };

  return (
    <>
      {triggerNode}
      {open && createPortal(
        <div
          ref={portalRef}
          data-profile-picker-portal
          style={portalStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              background: 'var(--ds-surface-overlay)',
              border: '1px solid var(--ds-border)',
              borderRadius: 6,
              boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,0.15))',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--ds-border)',
                background: 'var(--ds-surface-sunken)',
              }}
            >
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people…"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: 'var(--ds-font-family-body, var(--cp-font-body))',
                  fontSize: 'var(--ds-font-size-400)',
                  color: 'var(--ds-text)',
                }}
              />
            </div>

            <div role="listbox" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {!multi && showAssignToMe && meMember && (
                <PickerRow
                  member={meMember}
                  isSelected={false}
                  badge="Assign to me"
                  onClick={() => handleSelect(meMember)}
                />
              )}

              {!multi && !hideUnassignedRow && (
                <UnassignedRow
                  isSelected={value === null}
                  onClick={() => handleSelect(null)}
                />
              )}

              {filtered.length === 0 && (
                <div style={{ padding: 16, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)', textAlign: 'center' }}>
                  {/* 2026-06-21: distinguish "no source" from "search filtered them all out".
                     "No people match" was confusing when the picker was empty BEFORE the user typed
                     anything — usually means the project has no project_members rows yet. */}
                  {members.length === 0
                    ? 'No people available'
                    : q
                      ? `No matches for "${search}"`
                      : 'No people available'}
                </div>
              )}

              {filtered.map((m) => (
                <PickerRow
                  key={m.userId}
                  member={m}
                  isSelected={
                    multi
                      ? (selectedIds ?? []).includes(m.userId)
                      : value?.userId === m.userId
                  }
                  onClick={() => handleSelect(m)}
                />
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function UnassignedRow({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const showBar = isSelected || hover;
  const bg = isSelected
    ? 'var(--ds-background-selected)'
    : hover
      ? 'var(--ds-background-neutral)'
      : 'var(--ds-surface)';
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px 8px 15px',
        border: 'none',
        cursor: 'pointer',
        background: bg,
        textAlign: 'left',
        fontFamily: 'var(--ds-font-family-body, var(--cp-font-body))',
        transition: 'background 100ms ease',
      }}
    >
      {showBar && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0, width: 3,
            background: 'var(--ds-background-brand-bold)',
          }}
        />
      )}
      <UnassignedAvatar size={24} />
      <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>Unassigned</span>
    </button>
  );
}

function PickerRow({
  member,
  isSelected,
  badge,
  onClick,
}: {
  member: ProfilePickerMember;
  isSelected: boolean;
  badge?: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  /* Visual rules:
     - selected → light blue background + 3px blue vertical bar on left
     - hover (not selected) → neutral gray background + 3px blue vertical bar on left
     - idle → surface (white) background, no bar */
  const showBar = isSelected || hover;
  const bg = isSelected
    ? 'var(--ds-background-selected)'
    : hover
      ? 'var(--ds-background-neutral)'
      : 'var(--ds-surface)';
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px 8px 15px',
        border: 'none',
        cursor: 'pointer',
        background: bg,
        textAlign: 'left',
        fontFamily: 'var(--ds-font-family-body, var(--cp-font-body))',
        transition: 'background 100ms ease',
      }}
    >
      {showBar && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0, width: 3,
            background: 'var(--ds-background-brand-bold)',
          }}
        />
      )}
      <AkAvatar appearance="circle" size="small" name={member.name} src={member.avatarUrl ?? undefined} label={member.name} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {member.name}
      </span>
      {member.presenceState === 'on_leave' && (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-warning)', flexShrink: 0 }}>
          On leave
        </span>
      )}
      {member.rightSlot && (
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
          {member.rightSlot}
        </span>
      )}
      {badge && (
        <span
          style={{
            fontSize: 'var(--ds-font-size-100)',
            color: 'var(--ds-text-information)',
            background: 'var(--ds-background-information)',
            padding: '0px 6px',
            borderRadius: 3,
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default ProfilePicker;
