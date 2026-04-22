// ─────────────────────────────────────────────────────────────────────────────
// DirectTab — Jira-parity notification list (Direct tab content only)
// Renders the grouped notification rows; panel chrome (title/toggle/tabs) lives
// in NotificationPanel so there is no duplicate heading.
//
// Measured from Jira DOM (digital-transformation.atlassian.net):
//   Row article:       padding 0px (inner content owns spacing)
//   Inner flex gap:    12px
//   Action line:       14px / weight 500 / rgb(41,42,46) / lineHeight 20px
//   Timestamp:         14px / weight 400 / rgb(107,110,118) / lineHeight 20px
//   Target title:      14px / weight 400 / rgb(41,42,46) / lineHeight 20px
//   Meta line:         12px / weight 400 / rgb(80,82,88) — plain "KEY • Status"
//   Avatar:            40px (Atlaskit size="large") / borderRadius 50%
//   Date header:       12px / weight 600 / rgb(107,110,118) / mixed-case "Today"
//   Aggregation row:   14px / rgb(24,104,219) blue text
//   Work-item icon:    18×18px — canonical colors from CLAUDE.md §11
//   Thread preview:    border 1px #EBECF0 / bg white / radius 4px / pad 8px 12px
//   Reaction pill:     bg #F4F5F7 / border 1px #EBECF0 / radius 12px / font 13px
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import Avatar from '@atlaskit/avatar';
import { useNotificationsInfinite } from '../hooks/useNotificationsInfinite';
import { useMarkRead } from '../hooks/useNotificationMutations';
import { groupNotificationsByDay, formatRelativeTime, getVerbLabel } from '../utils/date';
import type { NotificationItem, NotificationReaction } from '../types';

// ── colour constants (Jira-measured) ─────────────────────────────────────────
const C = {
  text:        '#292A2E',   // rgb(41,42,46)   — primary text
  textSubtle:  '#505258',   // rgb(80,82,88)    — secondary / meta
  textMuted:   '#6B6E76',   // rgb(107,110,118) — timestamps / section headers
  blue:        '#1868DB',   // rgb(24,104,219)  — active / unread / links
  hover:       '#F7F8F9',   // ADS hover neutral
  border:      '#EBECF0',   // row divider / preview card border
  bgCard:      '#F4F5F7',   // reaction pill background
  white:       '#FFFFFF',
  drawerBg:    '#FFFFFF',
  drawerBd:    '#DFE1E6',
  replyBorder: '#0052CC',
};

// ── Work-item icon — canonical SVGs & colours (CLAUDE.md §11) ────────────────
// Bug=#E5493A  Story=#63BA3C  Task=#4BADE8  Epic=#904EE2  Subtask=#4BADE8
function WorkItemIcon({ type }: { type?: string }) {
  const t = (type || '').toLowerCase();
  if (t === 'bug')
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" aria-label="Bug">
        <rect width="16" height="16" rx="2" fill="#E5493A"/>
        <circle cx="8" cy="8" r="3.5" fill="white"/>
      </svg>
    );
  if (t === 'story')
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" aria-label="Story">
        <rect width="16" height="16" rx="2" fill="#63BA3C"/>
        <path d="M4 3h8v10l-4-2.5L4 13V3z" fill="white"/>
      </svg>
    );
  if (t === 'epic')
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" aria-label="Epic">
        <rect width="16" height="16" rx="2" fill="#904EE2"/>
        <path d="M9.5 3L5.5 9h4L6.5 13l6-7H9l.5-3z" fill="white"/>
      </svg>
    );
  if (t === 'subtask')
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" aria-label="Subtask">
        <rect width="16" height="16" rx="2" fill="#4BADE8"/>
        <path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      </svg>
    );
  // default → task (blue checkbox)
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-label="Task">
      <rect width="16" height="16" rx="2" fill="#4BADE8"/>
      <path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// ── Thread Preview Card ───────────────────────────────────────────────────────
// Shown for 'commented' / 'mentioned' items that have previewText in metadata.
function ThreadPreviewCard({
  previewText,
  attachmentCount,
}: {
  previewText: string;
  attachmentCount?: number;
}) {
  return (
    <div style={{
      marginTop: 8,
      padding: '8px 12px',
      border: `1px solid ${C.border}`,
      borderRadius: 4,
      background: C.white,
    }}>
      <p style={{
        margin: 0,
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontSize: 14,
        color: C.text,
        lineHeight: '20px',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {previewText}
      </p>
      {attachmentCount && attachmentCount > 0 && (
        <p style={{
          margin: '4px 0 0',
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 12,
          color: C.textSubtle,
          lineHeight: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textSubtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          {attachmentCount === 1 ? '1 attachment' : `attachment +${attachmentCount - 1} more`}
        </p>
      )}
    </div>
  );
}

// ── Reaction Bar ──────────────────────────────────────────────────────────────
function ReactionBar({
  reactions,
  onAddReaction,
}: {
  reactions: NotificationReaction[];
  onAddReaction?: () => void;
}) {
  if (!reactions.length) return null;
  const pillStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    height: 26,
    borderRadius: 12,
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'Inter, -apple-system, sans-serif',
    lineHeight: '1',
    userSelect: 'none',
  };
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
      {reactions.map(r => (
        <div key={r.emoji} style={pillStyle} title={`${r.count} reaction${r.count !== 1 ? 's' : ''}`}>
          <span role="img" aria-label={r.emoji}>{r.emoji}</span>
          <span style={{ fontSize: 12, color: C.textSubtle, fontWeight: 500 }}>{r.count}</span>
        </div>
      ))}
      {/* Add reaction "+" button */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Add reaction"
        onClick={e => { e.stopPropagation(); onAddReaction?.(); }}
        style={{ ...pillStyle, padding: '2px 9px' }}
      >
        <span style={{ color: C.textMuted, fontSize: 16, lineHeight: '1' }}>+</span>
      </div>
    </div>
  );
}

// ── Thread Action Row — Reply + View thread ───────────────────────────────────
function ThreadActionRow({
  onReply,
  onViewThread,
}: {
  onReply: () => void;
  onViewThread: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
      <button
        onClick={e => { e.stopPropagation(); onReply(); }}
        style={{
          padding: '3px 12px',
          height: 28,
          borderRadius: 4,
          border: `1px solid ${C.border}`,
          background: C.white,
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 13,
          color: C.textSubtle,
          cursor: 'pointer',
          lineHeight: '1',
        }}
      >
        Reply
      </button>
      <button
        onClick={e => { e.stopPropagation(); onViewThread(); }}
        style={{
          border: 'none',
          background: 'transparent',
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 13,
          fontWeight: 500,
          color: C.blue,
          cursor: 'pointer',
          padding: 0,
          lineHeight: '1',
        }}
      >
        View thread
      </button>
    </div>
  );
}

// ── Notification Row ──────────────────────────────────────────────────────────
interface RowProps {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onClick: (item: NotificationItem) => void;
  onViewThread: (item: NotificationItem) => void;
}

function NotificationRow({ item, onMarkRead, onClick, onViewThread }: RowProps) {
  const [hovered, setHovered] = useState(false);
  const isUnread   = item.readAt === null;
  const hasThread  = !!item.thread;

  const handleClick = () => {
    if (isUnread) onMarkRead(item.id);
    onClick(item);
  };

  const verbLabel = getVerbLabel(item.verb, item.actor.displayName);
  const timeLabel = formatRelativeTime(item.createdAt);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${verbLabel} — ${item.target.title}${isUnread ? ', unread' : ''}`}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
      }}
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
      {/* Main row: avatar + content + unread indicator */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Atlaskit Avatar — size="large" = 40px, matching Jira */}
        <div style={{ flexShrink: 0, position: 'relative' }}>
          <Avatar
            name={item.actor.displayName}
            src={item.actor.avatarUrl}
            size="large"
            appearance="circle"
          />
        </div>

        {/* Content stack */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Line 1: verb + timestamp + unread dot */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: C.text,
              lineHeight: '20px',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {verbLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Timestamp */}
              <span style={{
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 14,
                fontWeight: 400,
                color: C.textMuted,
                lineHeight: '20px',
                whiteSpace: 'nowrap',
              }}>
                {timeLabel}
              </span>
              {/* Unread dot at rest / ✓ button on hover */}
              {isUnread && !hovered && (
                <div
                  aria-label="Unread"
                  style={{
                    width: 8, height: 8,
                    borderRadius: '50%',
                    backgroundColor: C.blue,
                    flexShrink: 0,
                  }}
                />
              )}
              {isUnread && hovered && (
                <button
                  onClick={e => { e.stopPropagation(); onMarkRead(item.id); }}
                  aria-label="Mark as read"
                  title="Mark as read"
                  style={{
                    width: 22, height: 22,
                    borderRadius: '50%',
                    border: `1.5px solid #CBD5E1`,
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke={C.textSubtle} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Line 2: work-item icon + title (2-line clamp) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              <WorkItemIcon type={item.target.icon} />
            </span>
            <span style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontSize: 14,
              fontWeight: 400,
              color: C.text,
              lineHeight: '20px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {item.target.title}
            </span>
          </div>

          {/* Line 3: KEY • Status (plain text — Jira renders no Lozenge here) */}
          {item.target.key && (
            <div style={{ marginTop: 2 }}>
              <span style={{
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 12,
                fontWeight: 400,
                color: C.textSubtle,
                lineHeight: '16px',
              }}>
                {item.target.key}
                {item.target.statusLabel && <> &bull; {item.target.statusLabel}</>}
              </span>
            </div>
          )}

          {/* Thread area — preview card + reactions + Reply / View thread */}
          {hasThread && (
            <div onClick={e => e.stopPropagation()}>
              {/* Comment preview card */}
              {item.thread!.previewText && (
                <ThreadPreviewCard
                  previewText={item.thread!.previewText}
                  attachmentCount={item.thread!.attachmentCount}
                />
              )}

              {/* Emoji reaction bar */}
              {item.thread!.reactions && item.thread!.reactions.length > 0 && (
                <ReactionBar reactions={item.thread!.reactions} />
              )}

              {/* Reply + View thread actions */}
              <ThreadActionRow
                onReply={() => onViewThread(item)}
                onViewThread={() => onViewThread(item)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Aggregation row — "+N update from [name]" in Jira blue */}
      {item.aggregation && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 8,
          paddingLeft: 52, // avatar (40) + gap (12)
        }}>
          <Avatar
            name={item.actor.displayName}
            src={item.actor.avatarUrl}
            size="xsmall"
            appearance="circle"
          />
          <span style={{
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: 14,
            fontWeight: 400,
            color: C.blue,
            cursor: 'pointer',
          }}>
            {item.aggregation.label}
          </span>
        </div>
      )}
    </article>
  );
}

// ── Date Group ────────────────────────────────────────────────────────────────
interface GroupProps {
  label: string;
  items: NotificationItem[];
  onMarkRead: (id: string) => void;
  onItemClick: (item: NotificationItem) => void;
  onViewThread: (item: NotificationItem) => void;
}

function NotificationGroup({ label, items, onMarkRead, onItemClick, onViewThread }: GroupProps) {
  return (
    <div>
      <div style={{
        padding: '12px 24px 6px',
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        color: C.textMuted,
        letterSpacing: 'normal',
      }}>
        {label}
      </div>
      {items.map(item => (
        <NotificationRow
          key={item.id}
          item={item}
          onMarkRead={onMarkRead}
          onClick={onItemClick}
          onViewThread={onViewThread}
        />
      ))}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
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

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading notifications">
      {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
    </div>
  );
}

// ── Empty States ──────────────────────────────────────────────────────────────
function EmptyDirect({ onlyUnread }: { onlyUnread: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', gap: 8, textAlign: 'center',
    }}
      role="status"
      aria-live="polite"
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" fill="#F4F5F7"/>
        <path d="M24 16v8M24 28v2" stroke="#6B778C" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: C.text }}>
        {onlyUnread ? "You're all caught up" : 'No notifications'}
      </span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: C.textSubtle }}>
        {onlyUnread
          ? 'No unread notifications right now.'
          : 'Direct notifications will appear here.'}
      </span>
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', gap: 12, textAlign: 'center',
    }}
      role="alert"
    >
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: C.textSubtle }}>
        Could not load notifications
      </span>
      <button
        onClick={onRetry}
        style={{
          padding: '6px 16px', borderRadius: 4,
          border: `1px solid ${C.border}`, background: C.white,
          fontFamily: 'Inter, sans-serif', fontSize: 14, color: C.text,
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ── Thread Drawer ─────────────────────────────────────────────────────────────
// A custom right-side slide-over panel. No new npm packages — built from CSS
// position:fixed + React state only (CLAUDE.md §10 — never introduce new deps).
interface ThreadDrawerProps {
  item: NotificationItem | null;
  onClose: () => void;
}

function ThreadDrawer({ item, onClose }: ThreadDrawerProps) {
  const [replyText, setReplyText] = useState('');
  const open = item !== null;

  // Trap focus on open; close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(9,30,66,0.25)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 220ms ease',
          zIndex: 300,
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item ? `Thread for ${item.target.title}` : 'Thread'}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 480,
          background: C.drawerBg,
          boxShadow: '-4px 0 16px rgba(9,30,66,0.15)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 240ms cubic-bezier(0.2,0,0,1)',
          zIndex: 301,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {item && (
          <>
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: `1px solid ${C.drawerBd}`,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WorkItemIcon type={item.target.icon} />
                <span style={{
                  fontFamily: 'Inter, -apple-system, sans-serif',
                  fontSize: 14, fontWeight: 600,
                  color: C.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 360,
                }}>
                  {item.target.title}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close thread"
                style={{
                  width: 28, height: 28,
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.textMuted,
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Meta bar */}
            <div style={{
              padding: '8px 20px',
              borderBottom: `1px solid ${C.drawerBd}`,
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 12, color: C.textSubtle,
              }}>
                {item.target.key && <>{item.target.key} &bull; </>}
                {item.target.statusLabel}
              </span>
            </div>

            {/* Thread body (scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {/* Original notification as the "root message" */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0 }}>
                  <Avatar
                    name={item.actor.displayName}
                    src={item.actor.avatarUrl}
                    size="medium"
                    appearance="circle"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{
                      fontFamily: 'Inter, -apple-system, sans-serif',
                      fontSize: 14, fontWeight: 600, color: C.text,
                    }}>
                      {item.actor.displayName}
                    </span>
                    <span style={{
                      fontFamily: 'Inter, -apple-system, sans-serif',
                      fontSize: 12, color: C.textMuted,
                    }}>
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  {item.thread?.previewText ? (
                    <p style={{
                      margin: '6px 0 0',
                      fontFamily: 'Inter, -apple-system, sans-serif',
                      fontSize: 14, color: C.text, lineHeight: '22px',
                    }}>
                      {item.thread.previewText}
                    </p>
                  ) : (
                    <p style={{
                      margin: '6px 0 0',
                      fontFamily: 'Inter, -apple-system, sans-serif',
                      fontSize: 14, color: C.textSubtle, fontStyle: 'italic',
                    }}>
                      {getVerbLabel(item.verb, item.actor.displayName)}
                    </p>
                  )}

                  {/* Reactions on the root message */}
                  {item.thread?.reactions && item.thread.reactions.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <ReactionBar reactions={item.thread.reactions} />
                    </div>
                  )}
                </div>
              </div>

              {/* Thread continuation placeholder */}
              <div style={{
                marginTop: 32,
                padding: '16px',
                background: '#F7F8F9',
                borderRadius: 6,
                textAlign: 'center',
              }}>
                <span style={{
                  fontFamily: 'Inter, -apple-system, sans-serif',
                  fontSize: 13, color: C.textMuted,
                }}>
                  Replies will appear here once the thread feature is enabled.
                </span>
              </div>
            </div>

            {/* Reply composer — sticky at bottom */}
            <div style={{
              borderTop: `1px solid ${C.drawerBd}`,
              padding: '12px 20px',
              flexShrink: 0,
              background: C.drawerBg,
            }}>
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-end',
                border: `2px solid ${replyText ? C.replyBorder : C.drawerBd}`,
                borderRadius: 6,
                padding: '8px 12px',
                transition: 'border-color 120ms',
              }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Reply…"
                  rows={2}
                  style={{
                    flex: 1,
                    border: 'none', outline: 'none', resize: 'none',
                    fontFamily: 'Inter, -apple-system, sans-serif',
                    fontSize: 14, color: C.text, lineHeight: '22px',
                    background: 'transparent',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      // Placeholder: in production would call a reply mutation
                      setReplyText('');
                    }
                  }}
                />
                <button
                  disabled={!replyText.trim()}
                  style={{
                    padding: '4px 14px',
                    borderRadius: 4,
                    border: 'none',
                    background: replyText.trim() ? C.replyBorder : '#DFE1E6',
                    color: replyText.trim() ? '#FFFFFF' : '#A5ADBA',
                    fontFamily: 'Inter, -apple-system, sans-serif',
                    fontSize: 13, fontWeight: 500,
                    cursor: replyText.trim() ? 'pointer' : 'default',
                    transition: 'background 120ms',
                    flexShrink: 0,
                  }}
                  onClick={() => setReplyText('')}
                >
                  Save
                </button>
              </div>
              <p style={{
                margin: '6px 0 0',
                fontFamily: 'Inter, -apple-system, sans-serif',
                fontSize: 11, color: C.textMuted,
              }}>
                Enter to save &bull; Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── DirectTab ─────────────────────────────────────────────────────────────────
interface DirectTabProps {
  onItemClick?: (item: NotificationItem) => void;
  /** Controlled from NotificationPanel — same toggle that lives in the panel header */
  unreadOnly?: boolean;
}

export function DirectTab({ onItemClick, unreadOnly = false }: DirectTabProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [liveMsg, setLiveMsg]       = useState('');
  const [threadItem, setThreadItem] = useState<NotificationItem | null>(null);

  const { notifications, isLoading, isError, refetch, hasNextPage, fetchNextPage } =
    useNotificationsInfinite('direct', unreadOnly);
  const { mutate: markRead } = useMarkRead('direct', unreadOnly);

  // SR announcements
  useEffect(() => {
    if (isLoading) setLiveMsg('Loading notifications…');
    else if (isError) setLiveMsg('Failed to load notifications.');
    else setLiveMsg('');
  }, [isLoading, isError]);

  // Infinite scroll
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

  const handleMarkRead   = useCallback((id: string) => { markRead(id); }, [markRead]);
  const handleItemClick  = useCallback((item: NotificationItem) => {
    if (item.readAt === null) markRead(item.id);
    onItemClick?.(item);
  }, [markRead, onItemClick]);
  const handleViewThread = useCallback((item: NotificationItem) => {
    setThreadItem(item);
  }, []);
  const handleCloseThread = useCallback(() => setThreadItem(null), []);

  const groups = groupNotificationsByDay(notifications);

  return (
    <>
      {/* SR live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {liveMsg}
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading && notifications.length === 0 ? (
        <LoadingSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyDirect onlyUnread={unreadOnly} />
      ) : (
        <>
          {groups.map(group => (
            <NotificationGroup
              key={group.label}
              label={group.label}
              items={group.items}
              onMarkRead={handleMarkRead}
              onItemClick={handleItemClick}
              onViewThread={handleViewThread}
            />
          ))}
          {hasNextPage && (
            <div
              ref={sentinelRef}
              style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ fontSize: 12, color: C.textMuted }}>Loading more…</span>
            </div>
          )}
        </>
      )}

      {/* Thread drawer — portal-like fixed overlay */}
      <ThreadDrawer item={threadItem} onClose={handleCloseThread} />
    </>
  );
}
