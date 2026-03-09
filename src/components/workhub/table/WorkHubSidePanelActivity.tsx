/**
 * WorkHubSidePanelActivity — Activity feed inside side panel
 * Reverse-chronological, comment input at bottom
 */
import { useState } from 'react';
import { AvatarCircle } from './WorkHubAssigneePicker';
import WorkHubStatusLozenge from './WorkHubStatusLozenge';
import type { WorkHubActivityEntry } from '@/services/workhub-service';
import { formatDistanceToNow } from 'date-fns';

interface WorkHubSidePanelActivityProps {
  activities: WorkHubActivityEntry[];
  onAddComment: (text: string) => void;
  isLoading?: boolean;
}

export default function WorkHubSidePanelActivity({ activities, onAddComment, isLoading }: WorkHubSidePanelActivityProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!comment.trim()) return;
    onAddComment(comment.trim());
    setComment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  const renderAction = (entry: WorkHubActivityEntry) => {
    switch (entry.action) {
      case 'status_changed':
        return (
          <span style={{ fontSize: 13, color: '#64748B' }}>
            Changed status from <strong style={{ color: '#0F172A' }}>{entry.old_value}</strong> to <strong style={{ color: '#0F172A' }}>{entry.new_value}</strong>
          </span>
        );
      case 'assigned':
        return <span style={{ fontSize: 13, color: '#64748B' }}>Assigned to <strong style={{ color: '#0F172A' }}>{entry.new_value}</strong></span>;
      case 'commented':
        return (
          <div style={{ background: '#F8FAFC', borderRadius: 6, padding: 12, fontSize: 13, color: '#0F172A', marginTop: 4, lineHeight: 1.5 }}>
            {entry.comment_text}
          </div>
        );
      case 'created':
        return <span style={{ fontSize: 13, color: '#64748B' }}>Created this item</span>;
      case 'deleted':
        return <span style={{ fontSize: 13, color: '#DC2626' }}>Deleted this item</span>;
      default:
        return <span style={{ fontSize: 13, color: '#64748B' }}>Updated <strong style={{ color: '#0F172A' }}>{entry.field_changed}</strong></span>;
    }
  };

  return (
    <div>
      {/* Activity list */}
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {isLoading && <div style={{ padding: 16, fontSize: 13, color: '#94A3B8' }}>Loading activity...</div>}
        {!isLoading && activities.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: '#94A3B8' }}>No activity yet</div>
        )}
        {activities.map(entry => (
          <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
            <AvatarCircle name={entry.actor_name} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{entry.actor_name}</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </span>
              </div>
              {renderAction(entry)}
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div style={{ borderTop: '0.75px solid rgba(15,23,42,0.06)', paddingTop: 12, marginTop: 8 }}>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          rows={2}
          style={{
            width: '100%', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6,
            padding: '8px 12px', fontSize: 13, color: '#0F172A', fontFamily: 'Inter, sans-serif',
            resize: 'vertical', outline: 'none', minHeight: 48,
            background: 'white',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)')}
        />
        {comment.trim() && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button onClick={handleSubmit} style={{
              padding: '4px 14px', fontSize: 12, fontWeight: 600, color: 'white',
              background: '#2563EB', border: 'none', borderRadius: 4, cursor: 'pointer',
            }}>
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
