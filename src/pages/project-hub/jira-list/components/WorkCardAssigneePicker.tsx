/**
 * WorkCardAssigneePicker — Compact avatar-only assignee picker for the
 * navigator card list. Click avatar → opens canonical ProfilePicker. Writes
 * `assignee_account_id` + `assignee_display_name` to ph_issues and
 * invalidates the list query so the card refreshes in real time.
 *
 * 2026-06-21 Phase 2 migration: dropped the bespoke popover. Now delegates
 * trigger + popover UI to <ProfilePicker /> (canonical). This file owns
 * only the 28px avatar bubble (via renderTrigger) + the mutation glue.
 */
import React, { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';
import { UnassignedAvatar, ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';
import { isAssigneeLocked } from '@/lib/catalyst-rules';

interface Props {
  /** ph_issues.id (UUID PK). Required — issue_key would silent-400 (CLAUDE.md §L39). */
  dbId: string;
  /** Current assignee UUID (project_members.user_id) or null. */
  currentAssigneeId: string | null;
  /** Current assignee display name — drives avatar resolution. */
  currentAssigneeName: string | null;
  /** Project UUID — required to fetch project_members. */
  projectId: string | undefined;
  /** Fallback initials shown when no local face PNG exists. */
  fallbackInitials: string;
  /** Fallback bubble background color (hash-based). */
  fallbackColor: string;
  /** Grid G5: work item's raw status — locks the picker only when terminal. */
  currentStatus?: string | null;
}

interface MemberRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export function WorkCardAssigneePicker({
  dbId, currentAssigneeId, currentAssigneeName, projectId,
  fallbackInitials, fallbackColor, currentStatus,
}: Props) {
  const queryClient = useQueryClient();

  const localUrl = useMemo(
    () => (currentAssigneeName ? resolveAvatarUrl(currentAssigneeName) : null),
    [currentAssigneeName],
  );

  const { data: members = [] } = useQuery({
    queryKey: ['workcard-project-members', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId!);
      if (!data?.length) return [];
      const ids = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name').in('id', ids);
      const map = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(d => {
        const full_name = map.get(d.user_id)?.full_name ?? 'Unknown';
        return { user_id: d.user_id, full_name, avatar_url: resolveAvatarUrl(full_name) };
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (next: ProfilePickerSelection) => {
      const { error } = await supabase
        .from('ph_issues')
        .update({ assignee_account_id: next?.userId ?? null, assignee_display_name: next?.name ?? null } as any)
        .eq('id', dbId);
      if (error) throw error;
    },
    onSuccess: () => {
      /* 2026-06-21: refetchType 'all' forces mounted queries (right-side
         sidebar's `cv-issue-detail`, etc.) to refetch immediately instead
         of waiting for remount. Pre-existing 'project-all-work-items-v3'
         key was wrong — replaced with the real offset/count keys. */
      queryClient.invalidateQueries({ queryKey: ['project-all-work-items-offset'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['project-all-work-count'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['project-list-items-v2'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['work-item-detail'], refetchType: 'all' });
    },
    onError: (err: any) => {
      // Surface RLS / FK failures in the console instead of silently swallowing.
      console.error('[WorkCardAssigneePicker] assignee write failed:', err?.message ?? err);
    },
  });

  const pickerMembers: ProfilePickerMember[] = useMemo(
    () => members.map(m => ({ userId: m.user_id, name: m.full_name, avatarUrl: m.avatar_url })),
    [members],
  );

  const pickerValue: ProfilePickerSelection = currentAssigneeId
    ? { userId: currentAssigneeId, name: currentAssigneeName ?? 'Unknown', avatarUrl: currentAssigneeName ? resolveAvatarUrl(currentAssigneeName) : null }
    : null;

  return (
    <ProfilePicker
      value={pickerValue}
      onChange={(next) => { updateMutation.mutate(next); }}
      members={pickerMembers}
      fieldLabel="Assignee"
      size={28}
      /* Grid G5: locks only when status is terminal — not merely because
         an assignee is set. Reporter is NOT affected by this rule. */
      disabled={isAssigneeLocked(currentStatus)}
      renderTrigger={({ onClick, ref, disabled }) => (
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            if (disabled) return;
            e.stopPropagation();
            onClick(e);
          }}
          title={
            disabled
              ? `Assignee: ${currentAssigneeName ?? ''} (locked — item is closed)`
              : currentAssigneeName
                ? `Assignee: ${currentAssigneeName} — click to change`
                : 'Assign'
          }
          style={{
            width: 28, height: 28, padding: 0, borderRadius: '50%', border: 'none',
            background: 'transparent',
            cursor: disabled ? 'default' : 'pointer',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {localUrl ? (
            <img
              src={localUrl}
              alt={currentAssigneeName ?? ''}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
            />
          ) : currentAssigneeName ? (
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: fallbackColor,
              color: 'var(--ds-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 'var(--ds-font-size-100)',
            }}>{fallbackInitials}</div>
          ) : (
            <UnassignedAvatar size={28} />
          )}
        </button>
      )}
    />
  );
}
