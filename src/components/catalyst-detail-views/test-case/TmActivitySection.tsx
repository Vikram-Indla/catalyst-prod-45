/**
 * TmActivitySection — canonical catalyst-ds Activity panel for a test case.
 *
 * Mirrors CatalystActivitySection (the work-item analog) but reads from the
 * TestHub tables:
 *   • Comments  → tm_comments   (entity_type / entity_id generic key)
 *   • History   → tm_activity_log (audit table, migration 20260705130754)
 *
 * Comment CRUD reuses TmCommentsSection's spine: reads via useTmComments,
 * add/reply via useAddTmComment — identical writes, no regression. Edit and
 * delete write directly to tm_comments, mirroring CatalystActivitySection's
 * ph_comments mutations (tm_comments has no reactions table, so
 * onToggleReaction is intentionally omitted — ActivityPanel handles its
 * absence).
 *
 * Zero-assumption: activity values are rendered verbatim. When a change
 * stores a raw id (priority_id / assigned_to), the readable field label is
 * shown alongside the raw id — never a fabricated name or icon.
 */
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { catalystToast } from '@/lib/catalystToast';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsActivityItem, CdsUser } from '@/components/catalyst-ds';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useTmComments, useAddTmComment } from '@/hooks/test-management/useTmComments';

interface TmActivitySectionProps {
  entityType: 'test_case';
  entityId: string | undefined;
}

/** Raw tm_activity_log row (only the columns we select). */
interface TmActivityRow {
  id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

/**
 * Human-readable label for a stored field_name. Deliberately avoids the
 * exact tokens ActivityItem special-cases into avatar/priority-icon widgets
 * ('assignee', 'priority') — those would draw a face or coloured glyph from
 * a raw id, which is misleading. Falling through to a neutral label keeps
 * the value rendering as plain text (zero-assumption).
 */
function fieldLabel(fieldName: string | null): string {
  switch (fieldName) {
    case 'title':
      return 'title';
    case 'priority_id':
      return 'priority';
    case 'assigned_to':
      return 'assignee';
    case 'status':
      return 'status';
    default:
      return fieldName ?? 'field';
  }
}

/** Capitalise a status token for the diff pills (draft → Draft). */
function humanizeStatus(v: string | null): string | null {
  if (!v) return v;
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * Map a tm_activity_log row → CdsActivityItem for the canonical renderer.
 *
 * action           → CdsActivityItem
 * ─────────────────────────────────────────────────────────────────────
 * created          → create, "created this test case"
 * status_changed   → update, fieldChange{ status, Draft → Ready } (status
 *                    pills, humanised)
 * updated          → update, fieldChange{ <label>, old → new } (plain text
 *                    diff; priority_id/assigned_to show the readable label +
 *                    raw id, no fabricated name)
 * step_added       → update, "added step <n>"  (via description-carrying row)
 * step_updated     → update, "updated step <n>"
 * step_deleted     → update, "deleted step <n>"
 * <other>          → update, fieldChange or bare row
 */
function mapActivity(raw: TmActivityRow): CdsActivityItem {
  const profile = raw.actor;
  const actor: CdsUser = {
    id: raw.user_id ?? 'system',
    name: profile?.full_name || profile?.email || 'System',
    avatarUrl:
      resolveAvatarUrl(profile?.full_name ?? null) ??
      profile?.avatar_url ??
      null,
  };

  const base = { id: raw.id, actor, timestamp: raw.created_at };

  if (raw.action === 'created') {
    return { ...base, type: 'create', description: 'created this test case' };
  }

  if (raw.action === 'status_changed') {
    return {
      ...base,
      type: 'update',
      fieldChange: {
        field: 'status',
        oldValue: humanizeStatus(raw.old_value),
        newValue: humanizeStatus(raw.new_value),
      },
    };
  }

  // Step lifecycle — field_name is "step <n>". These have no meaningful
  // old→new diff, so render as a create/delete-style row whose description
  // carries the summary. ActivityItem renders `description` for create and
  // delete rows; we route step_deleted through 'delete' and the rest
  // through 'create' so the summary line shows.
  if (raw.action === 'step_added' || raw.action === 'step_updated' || raw.action === 'step_deleted') {
    const stepLabel = raw.field_name ?? 'a step';
    if (raw.action === 'step_deleted') {
      return { ...base, type: 'delete', description: `deleted ${stepLabel}` };
    }
    const verb = raw.action === 'step_added' ? 'added' : 'updated';
    return { ...base, type: 'create', description: `${verb} ${stepLabel}` };
  }

  // Generic field update (title / priority_id / assigned_to / anything
  // else). Readable label; values rendered verbatim (raw id acceptable —
  // never fabricate a name).
  if (raw.field_name) {
    return {
      ...base,
      type: 'update',
      fieldChange: {
        field: fieldLabel(raw.field_name),
        oldValue: raw.old_value,
        newValue: raw.new_value,
      },
    };
  }

  // No field context — bare update row.
  return { ...base, type: 'update', description: 'updated this test case' };
}

export function TmActivitySection({ entityType, entityId }: TmActivitySectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Comments — reuse the TmCommentsSection spine (identical writes) ──
  const { data: commentRows = [], isLoading: isLoadingComments } = useTmComments(entityType, entityId);
  const addComment = useAddTmComment();

  const comments: CdsComment[] = useMemo(
    () =>
      commentRows.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.created_at,
        updatedAt: r.updated_at ?? undefined,
        isEdited: !!r.updated_at && r.updated_at !== r.created_at,
        parentId: r.parent_id,
        author: {
          id: r.author_id,
          name: r.author?.full_name || r.author?.email || 'Unknown',
          avatarUrl: r.author?.avatar_url ?? undefined,
          email: r.author?.email ?? undefined,
        },
      })),
    [commentRows],
  );

  // ── History — tm_activity_log, author profiles joined in a second pass
  //    (matches CatalystActivitySection's two-step id → profile lookup) ──
  const { data: historyRows = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['tm-activity', entityType, entityId],
    enabled: !!entityId,
    queryFn: async (): Promise<TmActivityRow[]> => {
      const { data, error } = await supabase
        .from('tm_activity_log')
        .select('id, action, field_name, old_value, new_value, user_id, metadata, created_at')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        console.error('[TmActivitySection] tm_activity_log select failed', error);
        return [];
      }
      if (!data?.length) return [];
      const userIds = [...new Set(data.map((e) => e.user_id).filter(Boolean))] as string[];
      if (userIds.length === 0) {
        return data.map((e) => ({ ...e, actor: null })) as TmActivityRow[];
      }
      const { data: actorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);
      const profileMap = new Map((actorProfiles ?? []).map((p) => [p.id, p]));
      return data.map((e) => ({
        ...e,
        actor: e.user_id ? profileMap.get(e.user_id) ?? null : null,
      })) as TmActivityRow[];
    },
  });

  const historyItems: CdsActivityItem[] = useMemo(
    () => historyRows.map(mapActivity),
    [historyRows],
  );

  // ── Current user + mentionable users (approved profiles) ──
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-mentions-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const mentionableUsers: CdsUser[] = useMemo(
    () =>
      profiles
        .filter((p: { full_name: string | null; email: string | null }) => p.full_name || p.email)
        .map((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }) => ({
          id: p.id,
          name: p.full_name || p.email || 'Unknown',
          avatarUrl: p.avatar_url,
          email: p.email ?? undefined,
        })),
    [profiles],
  );

  const currentUser: CdsUser | undefined = useMemo(() => {
    if (!user?.id) return undefined;
    const match = profiles.find((p: { id: string }) => p.id === user.id) as
      | { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
      | undefined;
    if (match) {
      return {
        id: match.id,
        name: match.full_name || match.email || 'You',
        avatarUrl: match.avatar_url,
        email: match.email ?? undefined,
      };
    }
    return { id: user.id, name: 'You' };
  }, [user?.id, profiles]);

  // ── Comment mutations — edit/delete write directly to tm_comments,
  //    mirroring CatalystActivitySection's ph_comments pattern. ──
  const editMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('tm_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-comments', entityType, entityId] });
      catalystToast.success('Comment updated');
    },
    onError: () => catalystToast.error('Failed to update comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tm_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-comments', entityType, entityId] });
      catalystToast.success('Comment deleted');
    },
    onError: () => catalystToast.error('Failed to delete comment'),
  });

  // Guard: nothing to render until the entity is resolved.
  if (!entityId) return null;

  return (
    <ActivityPanel
      comments={comments}
      historyItems={historyItems}
      currentUser={currentUser}
      mentionableUsers={mentionableUsers}
      onAddComment={(content) => addComment.mutateAsync({ entityType, entityId, content })}
      onAddReply={(parentId, content) =>
        addComment.mutateAsync({ entityType, entityId, content, parentId })
      }
      onEditComment={(id, content) => editMutation.mutateAsync({ id, content })}
      onDeleteComment={(id) => deleteMutation.mutateAsync(id)}
      isSubmitting={addComment.isPending}
      isLoadingComments={isLoadingComments}
      isLoadingHistory={isLoadingHistory}
      hiddenTabs={['worklog']}
      defaultTab="all"
      defaultSortOrder="newest"
    />
  );
}
