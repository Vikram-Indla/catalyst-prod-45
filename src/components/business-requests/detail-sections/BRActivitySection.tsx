/**
 * BRActivitySection — Comments + History interleaved Jira-parity activity feed
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ActivityTab = 'comments' | 'history' | 'all';

interface BRActivitySectionProps {
  requestId: string;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd MMM yyyy, HH:mm'); } catch { return d; }
}

export function BRActivitySection({ requestId }: BRActivitySectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActivityTab>('comments');
  const [newComment, setNewComment] = useState('');

  // Fetch audit history
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['business-request-audit', requestId],
    queryFn: async () => {
      const { data } = await typedQuery('business_request_audit_logs')
        .select('*')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
    enabled: !!requestId,
  });

  // Fetch comments (stored in business_request_audit_logs with action='COMMENT')
  const comments = auditLogs.filter(l => l.action === 'COMMENT');
  const historyLogs = auditLogs.filter(l => l.action !== 'COMMENT');

  // Add comment
  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', authUser?.id).single();
      await typedQuery('business_request_audit_logs').insert({
        business_request_id: requestId,
        actor_id: authUser?.id,
        actor_name: profile?.full_name || authUser?.email || 'Unknown',
        action: 'COMMENT',
        field_changed: null,
        old_value: null,
        new_value: body,
      });
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['business-request-audit', requestId] });
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const handleSubmitComment = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    addCommentMutation.mutate(trimmed);
  };

  const tabs: { id: ActivityTab; label: string }[] = [
    { id: 'comments', label: 'Comments' },
    { id: 'history', label: 'History' },
    { id: 'all', label: 'All' },
  ];

  const renderComment = (entry: any) => (
    <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback style={{ background: '#0052CC', color: '#FFF', fontSize: 11, fontWeight: 700 }}>
          {getInitials(entry.actor_name)}
        </AvatarFallback>
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>{entry.actor_name || 'Unknown'}</span>
          {' '}
          <span style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(entry.created_at)}</span>
        </div>
        <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.new_value}</div>
      </div>
    </div>
  );

  const renderHistoryEntry = (entry: any) => (
    <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback style={{ background: '#DFE1E6', color: '#42526E', fontSize: 11, fontWeight: 700 }}>
          {getInitials(entry.actor_name)}
        </AvatarFallback>
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.5, marginBottom: 2 }}>
          <span style={{ fontWeight: 600 }}>{entry.actor_name || 'System'}</span>
          {' changed '}
          <span style={{ fontWeight: 600 }}>{entry.field_changed || 'a field'}</span>
        </div>
        <div style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(entry.created_at)}</div>
        {(entry.old_value || entry.new_value) && (
          <div style={{ marginTop: 6, fontSize: 14, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#6B778C' }}>{entry.old_value || 'None'}</span>
            <ArrowRight size={12} color="#97A0AF" />
            <span style={{ fontWeight: 500 }}>{entry.new_value || 'None'}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div data-section="activity" style={{ borderTop: '1px solid #EBECF0', paddingTop: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#172B4D', marginBottom: 12 }}>Activity</div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
              background: activeTab === t.id ? '#DEEBFF' : 'transparent',
              color: activeTab === t.id ? '#0747A6' : '#42526E',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Comment input */}
      {(activeTab === 'comments' || activeTab === 'all') && (
        <div style={{ marginBottom: 20 }}>
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            style={{
              width: '100%', minHeight: 60, padding: '10px 12px', border: '1px solid #DFE1E6',
              borderRadius: 4, fontSize: 14, color: '#172B4D', resize: 'vertical',
              outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#4C9AFF'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#DFE1E6'; }}
          />
          {newComment.trim() && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={handleSubmitComment}
                disabled={addCommentMutation.isPending}
                style={{
                  padding: '6px 16px', borderRadius: 4, border: 'none',
                  background: '#0052CC', color: '#FFF', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                {addCommentMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {activeTab === 'comments' && (
        <div>
          {comments.length === 0 && <div style={{ padding: '16px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No comments yet</div>}
          {comments.map(renderComment)}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {historyLogs.length === 0 && <div style={{ padding: '16px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity recorded</div>}
          {historyLogs.map(renderHistoryEntry)}
        </div>
      )}

      {activeTab === 'all' && (
        <div>
          {auditLogs.length === 0 && <div style={{ padding: '16px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity yet</div>}
          {auditLogs.map(entry =>
            entry.action === 'COMMENT' ? renderComment(entry) : renderHistoryEntry(entry)
          )}
        </div>
      )}
    </div>
  );
}
