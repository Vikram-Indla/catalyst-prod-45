/**
 * AssigneeDropdown — Inline body-only popover for hierarchy table cells.
 *
 * 2026-06-21 Phase 6: rewrapped around the canonical <ProfilePicker /> via
 * its `anchorRef` body-only mode. Public API kept stable (currentAssignee,
 * availableAssignees, onSelect, onClose) — all 4 callers (WorkItemTable,
 * DetailPanel, BulkActionBar, HierarchyContextMenu) need no changes.
 *
 * The wrapper div is positioned `top:100% left:0` exactly like the legacy
 * popover, but is now 0×0 (invisible). ProfilePicker reads its rect and
 * places the actual popover body at that anchor — visually identical
 * placement (±2px from the original `marginTop: 4`).
 */
import { useRef, useMemo } from 'react';
import { ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';

export interface AssigneeOption {
  displayName: string;
  email?: string;
  accountId?: string;
}

interface AssigneeDropdownProps {
  currentAssignee: string | undefined; // displayName
  availableAssignees: AssigneeOption[];
  onSelect: (assignee: AssigneeOption | null) => void;
  onClose: () => void;
}

export function AssigneeDropdown({ currentAssignee, availableAssignees, onSelect, onClose }: AssigneeDropdownProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  const members: ProfilePickerMember[] = useMemo(
    () => availableAssignees.map((a) => ({
      userId: a.accountId ?? a.displayName,
      name: a.displayName,
      email: a.email ?? null,
      avatarUrl: null,
    })),
    [availableAssignees],
  );

  const value: ProfilePickerSelection = currentAssignee
    ? {
        userId: availableAssignees.find((a) => a.displayName === currentAssignee)?.accountId ?? currentAssignee,
        name: currentAssignee,
        avatarUrl: null,
      }
    : null;

  const handleChange = (next: ProfilePickerSelection) => {
    if (next === null) {
      onSelect(null);
      return;
    }
    const matched = availableAssignees.find((a) => a.displayName === next.name) ?? { displayName: next.name };
    onSelect(matched);
  };

  return (
    <div
      ref={anchorRef}
      aria-hidden="true"
      style={{ position: 'absolute', top: '100%', left: 0, width: 0, height: 0, pointerEvents: 'none' }}
    >
      <ProfilePicker
        value={value}
        onChange={handleChange}
        members={members}
        fieldLabel="Assignee"
        anchorRef={anchorRef}
        onClose={onClose}
        lockWhenAssigned
      />
    </div>
  );
}
