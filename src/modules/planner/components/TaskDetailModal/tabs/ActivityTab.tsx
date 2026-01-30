/**
 * Activity Tab Component
 * All/Comments/History filter + activity feed + comment composer
 */

import React, { useState } from 'react';
import { List, MessageSquare, Clock, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useTaskActivity, useTaskComments, useAddComment } from '../../../hooks/useTaskDetails';
import { useAuth } from '@/lib/auth';

interface ActivityTabProps {
  taskId: string;
}

type FilterType = 'all' | 'comments' | 'history';

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#dc2626'];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function ActivityTab({ taskId }: ActivityTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();

  const { data: activities = [], isLoading: activitiesLoading } = useTaskActivity(taskId);
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(taskId);
  const addComment = useAddComment();

  const filters = [
    { id: 'all' as FilterType, label: 'All', icon: List },
    { id: 'comments' as FilterType, label: 'Comments', icon: MessageSquare },
    { id: 'history' as FilterType, label: 'History', icon: Clock },
  ];

  const handleSendComment = () => {
    if (!newComment.trim() || !user) return;
    addComment.mutate({ 
      taskId, 
      content: newComment.trim(), 
      authorId: user.id 
    }, {
      onSuccess: () => setNewComment(''),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSendComment();
    }
  };

  const isLoading = activitiesLoading || commentsLoading;

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

      {isLoading ? (
        <div className="empty-state">
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <>
          {/* COMMENTS */}
          {(activeFilter === 'all' || activeFilter === 'comments') && comments.length > 0 && (
            <div className="activity-list">
              {comments.map((comment) => (
                <div key={comment.id} className="activity-item">
                  <span
                    className="activity-avatar"
                    style={{ backgroundColor: stringToColor(comment.author?.full_name || '') }}
                  >
                    {getInitials(comment.author?.full_name || null)}
                  </span>
                  <div className="activity-content">
                    <div className="activity-header">
                      <span className="activity-author">{comment.author?.full_name || 'Unknown'}</span>
                      <span className="activity-time">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="activity-body">{comment.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HISTORY */}
          {(activeFilter === 'all' || activeFilter === 'history') && activities.length > 0 && (
            <div className="history-list">
              {activities.map((event) => (
                <div key={event.id} className="history-item">
                  <div className="history-icon">
                    <Clock size={16} />
                  </div>
                  <div className="history-content">
                    <div className="history-text">
                      <strong>{event.action_type}</strong>
                      {event.actor?.full_name && (
                        <> by <strong>{event.actor.full_name}</strong></>
                      )}
                    </div>
                    <div className="history-time">
                      {format(new Date(event.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* COMMENT COMPOSER */}
      <div className="comment-composer">
        <span 
          className="comment-avatar"
          style={{ backgroundColor: user?.email ? stringToColor(user.email) : '#2563eb' }}
        >
          {user?.email ? getInitials(user.email.split('@')[0]) : 'U'}
        </span>
        <div className="comment-input-wrapper">
          <textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="comment-footer">
            <button 
              className="send-btn"
              onClick={handleSendComment}
              disabled={!newComment.trim() || addComment.isPending}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
