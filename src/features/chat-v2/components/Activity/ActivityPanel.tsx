/**
 * ActivityPanel — Slack-look Activity feed.
 *
 * Replaces the conversation list when activeView === 'activity'. Renders an
 * aggregated chronological feed (DM unreads + @mentions + thread replies)
 * with: dense/detailed view toggle, tab filter, per-item hover strip, three-
 * dot menu (excludes Organize / Connect to apps / Delete per spec), Remind-me
 * submenu + custom Reminder modal, animated search expand.
 *
 * Selecting a row tells the parent which conversation to open and (for thread
 * items) opens the thread pane. Detail rendering lives in MessagePanel /
 * ThreadPane — this panel is a list only.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useConversations } from '@/hooks/chat/useConversations';
import { useActivityFeed, type ActivityItem } from '../../hooks/useActivityFeed';
import { ActivityHeader, type ActivityTab, type ActivityViewMode } from './ActivityHeader';
import { ActivityRow } from './ActivityRow';
import { ActivityMoreMenu } from './ActivityMoreMenu';
import { ReminderModal } from './ReminderModal';
import { dayKey, formatDateSeparator } from '../../lib/formatTimestamp';
import { refreshActivityHover } from '../../lib/activityHoverTracker';

interface ActivityPanelProps {
  onSelectActivity: (item: ActivityItem) => void;
  selectedItemId?: string | null;
  /** When false (no right pane present), the right edge border is suppressed and the panel fills the cell. */
  showRightBorder?: boolean;
}

const db = supabase as unknown as { from: (t: string) => any };

export function ActivityPanel({ onSelectActivity, selectedItemId, showRightBorder = true }: ActivityPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { items, countsByTab, isLoading } = useActivityFeed();
  const { conversations } = useConversations();

  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [viewMode, setViewMode] = useState<ActivityViewMode>('detailed');
  const [unreadsOnly, setUnreadsOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [moreAnchor, setMoreAnchor] = useState<{ item: ActivityItem; rect: DOMRect } | null>(null);
  const [customReminderItem, setCustomReminderItem] = useState<ActivityItem | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [panelWidth, setPanelWidth] = useState(0);

  useLayoutEffect(() => {
    if (!sectionRef.current) return;
    const el = sectionRef.current;
    setPanelWidth(el.clientWidth);
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setPanelWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!reminderToast) return;
    const id = window.setTimeout(() => setReminderToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [reminderToast]);

  // Force the cursor-hit-test to re-run when the panel mounts (route nav
  // back to /chat), and whenever the window regains focus or the document
  // becomes visible again. Without this, the row under a stationary cursor
  // never gets data-cv2-cursor-on set and the hover strip never appears
  // until the user moves the mouse — the documented bug from images of
  // "hover doesn't work after navigation".
  useEffect(() => {
    // Run on mount (after a paint so the rows are actually in the DOM).
    const raf = requestAnimationFrame(refreshActivityHover);
    const onFocus = () => refreshActivityHover();
    const onVis = () => refreshActivityHover();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Re-run hit-test after the visible row list changes (search, filter,
  // tab switch) — a row that wasn't there a moment ago may now be under
  // the cursor.
  useEffect(() => {
    const raf = requestAnimationFrame(refreshActivityHover);
    return () => cancelAnimationFrame(raf);
  }, [items, activeTab, unreadsOnly, searchTerm, viewMode]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeTab === 'dms') list = list.filter(i => i.kind === 'dm');
    else if (activeTab === 'mentions') list = list.filter(i => i.kind === 'mention');
    else if (activeTab === 'threads') list = list.filter(i => i.kind === 'thread');
    if (unreadsOnly) list = list.filter(i => i.isUnread);
    if (searchTerm.trim()) {
      const needle = searchTerm.trim().toLowerCase();
      list = list.filter(i =>
        (i.body || '').toLowerCase().includes(needle) ||
        i.authorName.toLowerCase().includes(needle) ||
        i.conversationTitle.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [items, activeTab, unreadsOnly, searchTerm]);

  // Group by day for separators.
  const grouped = useMemo(() => {
    const out: Array<{ key: string; iso: string; items: ActivityItem[] }> = [];
    let current: { key: string; iso: string; items: ActivityItem[] } | null = null;
    for (const item of filtered) {
      const key = dayKey(item.createdAt);
      if (!current || current.key !== key) {
        current = { key, iso: item.createdAt, items: [] };
        out.push(current);
      }
      current.items.push(item);
    }
    return out;
  }, [filtered]);

  const handleMarkUnread = async (item: ActivityItem) => {
    if (!user?.id) return;
    const beforeIso = new Date(new Date(item.createdAt).getTime() - 1).toISOString();
    await db
      .from('chat_conversation_members')
      .update({ last_read_at: beforeIso })
      .eq('conversation_id', item.conversationId)
      .eq('user_id', user.id);
    await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    await queryClient.invalidateQueries({ queryKey: ['chat-v2', 'activity-feed'] });
  };

  const handleMarkRead = async (item: ActivityItem) => {
    if (!user?.id) return;
    // Bump last_read_at to the message timestamp so this row no longer counts as unread.
    const afterIso = new Date(new Date(item.createdAt).getTime() + 1).toISOString();
    await db
      .from('chat_conversation_members')
      .update({ last_read_at: afterIso })
      .eq('conversation_id', item.conversationId)
      .eq('user_id', user.id);
    await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    await queryClient.invalidateQueries({ queryKey: ['chat-v2', 'activity-feed'] });
  };

  const handleCopyLink = (item: ActivityItem) => {
    const url = `${window.location.origin}/chat?c=${item.conversationId}&m=${item.targetMessageId}`;
    void navigator.clipboard?.writeText(url);
  };

  const handleCopyMessage = (item: ActivityItem) => {
    void navigator.clipboard?.writeText(item.body);
  };

  const handleRemindMe = (_item: ActivityItem, iso: string) => {
    const at = new Date(iso);
    setReminderToast(`Reminder set for ${at.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`);
  };

  return (
    <section
      ref={sectionRef}
      aria-label="Activity"
      style={{
        gridArea: 'activity',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        borderRight: showRightBorder ? '1px solid var(--cv2-border)' : 'none',
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <ActivityHeader
        activeTab={activeTab}
        unreadCounts={countsByTab}
        onTabChange={setActiveTab}
        unreadsOnly={unreadsOnly}
        onToggleUnreadsOnly={() => setUnreadsOnly(v => !v)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        panelWidth={panelWidth}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: viewMode === 'detailed' ? '10px 14px 24px' : '4px 8px 24px',
        }}
      >
        {isLoading ? (
          <EmptyState message="Loading activity…" />
        ) : grouped.length === 0 ? (
          <EmptyState
            message={
              searchTerm.trim()
                ? `No activity matches “${searchTerm.trim()}”.`
                : unreadsOnly
                  ? 'No unreads. You’re all caught up.'
                  : 'No activity yet.'
            }
          />
        ) : (
          grouped.map((group, idx) => (
            <React.Fragment key={group.key}>
              {idx > 0 && <DateSeparator iso={group.iso} />}
              <div
                style={
                  viewMode === 'dense'
                    ? {
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid var(--cv2-border-strong)',
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: 'var(--cv2-bg-panel)',
                        marginTop: idx === 0 ? 0 : 8,
                      }
                    : {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginTop: idx === 0 ? 0 : 8,
                      }
                }
              >
                {group.items.map((item, rowIdx) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    variant={viewMode}
                    panelWidth={panelWidth}
                    isSelected={selectedItemId === item.id}
                    isMenuOpen={moreAnchor?.item.id === item.id}
                    isLastInGroup={rowIdx === group.items.length - 1}
                    onSelect={() => onSelectActivity(item)}
                    onOpenThread={() => onSelectActivity({ ...item, kind: 'thread' as const })}
                    onJumpToSource={() => onSelectActivity(item)}
                    onMarkUnread={() => { void handleMarkUnread(item); }}
                    onMarkRead={() => { void handleMarkRead(item); }}
                    onMore={rect => setMoreAnchor({ item, rect })}
                  />
                ))}
              </div>
            </React.Fragment>
          ))
        )}
      </div>

      {moreAnchor && (
        <ActivityMoreMenu
          anchorRect={moreAnchor.rect}
          canEdit={moreAnchor.item.authorId === user?.id}
          onEdit={() => { /* edit lives in MessagePanel; just close */ }}
          onMarkUnread={() => { void handleMarkUnread(moreAnchor.item); }}
          onRemindMe={iso => handleRemindMe(moreAnchor.item, iso)}
          onRemindMeCustom={() => setCustomReminderItem(moreAnchor.item)}
          onTurnOffReplies={() => { /* TODO turn off replies for this thread */ }}
          onCopyLink={() => handleCopyLink(moreAnchor.item)}
          onCopyMessage={() => handleCopyMessage(moreAnchor.item)}
          onClose={() => setMoreAnchor(null)}
        />
      )}

      {customReminderItem && (
        <ReminderModal
          onCancel={() => setCustomReminderItem(null)}
          onSave={iso => {
            handleRemindMe(customReminderItem, iso);
            setCustomReminderItem(null);
          }}
        />
      )}

      {reminderToast && <ReminderToast message={reminderToast} />}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--cv2-text-muted)',
        fontFamily: 'var(--cv2-font)',
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function DateSeparator({ iso }: { iso: string }) {
  // ────(Sunday, June 7th)────  layout — horizontal rule running through the
  // pill, with extra breathing room above/below so card groups feel separated.
  return (
    <div
      role="presentation"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '32px 4px',
      }}
    >
      <span
        aria-hidden="true"
        style={{ flex: 1, height: 1, background: 'var(--cv2-divider)' }}
      />
      <span
        style={{
          padding: '4px 12px',
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--cv2-fs-date-sep)',
          fontWeight: 600,
          color: 'var(--cv2-text)',
          background: 'var(--cv2-bg-panel)',
          border: '1px solid var(--cv2-border)',
          borderRadius: 16,
          whiteSpace: 'nowrap',
        }}
      >
        {formatDateSeparator(iso)}
      </span>
      <span
        aria-hidden="true"
        style={{ flex: 1, height: 1, background: 'var(--cv2-divider)' }}
      />
    </div>
  );
}

function ReminderToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        padding: '10px 14px',
        background: 'var(--cv2-bg-toolbar)',
        color: 'var(--cv2-text-strong)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        fontFamily: 'var(--cv2-font)',
        fontSize: 13,
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
      }}
    >
      {message}
    </div>
  );
}
