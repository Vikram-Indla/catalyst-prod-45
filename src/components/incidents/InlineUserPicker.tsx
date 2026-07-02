/**
 * InlineUserPicker — Inline user selection for incident Assignee column.
 *
 * 2026-06-21 Phase 3 migration: now wraps the canonical <ProfilePicker />
 * (single source of truth in the app). This file owns the data fetch
 * (useActiveUsers) + mutation glue (onSave callback) only.
 *
 * Grid G5 (2026-07-02): assignee locks ONLY when the incident's status is
 * terminal (isAssigneeLocked) — no longer merely because a value is set.
 * Reporter is NOT affected — only assignee fields opt into the lock.
 */
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import type { IncidentUserProfile } from '@/types/incident';
import { ProfilePicker, UnassignedAvatar, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';
import { isAssigneeLocked } from '@/lib/catalyst-rules';

interface InlineUserPickerProps {
  value: IncidentUserProfile | null | undefined;
  onSave: (userId: string | null) => Promise<void>;
  disabled?: boolean;
  textSize?: string;
  /**
   * 2026-06-21: opt-in lock — when true, the picker becomes read-only when
   * the incident's status is terminal (Grid G5). Defaults to true so any
   * incident assignee field automatically gets the lock; pass
   * `lockOnceAssigned={false}` for reporter / other people fields.
   */
  lockOnceAssigned?: boolean;
  /** Grid G5: incident's raw status — locks the picker only when terminal. */
  currentStatus?: string | null;
}

export function InlineUserPicker({
  value,
  onSave,
  disabled = false,
  textSize = 'text-[12px]',
  lockOnceAssigned = true,
  currentStatus,
}: InlineUserPickerProps) {
  const { data: activeUsers = [] } = useActiveUsers();

  const members: ProfilePickerMember[] = useMemo(
    () => activeUsers.map((u) => ({
      userId: u.id,
      name: u.full_name || u.email || 'Unknown',
      email: u.email ?? null,
      avatarUrl: (u as any).avatar_url ?? null,
    })),
    [activeUsers],
  );

  const pickerValue: ProfilePickerSelection = value
    ? { userId: value.id, name: value.full_name, avatarUrl: (value as any).avatar_url ?? null }
    : null;

  const isLocked = disabled || (lockOnceAssigned && isAssigneeLocked(currentStatus));

  return (
    <ProfilePicker
      value={pickerValue}
      onChange={(next) => { void onSave(next?.userId ?? null); }}
      members={members}
      fieldLabel="Assignee"
      disabled={isLocked}
      size={22}
      renderTrigger={({ onClick, ref, disabled: triggerDisabled }) => (
        <button
          ref={ref}
          type="button"
          disabled={triggerDisabled}
          onClick={(e) => {
            if (triggerDisabled) return;
            e.stopPropagation();
            onClick(e);
          }}
          title={
            triggerDisabled
              ? value
                ? `Assignee: ${value.full_name} (locked — item is closed)`
                : 'Assignee'
              : value
                ? `Assignee: ${value.full_name} — click to change`
                : 'Assign'
          }
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded px-1 py-0.5 transition-colors',
            triggerDisabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer hover:bg-muted/80',
            textSize,
          )}
        >
          {pickerValue ? (
            <>
              <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary">
                <span className="text-[10px] font-medium text-primary-foreground">
                  {value?.avatar_initials || value?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-foreground truncate">{value?.full_name}</span>
            </>
          ) : (
            <>
              <UnassignedAvatar size={22} />
              <span className="text-muted-foreground">Unassigned</span>
            </>
          )}
        </button>
      )}
    />
  );
}
