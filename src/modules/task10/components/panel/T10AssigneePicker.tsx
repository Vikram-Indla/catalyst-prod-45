/**
 * T10AssigneePicker — task10 side-panel assignee picker.
 *
 * 2026-06-21 Phase 8: rewrapped around the canonical <ProfilePicker /> in
 * body-only `anchorRef` mode. Public API unchanged (currentAssigneeId,
 * currentAssigneeName, currentAssigneeInitials, onSelect, anchorRef,
 * isOpen, onClose) so T10SidePanel needs no edits.
 *
 * Lock rule: task10 items are work-item-like; canonical lock applies — once
 * assigned, the picker auto-dismisses (via lockWhenAssigned in body-only
 * mode, which fires onClose immediately when value is set).
 */
import React, { useMemo, useRef, useEffect } from 'react';
import { useProfiles, T10Profile } from '../../hooks/useProfiles';
import { ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';

interface T10AssigneePickerProps {
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  currentAssigneeInitials?: string;
  onSelect: (profile: T10Profile | null) => void;
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  onClose: () => void;
}

export function T10AssigneePicker({
  currentAssigneeId,
  currentAssigneeName,
  onSelect,
  anchorRef,
  isOpen,
  onClose,
}: T10AssigneePickerProps) {
  /* Fetch full profile list (search '' returns all). Avoid wiring a
     server-side search filter — canonical ProfilePicker handles client-side
     filtering across name + email itself. */
  const { data: profiles = [] } = useProfiles('');

  const members: ProfilePickerMember[] = useMemo(
    () => profiles.map((p) => ({
      userId: p.id,
      name: p.full_name,
      email: p.email,
      avatarUrl: p.avatar_url ?? null,
    })),
    [profiles],
  );

  const value: ProfilePickerSelection = currentAssigneeId
    ? {
        userId: currentAssigneeId,
        name: currentAssigneeName ?? 'Unknown',
        avatarUrl: null,
      }
    : null;

  /* Stable RefObject pointing at the parent's anchor element. */
  const stableAnchor = useRef<HTMLElement | null>(null);
  useEffect(() => { stableAnchor.current = anchorRef.current; }, [anchorRef, isOpen]);

  if (!isOpen) return null;

  return (
    <ProfilePicker
      value={value}
      onChange={(next) => {
        if (next === null) {
          onSelect(null);
          return;
        }
        const matched = profiles.find((p) => p.id === next.userId);
        if (matched) onSelect(matched);
      }}
      members={members}
      fieldLabel="Assignee"
      anchorRef={stableAnchor}
      onClose={onClose}
      lockWhenAssigned
    />
  );
}
