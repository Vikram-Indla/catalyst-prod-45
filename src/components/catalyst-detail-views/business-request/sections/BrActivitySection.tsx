/**
 * BrActivitySection — Business Request activity panel.
 *
 * Thin BR-side data adapter that mounts the canonical `ActivityPanel`
 * UI primitive (same surface used by every issue type — tabs, composer,
 * Jira-parity comment toolbar). The adapter pattern mirrors
 * BrDescriptionSection: BRs live in a separate set of tables, so the
 * canonical CatalystActivitySection (hard-wired to ph_issues /
 * ph_comments / ph_activity_log / ph_comment_reactions) cannot be
 * reused directly — the work-item lookup against ph_issues returns
 * null for BR UUIDs and disables every downstream query.
 *
 * Data tables (keyed on business_requests.id):
 *   - ph_request_comments        → Comments tab + All tab comment rows
 *   - ph_request_audit_log       → History tab + All tab change rows
 *
 * Out of scope for BR (no schema backing — same as Jira's BR view):
 *   - Reactions (no ph_request_comment_reactions table)
 *   - Reply threading (no parent_comment_id on ph_request_comments)
 *   - Jira-mirrored authors (BR comments are Catalyst-native only)
 *   - Work log (no BR work-log model — tab renders empty,
 *               matching a ticket with zero logged entries)
 *   - Comments AI summarisation (BR uses a separate AI flow)
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { catalystToast } from '@/lib/catalystToast';
import { ActivityPanel } from '@/components/catalyst-ds';
import type {
  CdsComment,
  CdsActivityItem,
  CdsUser,
  CdsQuickReply,
} from '@/components/catalyst-ds';
import { resolveAvatarUrl } from '@/lib/avatars';

interface BrActivitySectionProps {
  /** business_requests.id (UUID). When null/empty, the section
   *  renders disabled — same pattern as CatalystActivitySection
   *  while it waits for resolvedWorkItemId. */
  requestId: string;
  isOpen: boolean;
}

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Status update...', template: 'Status update: ' },
  { label: 'Thanks...', template: 'Thanks for the update. ' },
  { label: 'Agree...', template: 'Agreed. ' },
];

function mapComment(raw: any): CdsComment {
  const profile = raw.author;
  return {
    id: raw.id,
    author: {
      id: raw.author_id || 'unknown',
      name: profile?.full_name || profile?.email || 'Unknown',
      avatarUrl:
        resolveAvatarUrl(profile?.full_name) ?? profile?.avatar_url ?? null,
      email: profile?.email,
    },
    content: raw.body || '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isEdited: raw.updated_at && raw.updated_at !== raw.created_at,
    parentId: null,
  };
}

function mapActivity(raw: any): CdsActivityItem {
  const profile = raw.actor;
  const action = raw.action;
  let type: CdsActivityItem['type'] = 'update';
  if (action === 'created' || action === 'create') type = 'create';
  else if (action === 'deleted' || action === 'delete') type = 'delete';

  return {
    id: raw.id,
    type,
    actor: {
      id: raw.user_id || 'system',
      name: profile?.full_name || 'System',
      avatarUrl:
        resolveAvatarUrl(profile?.full_name) ?? profile?.avatar_url ?? null,
    },
    timestamp: raw.created_at,
    description: type === 'create' ? 'created this item' : undefined,
    fieldChange: raw.field_name
      ? {
          field: raw.field_name,
          oldValue: raw.old_value,
          newValue: raw.new_value,
        }
      : undefined,
  };
}

export function BrActivitySection({
  requestId,
  isOpen,
}: BrActivitySectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

  const enabled = !!requestId && isOpen;

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

  const mentionableUsers: CdsUser[] = profiles.map((p: any) => ({
    id: p.id,
    name: p.full_name || p.email || 'Unknown',
    avatarUrl: p.avatar_url,
    email: p.email,
  }));

  useQuery({
    queryKey: ['current-user-profile', user?.id],
    enabled: !!user?.id && profiles.length > 0,
    queryFn: async () => {
      const match = profiles.find((p: any) => p.id === user!.id);
      if (match) {
        setCurrentUser({
          id: match.id,
          name: match.full_name || match.email || 'You',
          avatarUrl: match.avatar_url,
          email: match.email,
        });
      }
      return match;
    },
  });

  // Comments — ph_request_comments keyed on request_id.
  // Polling backup at 4s matches the canonical so realtime gaps
  // (Supabase publication not enabled, dropped websocket) still
  // feel near-instant.
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['br-comments', requestId],
    enabled,
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_request_comments')
        .select('id, body, author_id, created_at, updated_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[BrActivitySection] ph_request_comments select failed', error);
        return [];
      }
      if (!data?.length) return [];
      const authorIds = [
        ...new Set(data.map((c: any) => c.author_id).filter(Boolean)),
      ];
      if (authorIds.length === 0) {
        return data.map((c: any) => ({ ...c, author: null }));
      }
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', authorIds as string[]);
      const profileMap = new Map(
        (authorProfiles ?? []).map((p) => [p.id, p]),
      );
      return data.map((c: any) => ({
        ...c,
        author: c.author_id ? profileMap.get(c.author_id) ?? null : null,
      }));
    },
  });

  // History — ph_request_audit_log keyed on request_id.
  const { data: historyItems = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['br-activity', requestId],
    enabled,
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_request_audit_log')
        .select(
          'id, request_id, action, field_name, old_value, new_value, user_id, metadata, created_at',
        )
        .eq('request_id', requestId)
        // Mirror the canonical's defensive filter — if any path ever
        // writes a comment-added audit row it would duplicate the
        // Comments feed in the All tab.
        .neq('field_name', 'comment')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[BrActivitySection] ph_request_audit_log select failed', error);
        return [];
      }
      if (!data?.length) return [];
      const userIds = [
        ...new Set(data.map((e: any) => e.user_id).filter(Boolean)),
      ];
      if (userIds.length === 0) {
        return data.map((e: any) => ({ ...e, actor: null }));
      }
      const { data: actorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds as string[]);
      const profileMap = new Map(
        (actorProfiles ?? []).map((p) => [p.id, p]),
      );
      return data.map((e: any) => ({
        ...e,
        actor: e.user_id ? profileMap.get(e.user_id) ?? null : null,
      }));
    },
  });

  // Realtime — invalidate the React-Query caches whenever a row
  // for this BR is inserted / updated / deleted on either table.
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`br-activity-realtime:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_request_comments',
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['br-comments', requestId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_request_audit_log',
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['br-activity', requestId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, requestId, queryClient]);

  const mappedComments: CdsComment[] = comments.map(mapComment);
  const mappedHistory: CdsActivityItem[] = historyItems.map(mapActivity);

  const addMutation = useMutation({
    mutationFn: async ({ body }: { body: string }) => {
      if (!requestId) {
        throw new Error('Business request not resolved yet — try again in a moment.');
      }
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('ph_request_comments')
        .insert({
          request_id: requestId,
          body,
          author_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-comments', requestId] });
      catalystToast.success('Comment added');
    },
    onError: () => catalystToast.error('Failed to add comment'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await (supabase as any)
        .from('ph_request_comments')
        .update({ body, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-comments', requestId] });
      catalystToast.success('Comment updated');
    },
    onError: () => catalystToast.error('Failed to update comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Mirror canonical: clean up any markdown-image attachments
      // uploaded into this comment body so storage doesn't leak.
      const { data: row } = await (supabase as any)
        .from('ph_request_comments')
        .select('body')
        .eq('id', id)
        .maybeSingle();
      const body = (row as { body?: string } | null)?.body ?? '';
      const paths: string[] = [];
      const re = /!\[[^\]]*\]\(([^)]+)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const url = m[1];
        const marker = '/storage/v1/object/public/attachments/';
        const idx = url.indexOf(marker);
        if (idx !== -1) paths.push(url.slice(idx + marker.length));
      }
      if (paths.length > 0) {
        await supabase.storage.from('attachments').remove(paths);
      }
      const { error } = await (supabase as any)
        .from('ph_request_comments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-comments', requestId] });
      catalystToast.success('Comment deleted');
    },
    onError: () => catalystToast.error('Failed to delete comment'),
  });

  const handleAdd = useCallback(
    (content: string) => addMutation.mutateAsync({ body: content }),
    [addMutation],
  );
  const handleEdit = useCallback(
    (id: string, content: string) =>
      editMutation.mutateAsync({ id, body: content }),
    [editMutation],
  );
  const handleDelete = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  return (
    <div
      style={{
        borderTop: '1px solid var(--ds-border-subtle, #EBECF0)',
        paddingTop: 20,
        marginTop: 8,
      }}
    >
      <ActivityPanel
        comments={mappedComments}
        historyItems={mappedHistory}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        onAddComment={handleAdd}
        onEditComment={handleEdit}
        onDeleteComment={handleDelete}
        isSubmitting={addMutation.isPending}
        isLoadingComments={isLoadingComments}
        isLoadingHistory={isLoadingHistory}
        quickReplies={QUICK_REPLIES}
        defaultTab="all"
        defaultSortOrder="newest"
      />
    </div>
  );
}

export default BrActivitySection;
