import React, { useState } from 'react';
import { useWorkItemActivity, type ActivityEntry, type Reaction } from '@/hooks/useWorkItemActivity';
import { Loader2, Trash2, SmilePlus } from 'lucide-react';

type Tab = 'all' | 'comments' | 'history';

const EMOJI_OPTIONS = ['👍', '👎', '❤️', '🎉', '😕', '🔥'];

interface Props {
  workItemId: string;
}

export function ActivityFeed({ workItemId }: Props) {
  const [tab, setTab] = useState<Tab>('all');
  const [commentText, setCommentText] = useState('');
  const { entries, isLoading, addComment, isAddingComment, deleteComment, toggleReaction } = useWorkItemActivity(workItemId);

  const filtered = entries.filter(e => {
    if (tab === 'comments') return e.kind === 'comment';
    if (tab === 'history') return e.kind === 'history';
    return true;
  });

  const handleSubmit = () => {
    if (!commentText.trim() || isAddingComment) return;
    addComment(commentText.trim());
    setCommentText('');
  };

  const quickReplies = ['Status update...', 'Thanks...', 'Agree...'];

  return (
    <div style={{ marginTop: 16 }}>
      <h3 className="text-[16px] font-semibold mb-3" style={{ color: 'var(--fg-1)' }}>Activity</h3>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '2px solid var(--divider)', marginBottom: 16 }}>
        {(['all', 'comments', 'history'] as Tab[]).map(t => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[13px] capitalize transition-colors ${isActive ? 'bg-[var(--cp-blue-wash)]' : 'bg-transparent'}`}
              style={{
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--cp-blue)' : 'var(--fg-2)',
                borderBottom: isActive ? '2px solid var(--cp-blue)' : '2px solid transparent',
                borderRadius: isActive ? '3px 3px 0 0' : 0,
                marginBottom: -2,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Comment Input */}
      <div className="flex gap-3 mb-5">
        <UserAvatar />
        <div className="flex-1">
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Add a comment..."
            className="w-full rounded text-[14px] resize-none focus:outline-none transition-colors bg-[var(--bg-1)]"
            style={{
              border: '1px solid var(--divider)',
              padding: '10px 12px',
              minHeight: 40,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--cp-blue)'; e.currentTarget.style.backgroundColor = 'var(--bg-app)'; e.currentTarget.style.minHeight = '60px'; }}
            onBlur={e => { if (!commentText) { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.backgroundColor = 'var(--bg-1)'; e.currentTarget.style.minHeight = '40px'; } }}
          />
          {commentText && (
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1.5">
                {quickReplies.map(q => (
                  <button
                    key={q}
                    className="text-[12px] px-2.5 py-0.5 rounded-full hover:bg-[#1A1A1A]"
                    style={{ border: '1px solid var(--divider)', color: 'var(--fg-2)' }}
                    onClick={() => setCommentText(q.replace('...', ''))}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                disabled={isAddingComment}
                className="px-3 py-1 text-[12px] font-semibold rounded text-white bg-[var(--cp-blue)]"
              >
                {isAddingComment ? '…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-[rgba(237,237,237,0.40)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-[13px]" style={{ color: 'var(--fg-4)' }}>No activity yet</div>
      ) : (
        <div className="flex flex-col">
          {filtered.map(entry => (
            <div key={entry.id} className="flex gap-3 mb-5 group">
              <ActivityAvatar name={entry.actor_name} />
              <div className="flex-1 min-w-0">
                {entry.kind === 'comment' ? (
                  <CommentEntry
                    entry={entry}
                    onDelete={() => deleteComment(entry.id)}
                    onToggleReaction={(emoji) => toggleReaction({ commentId: entry.id, emoji })}
                  />
                ) : (
                  <HistoryEntry entry={entry} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comment Entry ─────────────────────────────────────────
function CommentEntry({ entry, onDelete, onToggleReaction }: {
  entry: ActivityEntry;
  onDelete: () => void;
  onToggleReaction: (emoji: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-[14px]">
          <strong style={{ color: 'var(--fg-1)' }}>{entry.actor_name}</strong>
          <span style={{ color: 'var(--fg-2)' }}> added a comment</span>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[rgba(248,113,113,0.06)]"
          title="Delete comment"
        >
          <Trash2 size={12} className="text-[#DC2626]" />
        </button>
      </div>
      <div className="text-[12px] mb-1" style={{ color: 'var(--fg-3)' }}>{entry.relative_time}</div>
      <div
        className="rounded text-[13px] bg-[var(--bg-1)]"
        style={{ padding: 8, borderRadius: 4, lineHeight: '20px', color: 'var(--fg-1)' }}
      >
        {entry.body}
      </div>

      {/* Reactions */}
      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
        {(entry.reactions || []).map(r => (
          <button
            key={r.emoji}
            onClick={() => onToggleReaction(r.emoji)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] transition-colors ${r.reacted_by_me ? 'bg-[var(--cp-blue-wash)]' : 'bg-[var(--bg-app)]'}`}
            style={{
              border: r.reacted_by_me ? '1px solid var(--cp-blue)' : '1px solid var(--divider)',
              color: r.reacted_by_me ? 'var(--cp-blue)' : 'var(--fg-2)',
            }}
          >
            {r.emoji} {r.count}
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="p-1 rounded hover:bg-[#1A1A1A] transition-colors"
            style={{ color: 'var(--fg-4)' }}
          >
            <SmilePlus size={14} />
          </button>
          {pickerOpen && (
            <div
              className="absolute left-0 bottom-full mb-1 flex gap-0.5 rounded-md p-1 bg-[var(--cp-float)]"
              style={{ border: '1px solid var(--divider)', boxShadow: '0 8px 20px rgba(0,0,0,0.18)', zIndex: 9999 }}
            >
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => { onToggleReaction(e); setPickerOpen(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#1A1A1A] text-[16px]"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── History Entry ──────────────────────────────────────────
function HistoryEntry({ entry }: { entry: ActivityEntry }) {
  if (entry.action === 'commented') return null; // skip duplicated comment logs

  return (
    <>
      <div className="text-[14px]">
        <strong style={{ color: 'var(--fg-1)' }}>{entry.actor_name}</strong>
        <span style={{ color: 'var(--fg-2)' }}> changed the {formatFieldName(entry.field_name)}</span>
      </div>
      <div className="text-[12px] mb-0.5" style={{ color: 'var(--fg-3)' }}>{entry.relative_time}</div>
      {(entry.old_value || entry.new_value) && (
        <div className="flex items-center gap-2 mt-0.5">
          <ChangePill value={entry.old_value} />
          <span className="text-[12px]" style={{ color: 'var(--fg-4)' }}>→</span>
          <ChangePill value={entry.new_value} />
        </div>
      )}
    </>
  );
}

function ChangePill({ value }: { value?: string | null }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--divider)]"
      style={{ border: '1px solid var(--divider)', color: 'var(--fg-2)' }}
    >
      {value || '—'}
    </span>
  );
}

function formatFieldName(field?: string): string {
  if (!field) return 'item';
  return field.replace(/_/g, ' ').replace(/\bid\b/g, '').trim() || field;
}

function ActivityAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ backgroundColor: colors[Math.abs(hash) % colors.length] }}
    >
      {initials}
    </div>
  );
}

function UserAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-[var(--cp-blue)]"
    >
      ME
    </div>
  );
}
