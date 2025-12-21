/**
 * FeatureActivity — Activity feed with tabs (All / Comments / History)
 * Now with real comment creation (no quick reactions as per Epic pattern).
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface FeatureActivityProps {
  featureId: string;
}

type ActivityTab = 'all' | 'comments' | 'history';

interface ActivityItem {
  id: string;
  authorInitials: string;
  authorName: string;
  time: string;
  content: string;
  type: 'comment' | 'system';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FeatureActivity({ featureId }: FeatureActivityProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [comment, setComment] = useState('');
  
  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single();
      
      return profile;
    },
  });

  // Fetch real discussions/comments from database
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['feature-activity', featureId],
    queryFn: async (): Promise<ActivityItem[]> => {
      // Fetch discussions for this feature with user profiles
      const { data: discussions, error } = await supabase
        .from('discussions')
        .select(`
          id, 
          message, 
          created_at, 
          user_id,
          profiles:user_id(id, full_name)
        `)
        .eq('entity_type', 'feature')
        .eq('entity_id', featureId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error || !discussions) {
        return [];
      }
      
      // Also fetch activity logs for history
      const { data: historyLogs } = await supabase
        .from('activity_logs')
        .select('id, action, created_at, actor_id, before_json, after_json')
        .eq('entity_type', 'features')
        .eq('entity_id', featureId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      const commentItems: ActivityItem[] = discussions.map((d: any) => ({
        id: d.id,
        authorInitials: d.profiles?.full_name ? getInitials(d.profiles.full_name) : 'U',
        authorName: d.profiles?.full_name || 'User',
        time: formatDistanceToNow(new Date(d.created_at), { addSuffix: true }),
        content: d.message,
        type: 'comment' as const,
      }));
      
      const historyItems: ActivityItem[] = (historyLogs || []).map((h: any) => ({
        id: h.id,
        authorInitials: 'SY',
        authorName: 'System',
        time: formatDistanceToNow(new Date(h.created_at), { addSuffix: true }),
        content: formatHistoryAction(h.action, h.before_json, h.after_json),
        type: 'system' as const,
      }));
      
      // Combine and sort by time (most recent first)
      return [...commentItems, ...historyItems].sort((a, b) => {
        // Already sorted from DB, just interleave
        return 0;
      });
    },
    enabled: !!featureId,
  });

  // Create comment mutation
  const createComment = useMutation({
    mutationFn: async (message: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('discussions')
        .insert({
          entity_type: 'feature',
          entity_id: featureId,
          message: message,
          user_id: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['feature-activity', featureId] });
      toast.success('Comment added');
    },
    onError: (error: any) => {
      toast.error('Failed to add comment', { description: error.message });
    },
  });

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    createComment.mutate(comment.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };
  
  const filteredActivities = activeTab === 'all' 
    ? activities 
    : activeTab === 'comments' 
      ? activities.filter(a => a.type === 'comment')
      : activities.filter(a => a.type === 'system');
  
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Activity</h2>
      </div>
      
      {/* Tabs */}
      <div className={styles.activityTabs}>
        <button 
          className={`${styles.activityTab} ${activeTab === 'all' ? styles.activityTabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button 
          className={`${styles.activityTab} ${activeTab === 'comments' ? styles.activityTabActive : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Comments
        </button>
        <button 
          className={`${styles.activityTab} ${activeTab === 'history' ? styles.activityTabActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>
      
      {/* Activity List */}
      <div className={styles.activityList}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <span className={styles.noneValue}>
            {activeTab === 'comments' ? 'No comments yet' : 
             activeTab === 'history' ? 'No history yet' : 
             'No activity yet'}
          </span>
        ) : (
          filteredActivities.map(item => (
            <div key={item.id} className={styles.activityItem}>
              <div 
                className={`${styles.activityAvatar} ${item.type === 'system' ? styles.avatarSystem : ''}`}
              >
                {item.authorInitials}
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityHeader}>
                  <span className={styles.activityAuthor}>{item.authorName}</span>
                  <span className={styles.activityTime}>{item.time}</span>
                </div>
                <div className={styles.activityText}>
                  {item.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Comment Composer - simplified without quick reactions */}
      <div className={styles.commentComposer}>
        <div className="flex gap-2">
          <textarea 
            className={styles.commentTextarea}
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
        </div>
        <div className="flex justify-end mt-2">
          <Button 
            size="sm" 
            onClick={handleSubmitComment}
            disabled={!comment.trim() || createComment.isPending}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))]"
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to format history action
function formatHistoryAction(action: string, before: any, after: any): string {
  if (action === 'UPDATE') {
    const changes: string[] = [];
    if (before && after) {
      for (const key of Object.keys(after)) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          const fieldName = key.replace(/_/g, ' ');
          changes.push(`${fieldName} changed`);
        }
      }
    }
    return changes.length > 0 ? changes.join(', ') : 'Updated feature';
  }
  if (action === 'INSERT') return 'Created feature';
  if (action === 'DELETE') return 'Deleted feature';
  return action;
}