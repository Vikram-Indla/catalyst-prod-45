import React, { useState, useMemo } from 'react';
import type { ChatConversation } from '@/types/chat';
import type { ChatView } from '../../hooks/useShellState';
import { CatyFabIcon } from '@/components/chat/dock/CatyFabIcon';
import { ConversationRow } from './ConversationRow';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './conversation-row.css';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './conversation-sidebar.css';

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  activeConversationId: string | undefined;
  onSelectConversation: (id: string) => void;
  onNewConversation?: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  activeView: ChatView;
  onNavigate: (view: ChatView) => void;
}

interface SectionConfig {
  id: string;
  label: string;
}

const SECTIONS: SectionConfig[] = [
  { id: 'projects',  label: 'Projects' },
  { id: 'channels',  label: 'Channels' },
  { id: 'dms',       label: 'Direct Messages' },
  { id: 'archived',  label: 'Archived' },
];

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);
const HomeNavIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const ActivityNavIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const PeopleNavIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const CollapseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

function SectionHeader({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="c-sb-section__head"
      onClick={onToggle}
      aria-expanded={expanded}
    >
      <span className="c-sb-section__chev">
        <ChevronIcon />
      </span>
      <span className="c-sb-section__lbl">{label}</span>
      {count > 0 && <span className="c-sb-section__count">{count}</span>}
    </button>
  );
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onToggleCollapse,
  isCollapsed,
  activeView,
  onNavigate,
}: ConversationSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    projects: true,
    channels: true,
    dms: true,
    archived: false,
  });

  const grouped = useMemo(() => {
    const active = conversations.filter(c => !c.isArchived);
    const archived = conversations.filter(c => c.isArchived);
    return {
      // Project conversations: ticket threads + project-linked channels
      projects: active.filter(c =>
        c.kind === 'ticket' ||
        (c.kind === 'channel' && !!c.projectKey)
      ),
      // Channels: custom channels + unlinked channels
      channels: active.filter(c =>
        c.kind === 'custom_channel' ||
        (c.kind === 'channel' && !c.projectKey)
      ),
      dms: active.filter(c => c.kind === 'dm' || c.kind === 'group_dm'),
      archived,
    };
  }, [conversations]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sectionData: Record<string, ChatConversation[]> = grouped;

  const isDmsView = activeView === 'dms';
  const visibleSections = isDmsView
    ? SECTIONS.filter(s => s.id === 'dms')
    : SECTIONS;

  return (
    <aside className="c-chat-sidebar" aria-label="Chat">
      {/* Header */}
      <div className="c-sb-head">
        {!isCollapsed && (
          <div className="c-sb-head__brand">
            <CatyFabIcon size={28} />
            <span className="c-sb-head__title">Chat</span>
          </div>
        )}
        {isCollapsed && (
          <div className="c-sb-head__brand c-sb-head__brand--collapsed">
            <CatyFabIcon size={28} />
          </div>
        )}
        <div className="c-sb-head__actions">
          {!isCollapsed && onNewConversation && (
            <button
              className="c-sb-head__btn hide-collapsed"
              aria-label="New conversation"
              title="New conversation"
              onClick={onNewConversation}
            >
              <PlusIcon />
            </button>
          )}
          <button
            className="c-sb-head__btn"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
          </button>
        </div>
      </div>

      {/* Nav tabs: Home / Activity / People */}
      {!isCollapsed && (
        <div className="c-sb-nav" role="tablist" aria-label="Chat navigation">
          <button
            className={`c-sb-nav__btn${activeView === 'chat' ? ' c-sb-nav__btn--active' : ''}`}
            role="tab"
            aria-selected={activeView === 'chat'}
            onClick={() => onNavigate('chat')}
            title="Home"
          >
            <HomeNavIcon />
            <span>Home</span>
          </button>
          <button
            className={`c-sb-nav__btn${activeView === 'activity' ? ' c-sb-nav__btn--active' : ''}`}
            role="tab"
            aria-selected={activeView === 'activity'}
            onClick={() => onNavigate('activity')}
            title="Activity"
          >
            <ActivityNavIcon />
            <span>Activity</span>
          </button>
          <button
            className={`c-sb-nav__btn${activeView === 'people' ? ' c-sb-nav__btn--active' : ''}`}
            role="tab"
            aria-selected={activeView === 'people'}
            onClick={() => onNavigate('people')}
            title="People"
          >
            <PeopleNavIcon />
            <span>People</span>
          </button>
        </div>
      )}

      {/* Scrollable conversation list */}
      <nav className="c-sb-scroll" aria-label="Conversation list">
        {visibleSections.map(section => {
          const items = sectionData[section.id] ?? [];
          if (items.length === 0) return null;
          const isExpanded = expandedSections[section.id] ?? true;

          return (
            <div key={section.id} className="c-sb-section">
              <SectionHeader
                label={section.label}
                count={items.filter(c => c.unreadCount > 0).length}
                expanded={isExpanded}
                onToggle={() => toggleSection(section.id)}
              />
              {isExpanded && items.map(conv => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={onSelectConversation}
                />
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
