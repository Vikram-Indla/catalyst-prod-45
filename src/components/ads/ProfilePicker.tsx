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
}

export type ProfilePickerSelection = ProfilePickerMember | null;

export interface ProfilePickerProps {
  /** Currently selected member (`null` = unassigned). */
  value: ProfilePickerSelection;
  /** Fired when the user picks a member or clears. */
  onChange: (next: ProfilePickerSelection) => void;
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
}

export function ProfilePicker({
  value,
  onChange,
  members,
  currentUserId,
  fieldLabel,
  hideAssignToMe,
  hideUnassignedRow,
  disabled,
  size = 24,
  renderTrigger,
  triggerVariant = 'inline',
}: ProfilePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.stopPropagation();
      e.preventDefault();
      setOpen((o) => !o);
      setSearch('');
    },
    [disabled],
  );

  /* Click outside → close */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        portalRef.current && !portalRef.current.contains(t) &&
        triggerRef.current && !triggerRef.current.contains(t)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  /* Capture-phase Escape — prevents parent modal closure. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

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
      onChange(m);
      setOpen(false);
      setSearch('');
    },
    [onChange],
  );

  /* "Assign to me" row — only when currentUserId present, not already selected,
     and they're in the members list. */
  const meMember = useMemo(
    () => (currentUserId ? members.find((m) => m.userId === currentUserId) ?? null : null),
    [currentUserId, members],
  );
  const showAssignToMe = !hideAssignToMe && !!meMember && value?.userId !== meMember.userId;

  /* ───── Trigger ───── */
  const defaultTrigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      aria-label={`${fieldLabel ? `Change ${fieldLabel.toLowerCase()}` : 'Change user'} (${value?.name ?? 'Unassigned'})`}
      title={value?.name ?? 'Unassigned'}
      style={{
        background: 'none',
        border: 'none',
        padding: triggerVariant === 'cell' ? '2px 4px' : '4px 8px',
        cursor: disabled ? 'default' : 'pointer',
        borderRadius: 3,
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--ds-text, #172B4D)',
        textAlign: 'left',
        fontFamily: 'var(--ds-font-family-body, var(--cp-font-body))',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {value
        ? <AkAvatar appearance="circle" size="small" name={value.name} src={value.avatarUrl ?? undefined} label={value.name} />
        : <UnassignedAvatar size={size} />}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value?.name ?? 'Unassigned'}
      </span>
    </button>
  );

  /* Custom trigger — caller passes ref + onClick wiring via the helper. */
  const triggerNode = renderTrigger
    ? renderTrigger({ open, value, disabled: !!disabled, onClick: handleToggle, ref: triggerRef })
    : defaultTrigger;

  /* ───── Popover ───── */
  const rect = triggerRef.current?.getBoundingClientRect();
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
              background: 'var(--ds-surface-overlay, #FFFFFF)',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(9,30,66,0.15)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                background: 'var(--ds-surface-sunken, #F7F8F9)',
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
                  fontSize: 14,
                  color: 'var(--ds-text, #172B4D)',
                }}
              />
            </div>

            <div role="listbox" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {showAssignToMe && meMember && (
                <PickerRow
                  member={meMember}
                  isSelected={false}
                  badge="Assign to me"
                  onClick={() => handleSelect(meMember)}
                />
              )}

              {!hideUnassignedRow && (
                <UnassignedRow
                  isSelected={value === null}
                  onClick={() => handleSelect(null)}
                />
              )}

              {filtered.length === 0 && (
                <div style={{ padding: 16, fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', textAlign: 'center' }}>
                  No people match
                </div>
              )}

              {filtered.map((m) => (
                <PickerRow
                  key={m.userId}
                  member={m}
                  isSelected={value?.userId === m.userId}
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
    ? 'var(--ds-background-selected, #E9F2FE)'
    : hover
      ? 'var(--ds-background-neutral, #F1F2F4)'
      : 'var(--ds-surface, #FFFFFF)';
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
        gap: 10,
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
            background: 'var(--ds-background-brand-bold, #0C66E4)',
          }}
        />
      )}
      <UnassignedAvatar size={24} />
      <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>Unassigned</span>
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
    ? 'var(--ds-background-selected, #E9F2FE)'
    : hover
      ? 'var(--ds-background-neutral, #F1F2F4)'
      : 'var(--ds-surface, #FFFFFF)';
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
        gap: 10,
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
            background: 'var(--ds-background-brand-bold, #0C66E4)',
          }}
        />
      )}
      <AkAvatar appearance="circle" size="small" name={member.name} src={member.avatarUrl ?? undefined} label={member.name} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--ds-text, #172B4D)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {member.name}
      </span>
      {member.presenceState === 'on_leave' && (
        <span style={{ fontSize: 11, color: 'var(--ds-text-warning, #B65C02)', flexShrink: 0 }}>
          On leave
        </span>
      )}
      {badge && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--ds-text-information, #0055CC)',
            background: 'var(--ds-background-information, #E9F2FE)',
            padding: '2px 6px',
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
