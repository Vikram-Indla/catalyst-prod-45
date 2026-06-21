/**
 * AssigneeSelect — Inline assignee editor for the test-cycles assignment table.
 *
 * 2026-06-21 Phase 7: migrated to the canonical <ProfilePicker />. Trigger
 * keeps the existing avatar + name + chevron-on-hover layout via
 * `renderTrigger`. Per-row workload count uses the new `rightSlot` on
 * ProfilePickerMember.
 */
import { useMemo } from 'react';
import { ChevronDown } from '@/lib/atlaskit-icons';
import { Avatar, ProfilePicker, UnassignedAvatar, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { TeamMemberOption } from '@/types/assignment-table.types';

interface AssigneeSelectProps {
  value: string | null;
  assigneeName: string | null;
  teamMembers: TeamMemberOption[];
  onChange: (value: string | null) => void;
}

export function AssigneeSelect({ value, assigneeName, teamMembers, onChange }: AssigneeSelectProps) {
  const members: ProfilePickerMember[] = useMemo(
    () => teamMembers.map(m => ({
      userId: m.id,
      name: m.name,
      avatarUrl: m.avatar ?? null,
      rightSlot: (
        <span className="text-xs" style={{ color: CATALYST_V5.slate[400] }}>
          {m.workload}
        </span>
      ),
    })),
    [teamMembers],
  );

  const selectedMember = teamMembers.find(m => m.id === value);
  const selected: ProfilePickerSelection = selectedMember
    ? {
        userId: selectedMember.id,
        name: selectedMember.name,
        avatarUrl: selectedMember.avatar ?? null,
      }
    : null;

  return (
    <ProfilePicker
      value={selected}
      onChange={(next) => onChange(next?.userId ?? null)}
      members={members}
      fieldLabel="Assignee"
      renderTrigger={({ onClick, ref, disabled }) => (
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex items-center gap-2 group text-left"
        >
          {value && assigneeName ? (
            <>
              <Avatar name={assigneeName} size="xsmall" />
              <span className="text-sm" style={{ color: CATALYST_V5.slate[700] }}>
                {assigneeName}
              </span>
            </>
          ) : (
            <>
              <UnassignedAvatar size={20} />
              <span className="text-sm" style={{ color: CATALYST_V5.slate[400] }}>
                Unassigned
              </span>
            </>
          )}
          <ChevronDown
            className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: CATALYST_V5.slate[400] }}
          />
        </button>
      )}
    />
  );
}
