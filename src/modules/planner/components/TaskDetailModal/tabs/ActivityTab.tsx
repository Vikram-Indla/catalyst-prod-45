// ============================================================
// ACTIVITY TAB
// Filter buttons + activity/comments list + comment composer
// ============================================================

import React, { useState } from 'react';
import { List, MessageSquare, Clock, Send } from 'lucide-react';
import type { ActivityItem } from '../types';

interface ActivityTabProps {
  activities: ActivityItem[];
  onAddComment: (content: string) => void;
}

type FilterType = 'all' | 'comments' | 'history';

export const ActivityTab: React.FC<ActivityTabProps> = ({
  activities,
  onAddComment,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [newComment, setNewComment] = useState('');

  const filteredActivities = activities.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'comments') return item.type === 'comment';
    if (activeFilter === 'history') return item.type === 'history';
    return true;
  });

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment);
    setNewComment('');
  };

  const filters = [
    { id: 'all' as FilterType, label: 'All', icon: List },
    { id: 'comments' as FilterType, label: 'Comments', icon: MessageSquare },
    { id: 'history' as FilterType, label: 'History', icon: Clock },
  ];

  return (
    <div className="activity-tab">
      {/* FILTER BUTTONS */}
      <div className="activity-filters">
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`activity-filter-btn ${activeFilter === id ? 'active' : ''}`}
            onClick={() => setActiveFilter(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ACTIVITY LIST */}
      <div className="activity-list">
        {filteredActivities.length === 0 ? (
          <div className="empty-state">
            <List size={52} />
            <h3>No activity yet</h3>
            <p>Activity will appear here as changes are made</p>
          </div>
        ) : (
          filteredActivities.map((item) => (
            <div key={item.id} className="activity-item">
              <span
                className="activity-avatar"
                style={{ backgroundColor: item.author_color }}
              >
                {item.author_initials}
              </span>
              <div className="activity-content">
                <div className="activity-header">
                  <span className="activity-author">{item.author}</span>
                  <span className="activity-time">{item.created_at}</span>
                </div>
                <div className="activity-body">
                  {item.type === 'history' && item.action ? (
                    <span>{item.action}</span>
                  ) : (
                    item.content
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* COMMENT COMPOSER */}
      <div className="comment-composer">
        <span className="comment-avatar">U</span>
        <div className="comment-input-wrapper">
          <textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div className="comment-footer">
            <button className="send-btn" onClick={handleSendComment}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
