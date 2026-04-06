/**
 * SidePanelComments — Comments tab with Jira comment thread + local input
 */
import { useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { useWorkItemComments, useAddWorkItemComment } from '@/hooks/useWorkHub';
import { AvatarCircle } from './WorkHubAssigneePicker';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';

interface Props {
  workItemId: string;
}

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const days = differenceInDays(new Date(), d);
  if (days > 7) return format(d, 'MMM d, yyyy');
  return formatDistanceToNow(d, { addSuffix: true });
}

export default function SidePanelComments({ workItemId }: Props) {
  const { data: comments = [], isLoading } = useWorkItemComments(workItemId);
  const addComment = useAddWorkItemComment(workItemId);
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    addComment.mutate(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSend(); }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '16px 0' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 0' }}>
            <div className="wh-skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="wh-skeleton" style={{ height: 12, width: '50%', borderRadius: 4, marginBottom: 8 }} />
              <div className="wh-skeleton" style={{ height: 10, width: '80%', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Comment list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--fg-4)' }}>
            No comments yet. Be the first to add one.
          </div>
        )}
        {comments.map((c: any) => (
          <div key={c.id} style={{
            background: 'var(--bg-app)', border: '1px solid var(--bd-subtle, rgba(255,255,255,0.05))', borderRadius: 6,
            padding: '12px 16px', marginBottom: 12,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AvatarCircle name={c.author_name} size={28} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>{c.author_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {c.is_internal && (
                  <span style={{ fontSize: 10, fontWeight: 600, background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 3 }}>Internal</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {relativeTime(c.comment_created_at)}
                </span>
                {c.comment_updated_at && (
                  <span style={{ fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>(edited)</span>
                )}
              </div>
            </div>
            {/* Body */}
            <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, marginTop: 8, whiteSpace: 'pre-wrap' }}>
              {c.body_text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--bd-subtle, rgba(255,255,255,0.05))', padding: '12px 0 0', background: 'var(--bg-app)' }}>
        <textarea
          value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Add a comment..." rows={2}
          style={{
            width: '100%', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 6,
            padding: '8px 12px', fontSize: 14, color: 'var(--fg-1)', fontFamily: 'Inter, sans-serif',
            resize: 'vertical', outline: 'none', minHeight: 50, maxHeight: 120, background: 'var(--bg-app)',
            transition: 'border-color 150ms',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--cp-blue)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--bd-default, rgba(255,255,255,0.08))')}
        />
        {text.trim() && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>⌘↵ to send</span>
            <button onClick={handleSend} disabled={addComment.isPending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 14px', fontSize: 12, fontWeight: 600, color: 'var(--bg-app)', background: 'var(--cp-blue)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              <SendHorizonal size={14} />
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
