/**
 * FeatureActivity — Activity feed with tabs (All / Comments / History)
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export function FeatureActivity({ featureId }: FeatureActivityProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [comment, setComment] = useState('');
  
  // Fetch activity (mock for now)
  const { data: activities = [] } = useQuery({
    queryKey: ['feature-activity', featureId],
    queryFn: async (): Promise<ActivityItem[]> => {
      // Mock data matching screenshot
      return [
        {
          id: '1',
          authorInitials: 'SA',
          authorName: 'Sarah Ahmed',
          time: '2 hours ago',
          content: "Updated on the security review - we're still waiting for InfoSec to complete their assessment. @Omar can you follow up with the team today?",
          type: 'comment',
        },
        {
          id: '2',
          authorInitials: 'OT',
          authorName: 'Omar Taleb',
          time: 'Yesterday',
          content: "The Absher integration is progressing well. We've completed the sandbox testing and are ready for production credentials. Waiting on the official API keys from NIC.",
          type: 'comment',
        },
        {
          id: '3',
          authorInitials: 'SY',
          authorName: 'System',
          time: '2 days ago',
          content: 'Health changed from On Track to At Risk',
          type: 'system',
        },
      ];
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
          <span className={styles.noneValue}>No activity yet.</span>
        ) : (
          filteredActivities.map(item => (
            <div key={item.id} className={styles.activityItem}>
              <div 
                className={styles.activityAvatar}
                style={item.type === 'system' ? { background: '#8b7355' } : undefined}
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
