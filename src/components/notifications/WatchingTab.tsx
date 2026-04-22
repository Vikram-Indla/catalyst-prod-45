/**
 * WatchingTab — Activity feed for watched issues.
 *
 * Uses the unified `notifications` table (tab='watching') via
 * `useNotificationsInfinite` — the same cursor-paginated, actor-hydrated,
 * realtime-invalidated pipeline as DirectTab.
 *
 * Jira parity: same row layout as Direct tab (40px avatar, work-item icon,
 * verb + timestamp, title, KEY • status). The thread-capable preview card
 * is also shown when metadata.comment_body is present.
 *
 * Light mode only.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { Eye } from 'lucide-react';
import { useNotificationsInfinite } from '@/features/notifications/hooks/useNotificationsInfinite';
import { useMarkRead } from '@/features/notifications/hooks/useNotificationMutations';
import { groupNotificationsByDay, formatRelativeTime, getVerbLabel } from '@/features/notifications/utils/date';
import type { NotificationItem } from '@/features/notifications/types';

// ── colours (shared Jira palette — same as DirectTab) ────────────────────────
const C = {
  text:        '#292A2E',
  textSubtle:  '#505258',
  textMuted:   '#6B6E76',
  blue:        '#1868DB',
  hover:       '#F7F8F9',
  border:      '#EBECF0',
  white:       '#FFFFFF',
};

// ── Work-item icon — canonical SVGs & colours (CLAUDE.md §11) ─────────────────
function WorkItemIcon({ type }: { type?: string }) {
  const t = (type || '').toLowerCase();
  if (t === 'bug')
    return <svg width="18" height="18" viewBox="0 0 16 16" aria-label="Bug"><rect width="16" height="16" rx="2" fill="#E5493A"/><circle cx="8" cy="8" r="3.5" fill="white"/></svg>;
  if (t === 'story')
    return <svg width="18" height="18" viewBox="0 0 16 16" aria-label="Story"><rect width="16" height="16" rx="2" fill="#63BA3C"/><path d="M4 3h8v10l-4-2.5L4 13V3z" fill="white"/></svg>;
  if (t === 'epic')
    return <svg width="18" height="18" viewBox="0 0 16 16" aria-label="Epic"><rect width="16" height="16" rx="2" fill="#904EE2"/><path d="M9.5 3L5.5 9h4L6.5 13l6-7H9l.5-3z" fill="white"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 16 16" aria-label="Task"><rect width="16" height="16" rx="2" fill="#4BADE8"/><path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>;
}

// ── Watching Row ──────────────────────────────────────────────────────────────
function WatchingRow({
  item,
  onMarkRead,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isUnread = item.readAt === null;

  const handleClick = () => { if (isUnread) onMarkRead(item.id); };

  const verbLabel = getVerbLabel(item.verb, item.actor.displayName);
  const timeLabel = formatRelativeTime(item.createdAt);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${verbLabel} — ${item.target.title}${isUnread ? ', unread' : ''}`}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        padding: '12px 16px 12px 24px',
        background: hovered ? C.hover : C.white,
        cursor: 'pointer',
        outline: 'none',
        borderBottom: `1px solid ${C.border}`,
        transition: 'background 120ms ease',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* 40px Atlaskit avatar — matches Jira */}
        <div style={{ flexShrink: 0 }}>
          <Avatar
            name={item.actor.displayName}
            src={item.actor.avatarUrl}
            size="large"
            appearance="circle"
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Verb + timestamp + unread indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontSize: 14, fontWeight: 500,
              color: C.text, lineHeight: '20px',
              flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {verbLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 14, fontWeight: 400,
                color: C.textMuted, lineHeight: '20px', whiteSpace: 'nowrap',
              }}>
                {timeLabel}
              </span>
              {isUnread && !hovered && (
                <div aria-label="Unread" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.blue, flexShrink: 0 }} />
              )}
              {isUnread && hovered && (
                <button
                  onClick={e => { e.stopPropagation(); onMarkRead(item.id); }}
                  aria-label="Mark as read"
                  title="Mark as read"
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: '1.5px solid #CBD5E1', background: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, flexShrink: 0,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke={C.textSubtle} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Work-item icon + title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              <WorkItemIcon type={item.target.icon} />
            </span>
            <span style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontSize: 14, fontWeight: 400,
              color: C.text, lineHeight: '20px',
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {item.target.title}
            </span>
          </div>

          {/* KEY • Status */}
          {item.target.key && (
            <div style={{ marginTop: 2 }}>
              <span style={{
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 12, fontWeight: 400,
                color: C.textSubtle, lineHeight: '16px',
              }}>
                {item.target.key}
                {item.target.statusLabel && <> &bull; {item.target.statusLabel}</>}
              </span>
            </div>
          )}

          {/* Comment preview if present */}
          {item.thread?.previewText && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              border: `1px solid ${C.border}`, borderRadius: 4,
              background: C.white,
            }}>
              <p style={{
                margin: 0, fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 14, color: C.text, lineHeight: '20px',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {item.thread.previewText}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Aggregation row */}
      {item.aggregation && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 8, paddingLeft: 52,
        }}>
          <Avatar name={item.actor.displayName} src={item.actor.avatarUrl} size="xsmall" appearance="circle" />
          <span style={{ fontFamily: 'Inter, -apple-system, sans-serif', fontSize: 14, fontWeight: 400, color: C.blue }}>
            {item.aggregation.label}
          </span>
        </div>
      )}
    </article>
  );
}

// ── Date Group ────────────────────────────────────────────────────────────────
function WatchingGroup({
  label,
  items,
  onMarkRead,
}: {
  label: string;
  items: NotificationItem[];
  onMarkRead: (id: string) => void;
}) {
  return (
    <div>
      <div style={{
        padding: '12px 24px 6px',
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontSize: 12, fontWeight: 600,
        color: C.textMuted, letterSpacing: 'normal',
      }}>
        {label}
      </div>
      {items.map(item => (
        <WatchingRow key={item.id} item={item} onMarkRead={onMarkRead} />
      ))}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '12px 16px 12px 24px',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EBECF0', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
        <div style={{ height: 14, width: '70%', background: '#EBECF0', borderRadius: 3 }} />
        <div style={{ height: 14, width: '90%', background: '#EBECF0', borderRadius: 3 }} />
        <div style={{ height: 10, width: '40%', background: '#EBECF0', borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyWatching() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 20px', gap: 12, textAlign: 'center',
    }}>
      <Eye size={40} color="#CBD5E1" strokeWidth={1.2} />
      <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}>
        Nothing watched yet
      </span>
      <span style={{ fontSize: 12, color: C.textSubtle, fontFamily: 'Inter, sans-serif' }}>
        Tap 👁 on any issue to start watching it
      </span>
    </div>
  );
}

// ── WatchingTab ───────────────────────────────────────────────────────────────
export default function WatchingTab() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Unified pipeline — same hook as DirectTab, tab='watching'
  const { notifications, isLoading, isError, refetch, hasNextPage, fetchNextPage } =
    useNotificationsInfinite('watching', false);
  const { mutate: markRead } = useMarkRead('watching', false);

  const handleMarkRead = useCallback((id: string) => { markRead(id); }, [markRead]);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) fetchNextPage(); },
      { threshold: 0.1 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasNextPage, fetchNextPage]);

  if (isError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', gap: 12,
      }}>
        <span style={{ fontSize: 14, color: C.textSubtle, fontFamily: 'Inter, sans-serif' }}>
          Could not load watching activity
        </span>
        <button
          onClick={() => refetch()}
          style={{
            padding: '6px 16px', borderRadius: 4,
            border: `1px solid ${C.border}`, background: C.white,
            fontFamily: 'Inter, sans-serif', fontSize: 14, color: C.text, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading && notifications.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (notifications.length === 0) {
    return <EmptyWatching />;
  }

  const groups = groupNotificationsByDay(notifications);

  return (
    <div>
      {groups.map(group => (
        <WatchingGroup
          key={group.label}
          label={group.label}
          items={group.items}
          onMarkRead={handleMarkRead}
        />
      ))}
      {/* Load-more sentinel */}
      {hasNextPage && (
        <div
          ref={sentinelRef}
          style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Spinner size="small" />
        </div>
      )}
      {/* Trailing load indicator */}
      {isLoading && notifications.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <Spinner size="small" />
        </div>
      )}
    </div>
  );
}
