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
import {
  ActivityHeader,
  type ActivityTab,
  type ActivityViewMode,
  type ActivitySelectionMode,
  type ActivityFilterKey,
  type ActivityMentionSubKey,
} from './ActivityHeader';
import { ActivityRow } from './ActivityRow';
import { ActivityMoreMenu } from './ActivityMoreMenu';
import { ReminderModal } from './ReminderModal';
import { dayKey } from '../../lib/formatTimestamp';
import { DateSeparator } from '../MessagePanel/DateSeparator';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<{ item: ActivityItem; rect: DOMRect } | null>(null);
  const [customReminderItem, setCustomReminderItem] = useState<ActivityItem | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  // Selection state — selectionMode === null means idle (no toolbar).
  const [selectionMode, setSelectionMode] = useState<ActivitySelectionMode>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  // Local "cleared" overlay — ids removed from the feed view after the user
  // clicks "Clear selected". Persists for the lifetime of this mount so the
  // user sees the empty state immediately; on next refetch the items also
  // drop from the underlying feed because we marked them read.
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => new Set());
  // Filter state.
  const [filterKeys, setFilterKeys] = useState<Set<ActivityFilterKey>>(() => new Set());
  const [filterMentionSubs, setFilterMentionSubs] = useState<Set<ActivityMentionSubKey>>(() => new Set());
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
    let list = items.filter(i => !clearedIds.has(i.id));
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
    // Filter popover — multi-select. When ANY filter key is set, only items
    // matching at least one key are kept. dms/mentions/threads map to the
    // ActivityItem.kind. The other keys (channels, reactions, invitations,
    // apps, reminders) don't exist in the underlying data model yet, so
    // they filter to empty when used alone — by design, per the spec.
    if (filterKeys.size > 0) {
      list = list.filter(i => {
        if (filterKeys.has('dms') && i.kind === 'dm') return true;
        if (filterKeys.has('mentions') && i.kind === 'mention') return true;
        if (filterKeys.has('threads') && i.kind === 'thread') return true;
        return false;
      });
    }
    return list;
  }, [items, activeTab, unreadsOnly, searchTerm, filterKeys, clearedIds]);

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

  // Whenever the visible feed or selection mode changes, recompute the
  // selected ids to honour the mode contract. Custom mode does NOT auto-
  // mutate — the user picks individuals.
  useEffect(() => {
    if (selectionMode === null) {
      if (selectedIds.size > 0) setSelectedIds(new Set());
      return;
    }
    if (selectionMode === 'custom') return;
    const next = new Set<string>();
    for (const i of filtered) {
      if (selectionMode === 'all') next.add(i.id);
      else if (selectionMode === 'reads' && !i.isUnread) next.add(i.id);
      else if (selectionMode === 'unreads' && i.isUnread) next.add(i.id);
    }
    setSelectedIds(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionMode, filtered.length, clearedIds]);

  const selfMentionName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = typeof meta.full_name === 'string' ? meta.full_name : '';
    return fullName || (user?.email ?? '');
  }, [user]);

  const handleSelectionModeChange = (m: ActivitySelectionMode) => {
    setSelectionMode(m);
    if (m === 'custom') setSelectedIds(new Set());
  };

  const handleToggleRowChecked = (item: ActivityItem) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleMarkSelectedAsRead = async () => {
    const targets = filtered.filter(i => selectedIds.has(i.id));
    for (const item of targets) {
      // eslint-disable-next-line no-await-in-loop
      await handleMarkRead(item);
    }
  };

  const handleClearSelected = async () => {
    const targets = filtered.filter(i => selectedIds.has(i.id));
    // Mark each selected item as read so they drop from the feed on next refetch.
    for (const item of targets) {
      // eslint-disable-next-line no-await-in-loop
      await handleMarkRead(item);
    }
    // Local optimistic remove so the user sees the empty state immediately.
    setClearedIds(prev => {
      const next = new Set(prev);
      for (const t of targets) next.add(t.id);
      return next;
    });
    setSelectedIds(new Set());
    setSelectionMode(null);
  };

  const handleResetFilters = () => {
    setFilterKeys(new Set());
    setFilterMentionSubs(new Set());
  };

  const showRowCheckbox = selectionMode !== null;
  const allClearedEmpty = clearedIds.size > 0 && filtered.length === 0;

  return (
    <section
      ref={sectionRef}
      aria-label="Activity"
      style={{
        gridArea: 'sidebar',
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
        onTabChange={t => {
          setActiveTab(t);
          // Switching tabs while in selection mode would leave a confusing
          // partial selection from the previous tab — exit selection mode.
          setSelectionMode(null);
          setSelectedIds(new Set());
        }}
        unreadsOnly={unreadsOnly}
        onToggleUnreadsOnly={() => setUnreadsOnly(v => !v)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        panelWidth={panelWidth}
        selectionMode={selectionMode}
        onSelectionModeChange={handleSelectionModeChange}
        selectedCount={selectedIds.size}
        totalVisibleCount={filtered.length}
        onMarkSelectedAsRead={() => { void handleMarkSelectedAsRead(); }}
        onClearSelected={() => { void handleClearSelected(); }}
        selfMentionName={selfMentionName}
        filterKeys={filterKeys}
        filterMentionSubs={filterMentionSubs}
        onFilterKeysChange={setFilterKeys}
        onFilterMentionSubsChange={setFilterMentionSubs}
        onResetFilters={handleResetFilters}
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
          allClearedEmpty || items.filter(i => !clearedIds.has(i.id)).length === 0 ? (
            <AllCaughtUpEmptyState />
          ) : (
            <EmptyState
              message={
                searchTerm.trim()
                  ? `No activity matches “${searchTerm.trim()}”.`
                  : unreadsOnly
                    ? 'No unreads. You’re all caught up.'
                    : 'No activity yet.'
              }
            />
          )
        ) : (
          grouped.map((group, idx) => (
            <React.Fragment key={group.key}>
              {idx > 0 && <DateSeparator iso={group.iso} interactive={false} />}
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
                    showCheckbox={showRowCheckbox}
                    isChecked={selectedIds.has(item.id)}
                    onToggleChecked={() => handleToggleRowChecked(item)}
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
        font: 'var(--ds-font-body-small)',
      }}
    >
      {message}
    </div>
  );
}

function AllCaughtUpEmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 12,
        height: '100%',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          background: 'var(--cv2-success)',
          color: 'var(--ds-text-inverse)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--cv2-font)',
          font: 'var(--ds-font-heading-small)',
          fontWeight: 700,
          color: 'var(--cv2-text-strong)',
        }}
      >
        All caught up
      </h2>
      <p
        style={{
          margin: 0,
          maxWidth: 320,
          fontFamily: 'var(--cv2-font)',
          font: 'var(--ds-font-body)',
          color: 'var(--cv2-text-muted)',
          lineHeight: 1.45,
        }}
      >
        Looks like things are quiet for now. When there's new activity, it'll be here.
      </p>
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
        padding: '8px 14px',
        background: 'var(--cv2-bg-toolbar)',
        color: 'var(--cv2-text-strong)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        fontFamily: 'var(--cv2-font)',
        font: 'var(--ds-font-body-small)',
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
      }}
    >
      {message}
    </div>
  );
}
