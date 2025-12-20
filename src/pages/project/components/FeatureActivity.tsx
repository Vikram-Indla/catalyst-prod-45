/**
 * FeatureActivity — Activity feed with tabs (All / Comments / History)
 * Fetches real data from discussions table, shows "No activity" if empty.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
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
  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [comment, setComment] = useState('');
  
  // Fetch real discussions/comments from database
  const { data: activities = [] } = useQuery({
    queryKey: ['feature-activity', featureId],
    queryFn: async (): Promise<ActivityItem[]> => {
      // Fetch discussions for this feature
      const { data: discussions, error } = await supabase
        .from('discussions')
        .select('id, message, created_at, user_id')
        .eq('entity_type', 'feature')
        .eq('entity_id', featureId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error || !discussions) {
        return [];
      }
      
      // Map to activity items
      return discussions.map(d => ({
        id: d.id,
        authorInitials: 'U',
        authorName: 'User',
        time: formatDistanceToNow(new Date(d.created_at), { addSuffix: true }),
        content: d.message,
        type: 'comment' as const,
      }));
    },
    enabled: !!featureId,
  });
  
  const filteredActivities = activeTab === 'all' 
    ? activities 
    : activeTab === 'comments' 
      ? activities.filter(a => a.type === 'comment')
      : activities.filter(a => a.type === 'system');
  
  const quickReplies = [
    { emoji: '👍', text: 'Looks good' },
    { emoji: '👋', text: 'Need help?' },
    { emoji: '🚫', text: 'This is blocked' },
    { emoji: '❓', text: 'Can you clarify?' },
    { emoji: '✅', text: 'On track' },
  ];
  
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
        {filteredActivities.length === 0 ? (
          <span className={styles.noneValue}>No activity yet</span>
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
      
      {/* Comment Composer */}
      <div className={styles.commentComposer}>
        <textarea 
          className={styles.commentTextarea}
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className={styles.quickReplies}>
          {quickReplies.map((qr, i) => (
            <button 
              key={i} 
              className={styles.quickReply}
              onClick={() => setComment(qr.text)}
            >
              {qr.emoji} {qr.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
