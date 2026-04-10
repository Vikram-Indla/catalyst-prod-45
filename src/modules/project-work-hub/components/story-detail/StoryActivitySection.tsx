/**
 * StoryActivitySection — Jira-style Activity with tabs: All | Comments | History
 * Comment input with quick-reply chips, delete with confirmation
 */
import React, { Suspense, useState, useMemo } from 'react';
import { Trash2, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
const StoryRichTextEditor = React.lazy(() => import('./StoryRichTextEditor').then(m => ({ default: m.StoryRichTextEditor })));
import { getInitials } from '../../utils/backlog.utils';

interface Comment {
  id: string;
  author_display_name: string | null;
  body: string | null;
  jira_created_at: string | null;
}

interface HistoryEntry {
  id: string;
  author_display_name: string | null;
  field_name: string | null;
  from_string: string | null;
  to_string: string | null;
  jira_created_at: string | null;
}

interface ActivityProps {
  comments: Comment[];
  history: HistoryEntry[];
  commentsLoading: boolean;
  historyLoading: boolean;
  onAddComment: (body: string) => void;
  onDeleteComment: (id: string) => void;
  addCommentPending: boolean;
}

type TabId = 'all' | 'comments' | 'history';

const TAB_BTN: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, padding: '4px 12px', border: '1px solid #E2E8F0',
  cursor: 'pointer', background: '#FFFFFF', color: '#505258',
  borderRadius: 3, height: 28,
};
const TAB_ACTIVE: React.CSSProperties = {
  ...TAB_BTN, background: '#DEEBFF', color: '#0747A6', borderColor: '#B3D4FF',
};

const AVATAR: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', background: '#E2E8F0',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 10, fontWeight: 700, color: '#64748B', flexShrink: 0,
};

const AVATAR_SM: React.CSSProperties = { ...AVATAR, width: 24, height: 24, fontSize: 9 };

const QUICK_CHIP: React.CSSProperties = {
  fontSize: 12, color: '#505258', padding: '4px 12px', borderRadius: 16,
  border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer',
};

export function StoryActivitySection({
  comments, history, commentsLoading, historyLoading,
  onAddComment, onDeleteComment, addCommentPending,
}: ActivityProps) {
  const [tab, setTab] = useState<TabId>('comments');
  const [addingComment, setAddingComment] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedComments = [...comments].sort((a, b) => {
    const da = new Date(a.jira_created_at || 0).getTime();
    const db = new Date(b.jira_created_at || 0).getTime();
    return newestFirst ? db - da : da - db;
  });

  const sortedHistory = [...history].sort((a, b) => {
    const da = new Date(a.jira_created_at || 0).getTime();
    const db = new Date(b.jira_created_at || 0).getTime();
    return newestFirst ? db - da : da - db;
  });

  // Merge all items for "All" tab
  const allItems = useMemo(() => {
    const items: Array<{ type: 'comment' | 'history'; date: string; data: any }> = [
      ...comments.map(c => ({ type: 'comment' as const, date: c.jira_created_at || '', data: c })),
      ...history.map(h => ({ type: 'history' as const, date: h.jira_created_at || '', data: h })),
    ];
    items.sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return newestFirst ? db - da : da - db;
    });
    return items;
  }, [comments, history, newestFirst]);

  const handleQuickComment = (text: string) => {
    onAddComment(text);
  };

  return (
    <div style={{ padding: '0 32px 32px' }}>
      {/* Section header */}
      <div style={{ fontSize: 15, fontWeight: 600, color: '#292A2E', marginBottom: 12 }}>
        Activity
      </div>

      {/* Tabs + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <button style={tab === 'all' ? TAB_ACTIVE : TAB_BTN} onClick={() => setTab('all')}>All</button>
        <button style={tab === 'comments' ? TAB_ACTIVE : TAB_BTN} onClick={() => setTab('comments')}>
          Comments{comments.length > 0 ? ` (${comments.length})` : ''}
        </button>
        <button style={tab === 'history' ? TAB_ACTIVE : TAB_BTN} onClick={() => setTab('history')}>
          History{history.length > 0 ? ` (${history.length})` : ''}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setNewestFirst(!newestFirst)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#505258' }}>
          <ArrowUpDown size={12} />
          {newestFirst ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {/* Add comment (shown on Comments and All tabs) */}
      {(tab === 'comments' || tab === 'all') && (
        <>
          {addingComment ? (
            <div style={{ marginBottom: 16 }}>
              <Suspense fallback={<div style={{ padding: 16, color: '#6B6E76' }}>Loading editor...</div>}>
              <StoryRichTextEditor
                content="" compact minHeight={80}
                placeholder="Add a comment..."
                onSave={(html) => { onAddComment(html); setAddingComment(false); }}
                onCancel={() => setAddingComment(false)}
              />
              </Suspense>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={AVATAR}>CU</div>
                <div onClick={() => setAddingComment(true)}
                  style={{ flex: 1, padding: '8px 14px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 14, color: '#6B6E76', cursor: 'text', background: '#FAFAFA' }}>
                  Add a comment...
                </div>
              </div>
              {/* Quick-reply chips */}
              <div style={{ display: 'flex', gap: 6, paddingLeft: 36 }}>
                <button style={QUICK_CHIP} onClick={() => handleQuickComment('Status update...')}>Status update...</button>
                <button style={QUICK_CHIP} onClick={() => handleQuickComment('Thanks...')}>Thanks...</button>
                <button style={QUICK_CHIP} onClick={() => handleQuickComment('Agree...')}>Agree...</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── All tab ── */}
      {tab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(commentsLoading || historyLoading) && (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading...</div>
          )}
          {allItems.length === 0 && !commentsLoading && !historyLoading && (
            <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No activity yet</div>
          )}
          {allItems.map((item, idx) => (
            item.type === 'comment'
              ? <CommentItem key={`c-${item.data.id}`} comment={item.data} onDelete={onDeleteComment} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />
              : <HistoryItem key={`h-${item.data.id}`} entry={item.data} />
          ))}
        </div>
      )}

      {/* ── Comments tab ── */}
      {tab === 'comments' && (
        <div>
          {commentsLoading ? (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading comments...</div>
          ) : sortedComments.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No comments yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sortedComments.map(c => (
                <CommentItem key={c.id} comment={c} onDelete={onDeleteComment} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading history...</div>
          ) : sortedHistory.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No changes recorded</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedHistory.map(h => <HistoryItem key={h.id} entry={h} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function CommentItem({ comment, onDelete, confirmDeleteId, setConfirmDeleteId }: {
  comment: Comment; onDelete: (id: string) => void;
  confirmDeleteId: string | null; setConfirmDeleteId: (id: string | null) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, position: 'relative' }} className="group">
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
        {getInitials(comment.author_display_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#292A2E' }}>{comment.author_display_name || 'Unknown'}</span>
          <span style={{ fontSize: 12, color: '#6B6E76' }}>
            {comment.jira_created_at ? formatDistanceToNow(new Date(comment.jira_created_at), { addSuffix: true }) : ''}
          </span>
        </div>
        <div style={{ fontSize: 14, color: '#292A2E', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.body || '') }} />
        {confirmDeleteId === comment.id ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={() => { onDelete(comment.id); setConfirmDeleteId(null); }}
              style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Confirm delete</button>
            <button onClick={() => setConfirmDeleteId(null)}
              style={{ fontSize: 12, color: '#505258', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDeleteId(comment.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginTop: 4, color: '#94A3B8' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
        {getInitials(entry.author_display_name)}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: '#292A2E', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600 }}>{entry.author_display_name || 'Unknown'}</span>
        {' changed '}
        <span style={{ fontWeight: 600 }}>{entry.field_name}</span>
        {entry.from_string && (
          <>{' from '}<span style={{ textDecoration: 'line-through', color: '#DC2626' }}>{entry.from_string}</span></>
        )}
        {entry.to_string && (
          <>{' to '}<span style={{ fontWeight: 600, color: '#006644' }}>{entry.to_string}</span></>
        )}
        <span style={{ fontSize: 12, color: '#6B6E76', marginLeft: 8 }}>
          {entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}
        </span>
      </div>
    </div>
  );
}

