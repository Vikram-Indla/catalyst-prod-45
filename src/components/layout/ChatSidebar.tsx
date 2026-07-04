/**
 * ChatSidebar — /chat workspace sidebar
 *
 * Same canonical pattern as ProductHubSidebar / ProjectHubSidebar:
 *   - wraps SidebarBase
 *   - controlled by `expanded` + `onToggle` (cycleSidebarState chevron)
 *   - sections-as-nav, ADS tokens only
 *
 * Sections mirror Slack workspace partitioning by ROLE — Threads, Activity
 * (mentions), Later (saved), Drafts, then DMs / Channels lists fed from
 * useConversations() so the rail IS the conversation directory.
 *
 * IconRail + in-pane ConversationList in ChatMainView remain for now until
 * the full IA refactor lands; this rail adds the workspace-level shell so
 * /chat matches the rest of the app's expand/collapse contract.
 */
import { useMemo } from 'react';
import {
  MessageSquare,
  AtSign,
  Bookmark,
  Edit3,
  Users,
  Inbox,
} from '@/lib/atlaskit-icons';
import { SidebarBase, SidebarConfig, SidebarMenuItem } from './SidebarBase';
import { useConversations } from '@/hooks/chat/useConversations';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import ProjectIcon from '@/components/shared/ProjectIcon';
import { ChatProjectRow } from './ChatProjectRow';

interface ChatSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ChatSidebar({ expanded, onToggle, className }: ChatSidebarProps) {
  const { conversations } = useConversations();

  const { channels, tickets, dms } = useMemo(() => {
    const acc = {
      channels: [] as typeof conversations,
      tickets: [] as typeof conversations,
      dms: [] as typeof conversations,
    };
    for (const c of conversations) {
      if (c.isArchived) continue;
      if (c.kind === 'channel') acc.channels.push(c);
      else if (c.kind === 'ticket') acc.tickets.push(c);
      else acc.dms.push(c);
    }
    return acc;
  }, [conversations]);

  // Project channels — render canonical ProjectIcon + show project KEY
  // (e.g. "BAU", "INV") rather than the title slug. Each channel maps 1:1
  // to a project via projectKey; when missing, fall back to title.
  const channelItems: SidebarMenuItem[] = channels.slice(0, 20).map((c) => {
    const key = c.projectKey ?? c.title ?? c.id;
    return {
      id: `ch-${c.id}`,
      title: c.projectKey ? (
        <ChatProjectRow projectKey={c.projectKey} fallbackTitle={c.title} />
      ) : (
        (c.title ?? c.id)
      ),
      path: `/chat?conv=${encodeURIComponent(c.id)}`,
      icon: ({ className: cls }) => (
        <span className={cls} style={{ display: 'inline-flex' }}>
          <ProjectIcon projectKey={c.projectKey ?? undefined} name={c.title} size="xsmall" />
        </span>
      ),
      exact: false,
    };
  });

  const ticketItems: SidebarMenuItem[] = tickets.slice(0, 20).map((c) => ({
    id: `tk-${c.id}`,
    title: c.ticketKey ?? c.title ?? c.id,
    path: `/chat?conv=${encodeURIComponent(c.id)}`,
    icon: ({ className: cls }) => (
      <span className={cls} style={{ display: 'inline-flex' }}>
        {c.ticketType ? <JiraIssueTypeIcon type={c.ticketType as any} size={14} /> : null}
      </span>
    ),
    exact: false,
  }));

  const dmItems: SidebarMenuItem[] = dms.slice(0, 20).map((c) => ({
    id: `dm-${c.id}`,
    title: c.title ?? c.id,
    path: `/chat?conv=${encodeURIComponent(c.id)}`,
    icon: Users,
    exact: false,
  }));

  const config: SidebarConfig = {
    badge: 'CH',
    label: 'Chat',
    sections: [
      {
        title: '',
        items: [
          { id: 'threads', title: 'Threads', path: '/chat?rail=threads', icon: MessageSquare, exact: true },
          { id: 'mentions', title: 'Mentions & reactions', path: '/chat?rail=mentions', icon: AtSign, exact: true },
          { id: 'later', title: 'Saved (Later)', path: '/chat?rail=saved', icon: Bookmark, exact: true },
          { id: 'drafts', title: 'Drafts & sent', path: '/chat?rail=drafts', icon: Edit3, exact: true },
          { id: 'directory', title: 'People', path: '/chat?rail=people', icon: Inbox, exact: true },
        ],
      },
      ...(channelItems.length ? [{ title: 'Projects', items: channelItems }] : []),
      ...(ticketItems.length ? [{ title: 'Tickets', items: ticketItems }] : []),
      ...(dmItems.length ? [{ title: 'Direct messages', items: dmItems }] : []),
    ],
  };

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}

export default ChatSidebar;
