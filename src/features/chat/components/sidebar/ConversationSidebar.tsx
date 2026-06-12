import React, { useState, useMemo } from 'react';
import type { ChatConversation } from '@/types/chat';
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
      projects: active.filter(c =>
        c.kind === 'ticket' ||
        (c.kind === 'channel' && !!c.projectKey)
      ),
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

  return (
    <aside className="c-chat-sidebar" aria-label="Conversations">
      {/* Header */}
      <div className="c-sb-head">
        {!isCollapsed && (
          <h1 className="c-sb-head__title">Conversations</h1>
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

      {/* Scrollable conversation list */}
      <nav className="c-sb-scroll" aria-label="Conversation list">
        {SECTIONS.map(section => {
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
