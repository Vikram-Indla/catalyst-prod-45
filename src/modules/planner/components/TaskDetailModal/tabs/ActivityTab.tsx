/**
 * ACTIVITY TAB
 * Filter buttons (All, Comments, History) + activity list + comment composer
 */

import React, { useState } from 'react';
import { List, MessageSquare, Clock, Send } from 'lucide-react';
import { useTaskComments, useAddComment, useTaskActivity } from '../../../hooks/useTaskDetails';
import { useAuth } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';

interface ActivityTabProps {
  taskId: string;
  currentUserInitials: string;
  currentUserColor: string;
}

type FilterType = 'all' | 'comments' | 'history';

export const ActivityTab: React.FC<ActivityTabProps> = ({
  taskId,
  currentUserInitials,
  currentUserColor,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();
  
  const { data: comments = [] } = useTaskComments(taskId);
  const { data: history = [] } = useTaskActivity(taskId);
  const addCommentMutation = useAddComment();

  const filters = [
    { id: 'all' as FilterType, label: 'All', icon: List },
    { id: 'comments' as FilterType, label: 'Comments', icon: MessageSquare },
    { id: 'history' as FilterType, label: 'History', icon: Clock },
  ];

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string | null) => {
    if (!name) return '#94a3b8';
    const colors = ['#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    addCommentMutation.mutate(
      { taskId, content: newComment, authorId: user.id },
      {
        onSuccess: () => setNewComment(''),
      }
    );
  };

  const formatActionText = (action: string) => {
    // Convert snake_case to readable text
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

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

      {/* COMMENTS */}
      {(activeFilter === 'all' || activeFilter === 'comments') && comments.length > 0 && (
        <div className="activity-list">
          {comments.map((comment) => (
            <div key={comment.id} className="activity-item">
              <span
                className="activity-avatar"
                style={{ backgroundColor: getAvatarColor(comment.author?.full_name) }}
              >
                {getInitials(comment.author?.full_name)}
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
      {(activeFilter === 'all' || activeFilter === 'history') && history.length > 0 && (
        <div className="history-list">
          {history.map((event) => (
            <div key={event.id} className="history-item">
              <div className="history-icon">
                <Clock size={16} />
              </div>
              <div className="history-content">
                <div className="history-text">
                  <strong>{formatActionText(event.action_type)}</strong>
                  {event.actor && (
                    <>
                      {' '}by <strong>{event.actor.full_name || 'Unknown'}</strong>
                    </>
                  )}
                </div>
                <div className="history-time">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMMENT COMPOSER */}
      <div className="comment-composer">
        <span className="comment-avatar" style={{ backgroundColor: currentUserColor }}>
          {currentUserInitials}
        </span>
        <div className="comment-input-wrapper">
          <textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div className="comment-footer">
            <button
              className="send-btn"
              onClick={handleAddComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
