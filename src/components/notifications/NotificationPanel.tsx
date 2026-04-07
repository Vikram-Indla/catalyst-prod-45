import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, MoreVertical, CheckCheck, MessageSquare, Settings, RefreshCw, X, Zap } from "lucide-react";
import type { Notification, NotificationTab } from "@/types/notifications";
import { PANEL_WIDTH } from "@/constants/notificationConstants";
import { useNotificationsQuery, useMarkAsRead, useMarkAllAsRead, useSnoozeNotification } from "@/hooks/useNotificationsNew";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActorProfiles } from "@/hooks/useActorProfiles";
import { useTheme } from "@/hooks/useTheme";
import NotificationItem from "./NotificationItem";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import AIDigestTab from "./AIDigestTab";

function useLastSyncTime() {
  return useQuery({
    queryKey: ['last-jira-sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_sync_log')
        .select('completed_at, projects_synced')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      if (error || !data?.completed_at) return null;
      return data.completed_at as string;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

function formatSyncAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function useUserId() {
  return useQuery({
    queryKey: ['auth-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Older', items: [] },
  ];

  items.forEach(n => {
    const d = new Date(n.created_at);
    if (d >= today) groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else groups[2].items.push(n);
  });

  return groups.filter(g => g.items.length > 0);
}

const TABS: { key: NotificationTab; label: string; hasDot?: boolean }[] = [
  { key: 'direct', label: 'Direct' },
  { key: 'watching', label: 'Watching' },
  { key: 'ai', label: 'AI Digest', hasDot: true },
];

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { data: userId } = useUserId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Dark mode tokens
  const T = {
    panelBg: isDark ? '#0A0A0A' : '#FFFFFF',
    surfaceBg: isDark ? '#1A1A1A' : '#FFFFFF',
    text1: isDark ? '#EDEDED' : '#0F172A',
    text2: isDark ? '#A1A1A1' : '#64748B',
    text3: isDark ? '#878787' : '#94A3B8',
    border: isDark ? '#2E2E2E' : 'rgba(15,23,42,0.08)',
    borderStrong: isDark ? '#454545' : 'rgba(15,23,42,0.12)',
    hover: isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)',
    press: isDark ? '#2E2E2E' : 'rgba(15,23,42,0.08)',
    shadow: isDark
      ? '0 8px 24px rgba(0,0,0,0.4), 0 0 1px rgba(0,0,0,0.5)'
      : '0 8px 24px rgba(15,23,42,0.12), 0 0 1px rgba(15,23,42,0.08)',
    menuBg: isDark ? '#1A1A1A' : '#FFFFFF',
    divider: isDark ? '#292929' : 'rgba(15,23,42,0.08)',
  };

  const [activeTab, setActiveTab] = useState<NotificationTab>('direct');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const focusedIndexRef = useRef(-1);

  // W6 — Load unread-only preference from notification_preferences
  const { data: savedUnreadPref } = useQuery({
    queryKey: ['notif-pref', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('show_unread_only')
        .eq('user_id', userId!)
        .eq('notification_type', 'all')
        .single();
      return data?.show_unread_only ?? false;
    },
    enabled: !!userId,
  });
  const [unreadOnly, setUnreadOnly] = useState(false);
  useEffect(() => {
    if (savedUnreadPref !== undefined) setUnreadOnly(savedUnreadPref);
  }, [savedUnreadPref]);

  // W6 — Persist unread-only pref
  const { mutate: updatePref } = useMutation({
    mutationFn: async (showUnreadOnly: boolean) => {
      if (!userId) return;
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          notification_type: 'all',
          show_unread_only: showUnreadOnly,
        }, { onConflict: 'user_id,notification_type' });
      if (error) throw error;
    },
  });

  const handleToggleUnread = useCallback(() => {
    setUnreadOnly(prev => {
      const next = !prev;
      updatePref(next);
      return next;
    });
  }, [updatePref]);

  // Unread count for toggle display (m-10)
  const { data: unreadCount } = useUnreadCount();

  // W1 — Real data from Supabase
  const { data, fetchNextPage, hasNextPage, isLoading, isError, refetch } = useNotificationsQuery(activeTab, unreadOnly);
  const allNotifications: Notification[] = (data?.pages.flat() ?? []) as unknown as Notification[];

  // Deduplicate: keep only the most recent notification per entity_key+type
  const seen = new Set<string>();
  const notifications = allNotifications.filter(n => {
    const key = `${n.entity_key}::${n.notification_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Batch-fetch actor profiles for all visible notifications
  const actorIds = useMemo(
    () => notifications.map(n => n.actor_user_id).filter((id): id is string => !!id),
    [notifications]
  );
  const { data: actorProfiles } = useActorProfiles(actorIds);


  useEffect(() => {
    setHasError(isError);
  }, [isError]);

  // W4 — Mark as read
  const { mutate: markAsRead } = useMarkAsRead();
  // W5 — Mark all as read
  const { mutate: markAllRead } = useMarkAllAsRead();
  // W8 — Snooze
  const { mutate: snooze } = useSnoozeNotification();

  // W3 — Realtime
  useRealtimeNotifications(userId, isOpen);

  // W10 — Scroll persistence
  const handleScroll = useCallback(() => {
    scrollPosRef.current = listRef.current?.scrollTop ?? 0;
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = scrollPosRef.current;
    }
  }, [isOpen]);

  // Infinite scroll — IntersectionObserver on sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNextPage(); },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  // Animation
  useEffect(() => {
    if (isOpen) setIsAnimating(true);
  }, [isOpen]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Keyboard: Escape, Arrow keys, R for read, M for mark-all
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false);
        else onClose();
        return;
      }
      // M = mark all read
      if (e.key === 'm' || e.key === 'M') {
        if (!menuOpen) markAllRead(undefined);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, menuOpen, onClose, markAllRead]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // W4 — Click handler: mark read + close + navigate
  const handleItemClick = useCallback((n: Notification) => {
    if (!n.read_at) markAsRead(n.id);
    onClose();

    const HUB_ROUTES: Record<string, string> = {
      'TestHub':      '/testhub/cases',
      'ProjectHub':   '/projecthub/items',
      'ProductHub':   '/producthub/items',
      'ReleaseHub':   '/releasehub/releases',
      'IncidentHub':  '/incidenthub/incidents',
      'TaskHub':      '/taskhub/tasks',
      'PlanHub':      '/planhub/tasks',
      'StrategyHub':  '/strategyhub',
    };

    const base = HUB_ROUTES[n.hub_source];
    if (base) {
      navigate(`${base}?openItem=${n.entity_id}`);
    }
  }, [markAsRead, onClose, navigate]);

  const handleMarkRead = useCallback((id: string) => {
    markAsRead(id);
  }, [markAsRead]);

  if (!isOpen && !isAnimating) return null;

  const groups = groupByDate(notifications);

  // Determine empty state variant
  const getEmptyVariant = () => {
    if (activeTab === 'watching') return 'noWatching' as const;
    if (unreadOnly) return 'allCaughtUp' as const;
    return 'noNotifications' as const;
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      onAnimationEnd={() => { if (!isOpen) setIsAnimating(false); }}
      style={{
        position: 'fixed',
        top: 52,
        right: 16,
        width: PANEL_WIDTH,
        bottom: 16,
        background: T.panelBg,
        border: `0.5px solid ${T.border}`,
        borderRadius: 6,
        boxShadow: T.shadow,
        zIndex: 400,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: isOpen
          ? 'notif-panel-in 200ms cubic-bezier(0.16,1,0.3,1) forwards'
          : 'notif-panel-out 150ms ease-in forwards',
      }}
    >
      <style>{`
        @keyframes notif-panel-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes notif-panel-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes notif-dropdown-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @media (max-width: 767px) {
          .notif-panel-responsive {
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100vw !important;
            max-height: 90vh !important;
            border-radius: 12px 12px 0 0 !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: T.text1, margin: 0, lineHeight: 1.2 }}>
            Notifications
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* m-10: Unread toggle with count */}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: T.text2 }}>
              Only show unread{unreadOnly && unreadCount !== undefined ? ` (${unreadCount})` : ''}
            </span>
            <button
              onClick={handleToggleUnread}
              aria-label={unreadOnly ? 'Show all notifications' : 'Show only unread'}
              style={{
                width: 36, height: 20, borderRadius: 12, cursor: 'pointer', border: 'none',
                background: unreadOnly ? '#16A34A' : (isDark ? '#444444' : '#334155'),
                position: 'relative', transition: 'background 200ms ease',
                padding: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: unreadOnly ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF',
                transition: 'left 200ms cubic-bezier(0.16,1,0.3,1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadOnly ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2L6 6M6 2L2 6" stroke="#334155" strokeWidth="1.2" strokeLinecap="round"/></svg>
                )}
              </span>
            </button>
            {/* Open full page */}
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: T.text2 }}
              title="Open in full page"
              aria-label="Open notifications in full page"
            >
              <ExternalLink size={16} />
            </button>
            {/* More menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: T.text2 }}
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  role="menu"
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    background: T.menuBg, border: `0.5px solid ${T.border}`, borderRadius: 6,
                    boxShadow: T.shadow, minWidth: 200, zIndex: 10,
                    animation: 'notif-dropdown-in 120ms ease-out forwards',
                    overflow: 'hidden',
                  }}
                >
                  {[
                    { icon: CheckCheck, label: 'Mark all as read', action: () => { markAllRead(undefined); setMenuOpen(false); }, dividerAfter: false },
                    { icon: MessageSquare, label: 'Give feedback', action: () => setMenuOpen(false), dividerAfter: true },
                    { icon: Settings, label: 'Notification settings', action: () => setMenuOpen(false), dividerAfter: false },
                  ].map(({ icon: Icon, label, action, dividerAfter }) => (
                    <div key={label}>
                      <button
                        role="menuitem"
                        onClick={action}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '10px 14px', background: 'none', border: 'none',
                          cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, color: T.text1,
                          transition: 'background 150ms ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = T.hover}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Icon size={16} color={T.text2} />
                        {label}
                      </button>
                      {/* m-05: divider between "Give feedback" and "Notification settings" */}
                      {dividerAfter && (
                        <div style={{ height: '0.5px', background: T.divider, margin: '0 14px' }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* X close button */}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 4, borderRadius: 4, color: T.text2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = T.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `0.75px solid ${T.border}`, marginTop: 12 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={isActive}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 16px', height: 50,
                  background: 'none', border: 'none', borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                  color: isActive ? '#2563EB' : T.text2,
                  transition: 'color 150ms ease',
                }}
              >
                {/* m-12: AI Digest tab dot with pulse animation when new */}
                {tab.hasDot && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', flexShrink: 0,
                    animation: 'pulseDot 1.5s infinite',
                  }} />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {/* 1.5 — Error state */}
        {hasError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: 12 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: T.text3 }}>
              Could not load notifications
            </span>
            <button
              onClick={() => { setHasError(false); refetch(); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 6,
                border: `0.5px solid ${T.borderStrong}`, background: 'transparent',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: T.text2,
              }}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : activeTab === 'ai' ? (
          <AIDigestTab />
        ) : isLoading && notifications.length === 0 ? (
          <LoadingSkeleton />
        ) : notifications.length === 0 ? (
          <EmptyState variant={getEmptyVariant()} />
        ) : (
          <>
            {groups.map(group => (
              <div key={group.label}>
                <SectionHeader label={group.label} />
                {group.items.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    actorProfile={n.actor_user_id ? actorProfiles?.get(n.actor_user_id) : undefined}
                    onMarkRead={handleMarkRead}
                    onClick={handleItemClick}
                  />
                ))}
              </div>
            ))}
            {/* Infinite scroll sentinel */}
            {hasNextPage && <div ref={sentinelRef} style={{ height: 1 }} />}
          </>
        )}
      </div>
    </div>
  );
}
