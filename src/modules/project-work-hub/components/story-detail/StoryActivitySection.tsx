/**
 * StoryActivitySection — Tabs: Comments + History
 * Comments: add, view, delete
 * History: field change audit trail
 */
import React, { useState } from 'react';
import { Trash2, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { StoryRichTextEditor } from './StoryRichTextEditor';
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

type TabId = 'comments' | 'history';

const TAB_BTN: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, padding: '6px 12px', border: 'none',
  cursor: 'pointer', background: 'transparent', color: '#505258',
  borderRadius: 3, height: 28,
};
const TAB_ACTIVE: React.CSSProperties = { ...TAB_BTN, background: '#DEEBFF', color: '#0747A6' };

const AVATAR: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', background: '#E2E8F0',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 10, fontWeight: 700, color: '#64748B', flexShrink: 0,
};

const AVATAR_SM: React.CSSProperties = { ...AVATAR, width: 24, height: 24, fontSize: 9 };

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

  return (
    <div style={{ padding: '0 24px 24px' }}>
      {/* Section header */}
      <div style={{
        fontSize: 12, fontWeight: 600, color: '#505258', textTransform: 'uppercase',
        letterSpacing: '0.03em', marginBottom: 12,
      }}>
        Activity
      </div>

      {/* Tabs + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <button style={tab === 'comments' ? TAB_ACTIVE : TAB_BTN} onClick={() => setTab('comments')}>
          Comments {comments.length > 0 && `(${comments.length})`}
        </button>
        <button style={tab === 'history' ? TAB_ACTIVE : TAB_BTN} onClick={() => setTab('history')}>
          History {history.length > 0 && `(${history.length})`}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setNewestFirst(!newestFirst)}
          style={{ ...TAB_BTN, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
        >
          <ArrowUpDown size={12} />
          {newestFirst ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {/* Comments tab */}
      {tab === 'comments' && (
        <div>
          {/* Add comment */}
          {addingComment ? (
            <div style={{ marginBottom: 16 }}>
              <StoryRichTextEditor
                content=""
                compact
                minHeight={80}
                placeholder="Add a comment..."
                onSave={(html) => {
                  onAddComment(html);
                  setAddingComment(false);
                }}
                onCancel={() => setAddingComment(false)}
              />
            </div>
          ) : (
            <div
              onClick={() => setAddingComment(true)}
              style={{
                padding: '10px 14px', borderRadius: 6, border: '1px solid #E0E0E0',
                fontSize: 14, color: '#6B6E76', cursor: 'text', marginBottom: 16,
                background: '#FAFAFA',
              }}
            >
              Add a comment...
            </div>
          )}

          {/* Comment list */}
          {commentsLoading ? (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading comments...</div>
          ) : sortedComments.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No comments yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sortedComments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10, position: 'relative' }} className="group">
                  <div style={AVATAR}>{getInitials(c.author_display_name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#292A2E' }}>
                        {c.author_display_name || 'Unknown'}
                      </span>
                      <span style={{ fontSize: 12, color: '#6B6E76' }}>
                        {c.jira_created_at ? formatDistanceToNow(new Date(c.jira_created_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: 14, color: '#292A2E', lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: c.body || '' }}
                    />
                    {/* Delete button on hover */}
                    {confirmDeleteId === c.id ? (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button
                          onClick={() => { onDeleteComment(c.id); setConfirmDeleteId(null); }}
                          style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >Confirm delete</button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ fontSize: 12, color: '#505258', background: 'none', border: 'none', cursor: 'pointer' }}
                        >Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginTop: 4, color: '#94A3B8' }}
                        title="Delete comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading history...</div>
          ) : sortedHistory.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No changes recorded</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedHistory.map(h => (
                <div key={h.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={AVATAR_SM}>{getInitials(h.author_display_name)}</div>
                  <div style={{ flex: 1, fontSize: 13, color: '#292A2E', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{h.author_display_name || 'Unknown'}</span>
                    {' changed '}
                    <span style={{ fontWeight: 600 }}>{h.field_name}</span>
                    {h.from_string && (
                      <>
                        {' from '}
                        <span style={{ textDecoration: 'line-through', color: '#DC2626' }}>{h.from_string}</span>
                      </>
                    )}
                    {h.to_string && (
                      <>
                        {' to '}
                        <span style={{ fontWeight: 600, color: '#006644' }}>{h.to_string}</span>
                      </>
                    )}
                    <span style={{ fontSize: 12, color: '#6B6E76', marginLeft: 8 }}>
                      {h.jira_created_at ? formatDistanceToNow(new Date(h.jira_created_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
