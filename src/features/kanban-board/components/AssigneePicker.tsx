/**
 * AssigneePicker — popover anchored to a kanban card avatar.
 *
 * 2026-06-21 Phase 6: rewrapped around the canonical <ProfilePicker /> via
 * its `anchorRef` body-only mode. KanbanPage signature unchanged
 * (`{ issue, anchor, members, currentUserName, onAssign, onClose }`).
 *
 * Identity model: this picker operates on display NAMES (BoardIssue
 * .assigneeName is a name string, not a UUID). We use the name as the
 * userId surrogate so ProfilePicker's value/onChange round-trip is
 * stable. `avatars` map → avatarUrl per member.
 */
import React, { useMemo, useRef, useEffect } from 'react';
import { ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { BoardIssue } from '../types';

interface Props {
  issue: BoardIssue;
  anchor: HTMLElement;
  members: string[];
  avatars: Map<string, string | null>;
  currentUserName: string | null;
  onAssign: (issue: BoardIssue, name: string | null) => void;
  onClose: () => void;
}

export const AssigneePicker: React.FC<Props> = ({ issue, anchor, members, avatars, currentUserName, onAssign, onClose }) => {
  /* Wrap the parent-supplied HTMLElement into a stable RefObject so
     ProfilePicker can read .current. The parent owns lifecycle; we just
     point at the same node. */
  const anchorRef = useRef<HTMLElement | null>(anchor);
  useEffect(() => { anchorRef.current = anchor; }, [anchor]);

  const pickerMembers: ProfilePickerMember[] = useMemo(
    () => members.map((name) => ({
      userId: name,
      name,
      avatarUrl: resolveAvatarUrl(name) ?? avatars.get(name) ?? null,
    })),
    [members, avatars],
  );

  const value: ProfilePickerSelection = issue.assigneeName
    ? {
        userId: issue.assigneeName,
        name: issue.assigneeName,
        avatarUrl: resolveAvatarUrl(issue.assigneeName) ?? avatars.get(issue.assigneeName) ?? null,
      }
    : null;

  return (
    <ProfilePicker
      value={value}
      onChange={(next) => onAssign(issue, next?.userId ?? null)}
      members={pickerMembers}
      currentUserId={currentUserName}
      fieldLabel="Assignee"
      anchorRef={anchorRef}
      onClose={onClose}
      lockWhenAssigned
    />
  );
};
