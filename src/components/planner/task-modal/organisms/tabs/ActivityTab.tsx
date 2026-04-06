// ============================================================================
// ORGANISM: ActivityTab — Activity tab content
// ============================================================================

import React, { useState } from 'react';
import { List, MessageSquare, Clock } from 'lucide-react';
import { COLORS } from '../../colors';
import { ActivityItem, HistoryItem, CommentComposer } from '../../molecules';
import { Comment, HistoryEvent } from '../../types';

type FilterType = 'all' | 'comments' | 'history';

interface ActivityTabProps {
  comments: Comment[];
  history: HistoryEvent[];
  onAddComment: (content: string) => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  comments,
  history,
  onAddComment
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <List size={16} /> },
    { id: 'comments', label: 'Comments', icon: <MessageSquare size={16} /> },
    { id: 'history', label: 'History', icon: <Clock size={16} /> }
  ];

  return (
    <div>
      {/* FILTER BUTTONS */}
      <div
        style={{
          display: 'flex',
          backgroundColor: COLORS.surfacePage,
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px'
        }}
      >
        {filters.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveFilter(id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: activeFilter === id ? COLORS.surfaceCard : 'transparent',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: activeFilter === id ? COLORS.textPrimary : COLORS.textMuted,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: activeFilter === id ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* COMMENTS */}
      {(activeFilter === 'all' || activeFilter === 'comments') && comments.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '24px'
          }}
        >
          {comments.map((comment) => (
            <ActivityItem
              key={comment.id}
              author={comment.author}
              authorInitials={comment.authorInitials}
              authorColor={comment.authorColor}
              content={comment.content}
              createdAt={comment.createdAt}
            />
          ))}
        </div>
      )}

      {/* HISTORY */}
      {(activeFilter === 'all' || activeFilter === 'history') && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {history.map((event, idx) => (
            <HistoryItem
              key={event.id}
              action={event.action}
              author={event.author}
              timestamp={event.timestamp}
              isLast={idx === history.length - 1}
            />
          ))}
        </div>
      )}

      {/* COMMENT COMPOSER */}
      <CommentComposer onSubmit={onAddComment} />
    </div>
  );
};

export default ActivityTab;
