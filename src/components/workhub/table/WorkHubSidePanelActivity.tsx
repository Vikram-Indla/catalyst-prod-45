/**
 * WorkHubSidePanelActivity — Activity feed (Stage E: polished)
 * Comment input with Cmd+Enter, empty state, accessible
 */
import { useState } from 'react';
import { AvatarCircle } from './WorkHubAssigneePicker';
import type { WorkHubActivityEntry } from '@/services/workhub-service';
import { formatDistanceToNow } from 'date-fns';

interface WorkHubSidePanelActivityProps {
  activities: WorkHubActivityEntry[];
  onAddComment: (text: string) => void;
  isLoading?: boolean;
}

export default function WorkHubSidePanelActivity({ activities, onAddComment, isLoading }: WorkHubSidePanelActivityProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = () => { if (!comment.trim()) return; onAddComment(comment.trim()); setComment(''); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); } };

  const renderAction = (entry: WorkHubActivityEntry) => {
    switch (entry.action) {
      case 'status_changed':
        return <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Changed status from <strong style={{ fontWeight: 650, color: 'var(--fg-1)' }}>{entry.old_value}</strong> to <strong style={{ fontWeight: 650, color: 'var(--fg-1)' }}>{entry.new_value}</strong></span>;
      case 'assigned':
        return <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Assigned to <strong style={{ fontWeight: 650, color: 'var(--fg-1)' }}>{entry.new_value}</strong></span>;
      case 'commented':
        return <div style={{ background: 'var(--bg-1)', borderRadius: 6, padding: 12, fontSize: 13, color: 'var(--fg-1)', marginTop: 4, lineHeight: 1.5 }}>{entry.comment_text}</div>;
      case 'created':
        return <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Created this item</span>;
      case 'deleted':
        return <span style={{ fontSize: 13, color: 'var(--sem-danger)' }}>Deleted this item</span>;
      default:
        return <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Updated <strong style={{ fontWeight: 650, color: 'var(--fg-1)' }}>{entry.field_changed}</strong></span>;
    }
  };

  return (
    <div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {isLoading && (
          <div style={{ padding: '8px 0' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
                <div className="wh-skeleton" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="wh-skeleton" style={{ height: 12, width: '60%', borderRadius: 4, marginBottom: 6 }} />
                  <div className="wh-skeleton" style={{ height: 10, width: '40%', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && activities.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--fg-4)' }}>No activity recorded</div>
        )}
        {activities.map(entry => (
          <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
            <AvatarCircle name={entry.actor_name} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>{entry.actor_name}</span>
                <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </span>
              </div>
              {renderAction(entry)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))', paddingTop: 12, marginTop: 8 }}>
        <textarea
          value={comment} onChange={e => setComment(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Add a comment..." rows={2}
          aria-label="Add a comment"
          style={{
            width: '100%', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 6,
            padding: '8px 12px', fontSize: 13, color: 'var(--fg-1)', fontFamily: 'Inter, sans-serif',
            resize: 'vertical', outline: 'none', minHeight: 48, background: 'var(--bg-app)',
            transition: 'border-color 150ms',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--cp-blue)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--bd-default, rgba(255,255,255,0.08))')}
        />
        {comment.trim() && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>⌘↵ to send</span>
            <button onClick={handleSubmit} style={{ padding: '4px 14px', fontSize: 12, fontWeight: 600, color: 'var(--bg-app)', background: 'var(--cp-blue)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}
