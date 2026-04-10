/**
 * StoryActivitySection — Jira-parity Activity with tabs: All | Comments | History
 * Underline tabs, clean comment input with quick-reply chips, "Pro tip: press M"
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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

type TabId = 'all' | 'comments' | 'history';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'comments', label: 'Comments' },
  { id: 'history', label: 'History' },
];

function getAvatarColor(name: string): string {
  const colors = ['#0052CC', '#00875A', '#FF5630', '#6554C0', '#FF991F', '#00B8D9', '#36B37E', '#E5493A'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatCommentDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), "MMMM d, yyyy 'at' h:mm a");
  } catch { return ''; }
}

export function StoryActivitySection({
  comments, history, commentsLoading, historyLoading,
  onAddComment, onDeleteComment, addCommentPending,
}: ActivityProps) {
  const [tab, setTab] = useState<TabId>('comments');
  const [addingComment, setAddingComment] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Press M to focus comment
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && !document.activeElement?.getAttribute('contenteditable')) {
        setAddingComment(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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

  return (
    <div style={{ padding: '0 32px 32px' }}>
      {/* Section header */}
      <div style={{ fontSize: 15, fontWeight: 600, color: '#172B4D', marginBottom: 12 }}>
        Activity
      </div>

      {/* Underline tabs — Jira style */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #EBECF0', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize: 14, fontWeight: tab === t.id ? 600 : 400, padding: '8px 16px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: tab === t.id ? '#0052CC' : '#5E6C84',
            borderBottom: tab === t.id ? '2px solid #0052CC' : '2px solid transparent',
            marginBottom: -2, transition: 'color 0.15s, border-color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Comment input — Jira style */}
      {(tab === 'comments' || tab === 'all') && (
        <div style={{ marginBottom: 20 }}>
          {addingComment ? (
            <div style={{ marginBottom: 8 }}>
              <StoryRichTextEditor
                content="" compact minHeight={80}
                placeholder="Add a comment..."
                onSave={(html) => { onAddComment(html); setAddingComment(false); }}
                onCancel={() => setAddingComment(false)}
              />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#DFE1E6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#42526E', flexShrink: 0,
                }}>CU</div>
                <div
                  onClick={() => setAddingComment(true)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 4,
                    border: '1px solid #DFE1E6', fontSize: 14, color: '#7A869A',
                    cursor: 'text', background: '#FAFBFC', minHeight: 80,
                  }}
                >
                  <div>Add a comment...</div>
                  {/* Quick-reply chips inside the input area */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {['Can I get more info...?', 'Status update...', 'Thanks...'].map(chip => (
                      <button key={chip} onClick={(e) => { e.stopPropagation(); onAddComment(chip); }}
                        style={{
                          fontSize: 13, color: '#42526E', padding: '4px 14px', borderRadius: 20,
                          border: '1px solid #DFE1E6', background: '#FFFFFF', cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                      >{chip}</button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Pro tip */}
              <div style={{ paddingLeft: 48, fontSize: 12, color: '#97A0AF' }}>
                <span style={{ fontWeight: 700 }}>Pro tip:</span> press{' '}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 3, border: '1px solid #DFE1E6',
                  background: '#F4F5F7', fontSize: 11, fontWeight: 600, color: '#42526E',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>M</span>
                {' '}to comment
              </div>
            </>
          )}
        </div>
      )}

      {/* ── All tab ── */}
      {tab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(commentsLoading || historyLoading) && (
            <div style={{ fontSize: 13, color: '#97A0AF' }}>Loading...</div>
          )}
          {allItems.length === 0 && !commentsLoading && !historyLoading && (
            <div style={{ fontSize: 14, color: '#97A0AF', textAlign: 'center', padding: '16px 0' }}>No activity yet</div>
          )}
          {allItems.map((item) => (
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
            <div style={{ fontSize: 13, color: '#97A0AF' }}>Loading comments...</div>
          ) : sortedComments.length === 0 ? (
            <div style={{ fontSize: 14, color: '#97A0AF', textAlign: 'center', padding: '16px 0' }}>No comments yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <div style={{ fontSize: 13, color: '#97A0AF' }}>Loading history...</div>
          ) : sortedHistory.length === 0 ? (
            <div style={{ fontSize: 14, color: '#97A0AF', textAlign: 'center', padding: '16px 0' }}>No changes recorded</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
  const avatarBg = getAvatarColor(comment.author_display_name || '');
  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative' }} className="group">
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: avatarBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
      }}>
        {getInitials(comment.author_display_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>{comment.author_display_name || 'Unknown'}</span>
        </div>
        <div style={{ fontSize: 12, color: '#6B778C', marginBottom: 6 }}>
          {formatCommentDate(comment.jira_created_at)}
        </div>
        <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: comment.body || '' }} />
        {confirmDeleteId === comment.id ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => { onDelete(comment.id); setConfirmDeleteId(null); }}
              style={{ fontSize: 12, color: '#DE350B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Confirm delete</button>
            <button onClick={() => setConfirmDeleteId(null)}
              style={{ fontSize: 12, color: '#42526E', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDeleteId(comment.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginTop: 6, color: '#97A0AF' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: '#DFE1E6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, color: '#42526E', flexShrink: 0,
      }}>
        {getInitials(entry.author_display_name)}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: '#172B4D', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600 }}>{entry.author_display_name || 'Unknown'}</span>
        {' changed '}
        <span style={{ fontWeight: 600 }}>{entry.field_name}</span>
        {entry.from_string && (
          <>{' '}<span style={{ color: '#6B778C' }}>{entry.from_string}</span> →</>
        )}
        {entry.to_string && (
          <>{' '}<span style={{ fontWeight: 600 }}>{entry.to_string}</span></>
        )}
        <span style={{ fontSize: 12, color: '#97A0AF', marginLeft: 8 }}>
          {formatCommentDate(entry.jira_created_at)}
        </span>
      </div>
    </div>
  );
}
