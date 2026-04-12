/**
 * StoryActivitySection — 1:1 Jira parity Activity panel
 * Pill tab bar (All | Comments | History) + sort toggle + comment composer + history items
 * All tokens reverse-engineered from Jira's actual DOM
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Trash2, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { StoryRichTextEditor } from './StoryRichTextEditor';
import { resolveDisplayHtml } from './adf-utils';

// ─── Types ──────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────
function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#0052CC', '#00875A', '#FF5630', '#6554C0', '#FF991F', '#00B8D9', '#36B37E', '#E5493A'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch { return ''; }
}

/** Detect if a value looks like a Jira issue key (e.g. BAU-4771) */
function isIssueKey(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[A-Z]{2,10}-\d+$/.test(val.trim());
}

/** Derive action verb from field_name */
function getActionVerb(entry: HistoryEntry): string {
  if (!entry.from_string && entry.to_string) return 'created the';
  if (entry.field_name?.toLowerCase() === 'description') return 'updated the';
  return 'changed the';
}

// ─── Jira tokens ────────────────────────────────────────
const T = {
  textPrimary: '#292A2E',
  textSubtle: '#505258',
  textMuted: '#6B6E76',
  textBrand: '#1868DB',
  bgSurface: '#FFFFFF',
  bgSelected: '#E9F2FE',
  bgHover: '#F0F1F2',
  bgTableHeader: '#F0F1F2',
  borderDefault: '#DDDEE1',
  borderSelected: '#1868DB',
} as const;

// ─── Tab button styles ──────────────────────────────────
const TAB_BASE: React.CSSProperties = {
  fontSize: 13.33, fontWeight: 500, height: 26, padding: '0 12px',
  borderRadius: 2, cursor: 'pointer', lineHeight: 'normal',
  transition: 'background 150ms, border-color 150ms, color 150ms',
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    ...TAB_BASE,
    background: active ? T.bgSelected : 'transparent',
    border: active ? `0.556px solid ${T.borderSelected}` : '0.556px solid transparent',
    color: active ? T.textBrand : T.textSubtle,
  };
}

// ─── Main component ─────────────────────────────────────
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
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey
        && document.activeElement?.tagName !== 'INPUT'
        && document.activeElement?.tagName !== 'TEXTAREA'
        && !document.activeElement?.getAttribute('contenteditable')) {
        setAddingComment(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const sortedComments = useMemo(() =>
    [...comments].sort((a, b) => {
      const da = new Date(a.jira_created_at || 0).getTime();
      const db = new Date(b.jira_created_at || 0).getTime();
      return newestFirst ? db - da : da - db;
    }), [comments, newestFirst]);

  const sortedHistory = useMemo(() =>
    [...history].sort((a, b) => {
      const da = new Date(a.jira_created_at || 0).getTime();
      const db = new Date(b.jira_created_at || 0).getTime();
      return newestFirst ? db - da : da - db;
    }), [history, newestFirst]);

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
      {/* ═══ Section heading — Jira: h2, 16px/700 ═══ */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, lineHeight: '20px', margin: '0 0 12px 0', padding: 0 }}>
        Activity
      </h2>

      {/* ═══ Tab bar — Jira pill tabs ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        {(['all', 'comments', 'history'] as TabId[]).map(id => (
          <button key={id} type="button" onClick={() => setTab(id)} style={tabStyle(tab === id)}>
            {id === 'all' ? 'All' : id === 'comments' ? `Comments${comments.length > 0 ? ` (${comments.length})` : ''}` : `History${history.length > 0 ? ` (${history.length})` : ''}`}
          </button>
        ))}
        {/* Sort toggle — right-aligned */}
        <button type="button" onClick={() => setNewestFirst(n => !n)}
          style={{
            marginLeft: 'auto', fontSize: 14, fontWeight: 500, color: T.textSubtle,
            background: 'transparent', border: 'none', borderRadius: 3, padding: '2px 0',
            height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
          {newestFirst ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {/* ═══ Comment composer ═══ */}
      {(tab === 'comments' || tab === 'all') && (
        <div style={{ marginBottom: 16 }}>
          {addingComment ? (
            <div style={{ marginBottom: 8 }}>
              <StoryRichTextEditor
                content="" compact minHeight={80}
                placeholder="Add a comment..."
                onSave={(val) => { onAddComment(val); setAddingComment(false); }}
                onCancel={() => setAddingComment(false)}
              />
            </div>
          ) : (
            <>
              {/* Avatar + placeholder input */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 9999, background: '#DFE1E6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: '#42526E', flexShrink: 0, marginTop: 4,
                }}>CU</div>
                <div style={{ flex: 1 }}>
                  {/* Placeholder input area */}
                  <button type="button" onClick={() => setAddingComment(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'flex-start',
                      background: T.bgSurface, borderRadius: 4, border: 'none',
                      color: T.textMuted, fontSize: 14, fontWeight: 400, lineHeight: '20px',
                      padding: '12px 6px 12px 20px', height: 90, width: '100%',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    Add a comment...
                  </button>

                  {/* Quick-reply pills */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {['Status update...', 'Thanks...', 'Agree...'].map(chip => (
                      <button key={chip} type="button"
                        onClick={(e) => { e.stopPropagation(); onAddComment(chip); }}
                        style={{
                          display: 'inline-flex', background: 'transparent', border: 'none',
                          borderRadius: 3, color: T.textSubtle, fontSize: 14, fontWeight: 500,
                          padding: '2px 12px', height: 24, cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.bgHover; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >{chip}</button>
                    ))}
                  </div>

                  {/* Pro tip */}
                  <div style={{ fontSize: 14, fontWeight: 400, color: T.textPrimary, lineHeight: '20px', marginTop: 4 }}>
                    Pro tip: press <span style={{ fontWeight: 600 }}>M</span> to comment
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ All tab ═══ */}
      {tab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(commentsLoading || historyLoading) && (
            <div style={{ fontSize: 14, color: T.textMuted }}>Loading...</div>
          )}
          {allItems.length === 0 && !commentsLoading && !historyLoading && (
            <div style={{ fontSize: 14, color: T.textMuted, fontStyle: 'italic' }}>No activity yet</div>
          )}
          {allItems.map(item =>
            item.type === 'comment'
              ? <CommentItem key={`c-${item.data.id}`} comment={item.data} onDelete={onDeleteComment} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />
              : <HistoryItemRow key={`h-${item.data.id}`} entry={item.data} />
          )}
        </div>
      )}

      {/* ═══ Comments tab ═══ */}
      {tab === 'comments' && (
        <div>
          {commentsLoading ? (
            <div style={{ fontSize: 14, color: T.textMuted }}>Loading comments...</div>
          ) : sortedComments.length === 0 ? (
            <div style={{ fontSize: 14, color: T.textMuted, fontStyle: 'italic' }}>No comments yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sortedComments.map(c => (
                <CommentItem key={c.id} comment={c} onDelete={onDeleteComment} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ History tab ═══ */}
      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div style={{ fontSize: 14, color: T.textMuted }}>Loading history...</div>
          ) : sortedHistory.length === 0 ? (
            <div style={{ fontSize: 14, color: T.textMuted, fontStyle: 'italic' }}>No changes recorded</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sortedHistory.map(h => <HistoryItemRow key={h.id} entry={h} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CommentItem ────────────────────────────────────────
function CommentItem({ comment, onDelete, confirmDeleteId, setConfirmDeleteId }: {
  comment: Comment; onDelete: (id: string) => void;
  confirmDeleteId: string | null; setConfirmDeleteId: (id: string | null) => void;
}) {
  const avatarBg = getAvatarColor(comment.author_display_name || '');
  return (
    <div style={{ display: 'flex', gap: 8, margin: '8px 0 32px 0', minHeight: 40 }} className="group">
      {/* Avatar — 36px outer, 32px inner with white ring */}
      <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#FFFFFF',
          border: '2px solid #FFFFFF',
        }}>
          {getInitials(comment.author_display_name)}
        </div>
      </div>
      {/* Text column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        {/* Action line */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{comment.author_display_name || 'Unknown'}</span>
          <span style={{ fontSize: 14, fontWeight: 400, color: T.textPrimary }}>commented</span>
        </div>
        {/* Timestamp */}
        <div style={{ fontSize: 12, fontWeight: 400, color: T.textPrimary, lineHeight: '16px' }}>
          {relativeTime(comment.jira_created_at)}
        </div>
        {/* Body */}
        <div
          className="catalyst-comment-body"
          style={{ fontSize: 14, color: T.textPrimary, lineHeight: '20px', marginTop: 4 }}
          dangerouslySetInnerHTML={{ __html: resolveDisplayHtml(comment.body) }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') {
              const src = (target as HTMLImageElement).src;
              if (src) window.open(src, '_blank', 'noopener,noreferrer');
            }
          }}
        />
        {/* Delete */}
        {confirmDeleteId === comment.id ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => { onDelete(comment.id); setConfirmDeleteId(null); }}
              style={{ fontSize: 12, color: '#DE350B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Confirm delete</button>
            <button type="button" onClick={() => setConfirmDeleteId(null)}
              style={{ fontSize: 12, color: T.textSubtle, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDeleteId(comment.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginTop: 6, color: '#97A0AF' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── HistoryItemRow — Jira-exact layout ─────────────────
function HistoryItemRow({ entry }: { entry: HistoryEntry }) {
  const avatarBg = getAvatarColor(entry.author_display_name || '');
  const verb = getActionVerb(entry);

  return (
    <div style={{ display: 'flex', gap: 8, margin: '8px 0 32px 0', minHeight: 40, fontSize: 14, lineHeight: '20px', color: T.textPrimary }}>
      {/* Avatar — 36px outer, 32px inner with white ring */}
      <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#FFFFFF',
          border: '2px solid #FFFFFF',
        }}>
          {getInitials(entry.author_display_name)}
        </div>
      </div>
      {/* Text column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Action summary line */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{entry.author_display_name || 'Unknown'}</span>
          <span style={{ fontSize: 14, fontWeight: 400, color: T.textPrimary }}>{verb}</span>
          {entry.field_name && (
            <span style={{ fontSize: 14, fontWeight: 500, color: T.textPrimary }}>{entry.field_name}</span>
          )}
        </div>
        {/* Timestamp */}
        <div style={{ fontSize: 12, fontWeight: 400, color: T.textPrimary, lineHeight: '16px' }}>
          {relativeTime(entry.jira_created_at)}
        </div>
        {/* Field change: old → new */}
        {(entry.from_string || entry.to_string) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 14, color: T.textSubtle }}>
            {entry.from_string && (
              <span style={{ color: T.textPrimary, fontWeight: 400 }}>{entry.from_string}</span>
            )}
            {entry.from_string && entry.to_string && (
              <span style={{ color: T.textSubtle }}>→</span>
            )}
            {entry.to_string && (
              isIssueKey(entry.to_string)
                ? <span style={{ color: T.textBrand, fontWeight: 400, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                  >{entry.to_string}</span>
                : <span style={{ color: T.textPrimary, fontWeight: 400 }}>{entry.to_string}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
