import { useState, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsActivityItem, CdsUser, CdsQuickReply } from '@/components/catalyst-ds';

interface ActivityTabProps {
  requestId: string;
}

const HISTORY_PAGE_SIZE = 50;

const QUICK_REPLIES: CdsQuickReply[] = [
  { label: 'Status update...', template: 'Status update: ' },
  { label: 'Thanks...', template: 'Thanks for the update. ' },
  { label: 'Agree...', template: 'Agreed. ' },
];

function mapCommentToCds(raw: any, profilesMap: Record<string, any>): CdsComment {
  const isSystem = raw.user_id === '00000000-0000-0000-0000-000000000000';
  const profile = profilesMap[raw.user_id];

  return {
    id: raw.id,
    author: {
      id: raw.user_id,
      name: isSystem ? 'System' : (profile?.full_name || profile?.email || 'Unknown User'),
      avatarUrl: profile?.avatar_url || null,
      email: profile?.email,
    },
    content: raw.message,
    createdAt: raw.created_at,
    isSystem,
  };
}

function mapAuditToCds(raw: any): CdsActivityItem {
  const action = raw.action?.toUpperCase();

  return {
    id: raw.id,
    type: action === 'CREATE' ? 'create' : action === 'DELETE' ? 'delete' : 'update',
    actor: {
      id: raw.actor_id || 'system',
      name: raw.actor_name || 'System',
    },
    timestamp: raw.created_at,
    description: action === 'CREATE' ? 'created this request' : undefined,
    fieldChange: raw.field_changed
      ? {
          field: raw.field_changed,
          oldValue: raw.old_value,
          newValue: raw.new_value,
        }
      : undefined,
  };
}

export function ActivityTab({ requestId }: ActivityTabProps) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<CdsUser | undefined>();

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

  const profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const mentionableUsers: CdsUser[] = profiles.map((p: any) => ({
    id: p.id,
    name: p.full_name || p.email || 'Unknown',
    avatarUrl: p.avatar_url,
    email: p.email,
  }));

  useQuery({
    queryKey: ['current-user-for-activity'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const profile = profilesMap[user.id];
      setCurrentUser({
        id: user.id,
        name: profile?.full_name || profile?.email || 'You',
        avatarUrl: profile?.avatar_url,
        email: profile?.email,
      });
      return user;
    },
    enabled: profiles.length > 0,
  });

  const { data: discussions = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['business-request-discussions', requestId],
    queryFn: async () => {
      const { data, error } = await typedQuery('business_request_discussions')
        .select('id, message, user_id, created_at')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!requestId,
  });

  const {
    data: auditPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistory,
  } = useInfiniteQuery({
    queryKey: ['business-request-audit', requestId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * HISTORY_PAGE_SIZE;
      const to = from + HISTORY_PAGE_SIZE - 1;

      const { data, error, count } = await typedQuery('business_request_audit_logs')
        .select('*', { count: 'exact' })
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: data || [], count: count || 0, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      const totalLoaded = (lastPage.page + 1) * HISTORY_PAGE_SIZE;
      return totalLoaded < lastPage.count ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!requestId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await typedQuery('business_request_discussions').insert({
        business_request_id: requestId,
        message,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-discussions', requestId] });
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await typedQuery('business_request_discussions')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-discussions', requestId] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  const comments: CdsComment[] = discussions.map((d: any) => mapCommentToCds(d, profilesMap));

  const allLogs = auditPages?.pages.flatMap((page) => page.logs) || [];
  const historyItems: CdsActivityItem[] = allLogs.map(mapAuditToCds);

  const handleAddComment = useCallback(
    (content: string) => addCommentMutation.mutateAsync(content),
    [addCommentMutation]
  );

  const handleDeleteComment = useCallback(
    (id: string) => deleteCommentMutation.mutateAsync(id),
    [deleteCommentMutation]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage) fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  return (
    <div className="px-5 py-4">
      <ActivityPanel
        comments={comments}
        historyItems={historyItems}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        isSubmitting={addCommentMutation.isPending}
        isLoadingComments={isLoadingComments}
        isLoadingHistory={isLoadingHistory}
        hasMoreHistory={!!hasNextPage}
        onLoadMoreHistory={handleLoadMore}
        isLoadingMoreHistory={isFetchingNextPage}
        quickReplies={QUICK_REPLIES}
        defaultTab="all"
        defaultSortOrder="newest"
      />
    </div>
  );
}
