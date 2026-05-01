/**
 * ActivityPanelPilot — Jira-grade Activity section (3 tabs: All, Comments, History)
 * Pilot: gated to specific issues. Uses AtlaskitEditor for rich-text comment composer
 * and AtlaskitRenderer for rendering ADF-backed comments.
 */
import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, ChevronDown, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { parseADF, adfToPlainText, isADFEmpty } from '@/utils/adf';
import type { ADFEntity } from '@atlaskit/adf-utils/types';
/* §19 chokepoint — every user-avatar lookup in this panel resolves through
   `resolveAvatarUrl`. Never read profiles.avatar_url (Gravatar CDN, banned)
   and never display an external URL. */
import { resolveAvatarUrl } from '@/lib/avatars';
import '@/styles/activity-pilot.css';

const AtlaskitEditor = lazy(() => import('@/components/shared/AtlaskitEditor'));
const AtlaskitRenderer = lazy(() => import('@/components/shared/AtlaskitRenderer'));

// ════════════════════════════════════════
// Types
// ════════════════════════════════════════

type ActivityTab = 'all' | 'comments' | 'history';
type SortDir = 'desc' | 'asc';

interface ActivityPanelPilotProps {
  issueKey: string;
  comments: any[];
  commentsLoading: boolean;
  historyItems: any[];
  historyLoading: boolean;
  createComment: any;
}

// ════════════════════════════════════════
// Helpers
// ════════════════════════════════════════

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
function avatarBg(name: string) {
  return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
function fmtRel(d: string | null) {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; }
}

const QUICK_TEMPLATES = [
  { label: 'Status update...', text: 'Status update: ' },
  { label: 'Thanks...', text: 'Thanks ' },
  { label: 'Agree...', text: 'I agree — ' },
];

const TABS: { key: ActivityTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'comments', label: 'Comments' },
  { key: 'history', label: 'History' },
];

// ════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════

function AvatarCircle({ name, avatarUrl, size = 32 }: { name: string; avatarUrl?: string | null; size?: number }) {
  // §19: if we have a resolved local PNG, render the face. Otherwise fall back to
  // the hash-coloured initials tile. Never use an external URL here.
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="ap-avatar"
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      className="ap-avatar"
      style={{ width: size, height: size, background: avatarBg(name), fontSize: size * 0.34 }}
    >
      {initials(name)}
    </div>
  );
}

function CommentRow({ comment }: { comment: any }) {
  const name = comment._author_name ?? 'Unknown';
  const adf = parseADF(comment.body);

  return (
    <div className="ap-timeline-item">
      <AvatarCircle name={name} avatarUrl={comment._author_avatar} />
      <div className="ap-timeline-content">
        <div className="ap-timeline-name">{name}</div>
        <div className="ap-timeline-time">{fmtRel(comment.created_at)}</div>
        <div className="ap-comment-body">
          {adf ? (
            <Suspense fallback={<div className="ap-loading-inline">Loading...</div>}>
              <AtlaskitRenderer document={adf} appearance="comment" />
            </Suspense>
          ) : (
            <div className="ap-comment-plain">{comment.body ?? ''}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: any }) {
  const name = entry._author_name ?? 'System';
  const field = entry.field_name ?? '';
  const oldVal = entry.old_display ?? entry.old_value ?? null;
  const newVal = entry.new_display ?? entry.new_value ?? null;
  const isCreated = !field && !oldVal && !newVal;
  const isStatus = field.toLowerCase() === 'status';
  const isAssignee = field.toLowerCase() === 'assignee';

  return (
    <div className="ap-timeline-item">
      <AvatarCircle name={name} avatarUrl={entry._author_avatar} />
      <div className="ap-timeline-content">
        <div className="ap-timeline-name">
          {name}{' '}
          {isCreated ? (
            'created the Work item'
          ) : (
            <>changed the <strong>{field}</strong></>
          )}
        </div>
        <div className="ap-timeline-time">{fmtRel(entry.created_at)}</div>
        {!isCreated && (oldVal || newVal) && (
          <div className="ap-history-change">
            {isStatus ? (
              <>
                {oldVal && <span className="ap-status-loz">{oldVal}</span>}
                <ArrowRight style={{ width: 14, height: 14, color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }} />
                {newVal && <span className="ap-status-loz">{newVal}</span>}
              </>
            ) : isAssignee ? (
              <>
                {oldVal && (
                  <span className="ap-assignee-chip">
                    <span className="ap-assignee-mini" style={{ background: avatarBg(oldVal) }}>{initials(oldVal)}</span>
                    {oldVal}
                  </span>
                )}
                <ArrowRight style={{ width: 14, height: 14, color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }} />
                {newVal && (
                  <span className="ap-assignee-chip">
                    <span className="ap-assignee-mini" style={{ background: avatarBg(newVal) }}>{initials(newVal)}</span>
                    {newVal}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="ap-change-old">{oldVal ?? 'None'}</span>
                <ArrowRight style={{ width: 14, height: 14, color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }} />
                <span className="ap-change-new">{newVal}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// Main Component
// ════════════════════════════════════════

export function ActivityPanelPilot({
  issueKey,
  comments,
  commentsLoading,
  historyItems,
  historyLoading,
  createComment,
}: ActivityPanelPilotProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<ActivityTab>('all');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [composerOpen, setComposerOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const editorRef = useRef<any>(null);
  const composerAreaRef = useRef<HTMLDivElement>(null);

  // ── M shortcut to focus comment composer ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'm' || e.key === 'M') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setComposerOpen(true);
        setTab('comments');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Merged + sorted feed ──
  const feed = useMemo(() => {
    const items: { type: 'comment' | 'history'; data: any; ts: number }[] = [];
    if (tab === 'all' || tab === 'comments') {
      comments.forEach(c => items.push({ type: 'comment', data: c, ts: new Date(c.created_at ?? 0).getTime() }));
    }
    if (tab === 'all' || tab === 'history') {
      historyItems.forEach(h => items.push({ type: 'history', data: h, ts: new Date(h.created_at ?? 0).getTime() }));
    }
    items.sort((a, b) => sortDir === 'desc' ? b.ts - a.ts : a.ts - b.ts);
    return items;
  }, [comments, historyItems, tab, sortDir]);

  // ── Save comment (ADF-aware) ──
  const handleSave = useCallback(async (adf: ADFEntity) => {
    if (!createComment || isADFEmpty(adf)) return;
    setPosting(true);
    try {
      await createComment.mutateAsync({
        body: JSON.stringify(adf),
        authorId: user?.id ?? '',
      });
      setComposerOpen(false);
    } catch {
      // Error toast handled by mutation onError
    } finally {
      setPosting(false);
    }
  }, [createComment, user?.id]);

  const handleCancel = useCallback(() => {
    setComposerOpen(false);
  }, []);

  // ── Quick template click ──
  const handleQuickTemplate = useCallback((text: string) => {
    setComposerOpen(true);
    setTab('comments');
    setTimeout(() => {
      if (editorRef.current) {
        const adf: ADFEntity = {
          version: 1,
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
        };
        editorRef.current.replaceDocument(adf);
      }
    }, 300);
  }, []);

  const isLoading = commentsLoading || historyLoading;

  return (
    <div className="ap-root">
      {/* ── Heading ── */}
      <h3 className="ap-heading">Activity</h3>

      {/* ── Tab bar + sort ── */}
      <div className="ap-tab-bar">
        <div className="ap-tab-list" role="tablist">
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`ap-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          className="ap-sort-btn"
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
        >
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
          <ChevronDown style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* ── Comment composer ── */}
      {!composerOpen ? (
        <div className="ap-composer-collapsed" onClick={() => setComposerOpen(true)}>
          {user && <AvatarCircle name={user.email ?? 'You'} size={32} />}
          <div className="ap-composer-collapsed-body">
            <span className="ap-composer-placeholder">Add a comment...</span>
            <div className="ap-quick-templates">
              {QUICK_TEMPLATES.map(qt => (
                <button
                  key={qt.label}
                  className="ap-quick-btn"
                  onClick={(e) => { e.stopPropagation(); handleQuickTemplate(qt.text); }}
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ap-composer-expanded" ref={composerAreaRef}>
          <div className="ap-composer-avatar">
            {user && <AvatarCircle name={user.email ?? 'You'} size={32} />}
          </div>
          <div className="ap-composer-editor">
            <Suspense fallback={<div className="ap-loading-editor">Loading editor...</div>}>
              <AtlaskitEditor
                ref={editorRef}
                appearance="comment"
                placeholder="Add a comment..."
                onSave={handleSave}
                onCancel={handleCancel}
                disabled={posting}
              />
            </Suspense>
            {/* Save button below editor for visual parity */}
            <div className="ap-composer-footer">
              <button
                className="ap-save-btn"
                onClick={() => {
                  if (editorRef.current) {
                    const adf = editorRef.current.getContent();
                    if (adf) handleSave(adf);
                  }
                }}
                disabled={posting}
              >
                {posting ? 'Saving...' : 'Save'}
              </button>
              <button className="ap-cancel-btn" onClick={handleCancel} disabled={posting}>
                Cancel
              </button>
            </div>
            <div className="ap-composer-hints">
              <div className="ap-quick-templates-inline">
                {QUICK_TEMPLATES.map(qt => (
                  <button
                    key={qt.label}
                    className="ap-quick-link"
                    onClick={() => handleQuickTemplate(qt.text)}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
              <div className="ap-pro-tip">
                Pro tip: press <kbd className="ap-kbd">M</kbd> to comment
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Activity feed ── */}
      <div className="ap-feed">
        {isLoading ? (
          <div className="ap-loading">
            <Loader2 className="ap-spinner" />
          </div>
        ) : feed.length > 0 ? (
          feed.map((entry, i) =>
            entry.type === 'comment'
              ? <CommentRow key={entry.data.id ?? `c-${i}`} comment={entry.data} />
              : <HistoryRow key={entry.data.id ?? `h-${i}`} entry={entry.data} />
          )
        ) : (
          <div className="ap-empty">No activity yet</div>
        )}
      </div>
    </div>
  );
}
