import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, MoreVertical, CheckCheck, MessageSquare, Settings } from "lucide-react";
import type { Notification, NotificationTab } from "@/types/notifications";
import { PANEL_WIDTH } from "@/constants/notificationConstants";
import NotificationItem from "./NotificationItem";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import AIDigestTab from "./AIDigestTab";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock notifications for Stage C UI demonstration
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1', recipient_user_id: 'me', actor_user_id: 'u1',
    actor: { id: 'u1', full_name: 'Dr. Ahmed Al-Rashid', initials: 'AA', color: '' },
    notification_type: 'assigned_work_item', entity_type: 'work_item',
    entity_id: 'e1', entity_title: 'Implement payment gateway retry logic', entity_key: 'PRJ-1042',
    entity_icon_type: 'task', hub_source: 'ProjectHub',
    status: 'In Progress', status_type: 'blue', tab: 'direct',
    metadata: {}, read_at: null, delivered_at: null, snoozed_until: null, entity_deleted: false,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: '2', recipient_user_id: 'me', actor_user_id: 'u2',
    actor: { id: 'u2', full_name: 'Eng. Fatima Al-Harbi', initials: 'FA', color: '' },
    notification_type: 'mentioned_in_comment', entity_type: 'work_item',
    entity_id: 'e2', entity_title: 'API rate limiting middleware', entity_key: 'PRJ-987',
    entity_icon_type: 'story', hub_source: 'ProjectHub',
    status: 'In Review', status_type: 'blue', tab: 'direct',
    metadata: { comment_preview: 'Can you review the edge case handling for the 429 responses? I think we need to add exponential backoff with jitter to prevent thundering herd issues when the rate limit resets.', reactions: { '👍': 2, '🔥': 1 } },
    read_at: null, delivered_at: null, snoozed_until: null, entity_deleted: false,
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: '3', recipient_user_id: 'me', actor_user_id: 'u3',
    actor: { id: 'u3', full_name: 'Mohammed Al-Qahtani', initials: 'MQ', color: '' },
    notification_type: 'status_changed', entity_type: 'work_item',
    entity_id: 'e3', entity_title: 'Database migration script for Q2 schema changes', entity_key: 'PRJ-1105',
    entity_icon_type: 'epic', hub_source: 'ProjectHub',
    status: 'Done', status_type: 'green', tab: 'watching',
    metadata: { status_from: 'In Progress', status_to: 'Done' },
    read_at: new Date().toISOString(), delivered_at: null, snoozed_until: null, entity_deleted: false,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: '4', recipient_user_id: 'me', actor_user_id: 'u4',
    actor: { id: 'u4', full_name: 'Sara Al-Dosari', initials: 'SD', color: '' },
    notification_type: 'due_date_approaching', entity_type: 'work_item',
    entity_id: 'e4', entity_title: 'Security audit for authentication module', entity_key: 'PRJ-890',
    entity_icon_type: 'bug', hub_source: 'ProjectHub',
    status: 'To Do', status_type: 'gray', tab: 'direct',
    metadata: { due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] },
    read_at: null, delivered_at: null, snoozed_until: null, entity_deleted: false,
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
  {
    id: '5', recipient_user_id: 'me', actor_user_id: 'u5',
    actor: { id: 'u5', full_name: 'Khalid Al-Mutairi', initials: 'KM', color: '' },
    notification_type: 'commented_on_work_item', entity_type: 'work_item',
    entity_id: 'e5', entity_title: 'Containerize microservices for staging', entity_key: 'PRJ-1200',
    entity_icon_type: 'task', hub_source: 'ProjectHub',
    status: 'In Progress', status_type: 'blue', tab: 'watching',
    metadata: { comment_preview: 'Docker images are ready. Need DevOps to update the Helm charts before we can proceed with staging deployment.', attachment_filename: 'docker-compose.yml' },
    read_at: new Date().toISOString(), delivered_at: null, snoozed_until: null, entity_deleted: false,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

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
  const [activeTab, setActiveTab] = useState<NotificationTab>('direct');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Simulate loading
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const t = setTimeout(() => setIsLoading(false), 600);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Animation
  useEffect(() => {
    if (isOpen) setIsAnimating(true);
  }, [isOpen]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, menuOpen, onClose]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleMarkRead = useCallback((id: string) => {
    // Stage D wiring
    console.log('Mark read:', id);
  }, []);

  const handleClick = useCallback((n: Notification) => {
    console.log('Navigate to:', n.entity_id);
    onClose();
  }, [onClose]);

  if (!isOpen && !isAnimating) return null;

  const filtered = MOCK_NOTIFICATIONS.filter(n => {
    if (activeTab !== 'ai' && n.tab !== activeTab) return false;
    if (unreadOnly && n.read_at) return false;
    return true;
  });

  const groups = groupByDate(filtered);

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
        maxHeight: 628,
        background: '#FFFFFF',
        border: '0.5px solid rgba(15,23,42,.08)',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(15,23,42,.12), 0 0 1px rgba(15,23,42,.08)',
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
      `}</style>

      {/* Header */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: '#0F172A' }}>
            Notifications
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Unread toggle */}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#64748B' }}>Only show unread</span>
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              style={{
                width: 36, height: 20, borderRadius: 10, cursor: 'pointer', border: 'none',
                background: unreadOnly ? '#16A34A' : '#334155',
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#64748B' }}
              title="Open in full page"
            >
              <ExternalLink size={16} />
            </button>
            {/* More menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#64748B' }}
              >
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    background: '#FFFFFF', border: '0.5px solid rgba(15,23,42,.08)', borderRadius: 6,
                    boxShadow: '0 4px 12px rgba(15,23,42,.12)', minWidth: 200, zIndex: 10,
                    animation: 'notif-dropdown-in 120ms ease-out forwards',
                    overflow: 'hidden',
                  }}
                >
                  {[
                    { icon: CheckCheck, label: 'Mark all as read' },
                    { icon: MessageSquare, label: 'Give feedback' },
                    { icon: Settings, label: 'Notification settings' },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      onClick={() => { setMenuOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '10px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0F172A',
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(15,23,42,.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Icon size={16} color="#64748B" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.75px solid rgba(15,23,42,.08)', marginTop: 12 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 16px', height: 36,
                  background: 'none', border: 'none', borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  transition: 'color 150ms ease',
                }}
              >
                {tab.hasDot && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', flexShrink: 0 }} />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {activeTab === 'ai' ? (
          <AIDigestTab />
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState variant={unreadOnly ? 'allCaughtUp' : 'noNotifications'} />
        ) : (
          groups.map(group => (
            <div key={group.label}>
              <SectionHeader label={group.label} />
              {group.items.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={handleMarkRead}
                  onClick={handleClick}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
