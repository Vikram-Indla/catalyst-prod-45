/**
 * ChatV2Shell — Catalyst chat surface.
 * Reuses the existing chat backend hooks (useConversations, useMessages, etc.)
 * Imports tokens.css EXACTLY ONCE from this file.
 *
 * Mounted by src/pages/chat/ChatPage.tsx — sits below the global CatalystHeader,
 * which owns the top GlobalSearch / Create / theme / notifications / avatar.
 *
 * Layout (2026-06-18): single Catalyst-style left sidebar + main panel +
 * optional right column. The purple WorkspaceRail and purple WorkspaceSearchBar
 * that used to sit at the top + left were deleted — the sidebar now mounts
 * at the same position and width as Catalyst's other sidebars, with a 4-row
 * nav (Home/DMs/Activity/Saved) at the top.
 */
import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCatalystContextOptional } from '@/contexts/CatalystContext';
import { ChatRealtimeProvider } from '@/hooks/chat/ChatRealtimeProvider';
import { useConversations } from '@/hooks/chat/useConversations';
import { useCreateChannel } from '@/hooks/chat/useCreateChannel';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { useMessages } from '@/hooks/chat/useMessages';
import { useThreadMessages } from '@/hooks/chat/useThreadMessages';
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';
import { useShellState } from '@/features/chat/hooks/useShellState';
import { NewConversationModal } from '@/features/chat/components/NewConversationModal';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatNavRail } from './components/NavRail/ChatNavRail';
import { MessagePanel } from './components/MessagePanel/MessagePanel';
import { EmptyPanel } from './components/EmptyPanel';
import { ThreadPane } from './components/Thread/ThreadPane';
import { NewMessagePanel } from './components/NewMessage/NewMessagePanel';
import { CreateChannelModal } from './components/CreateChannel/CreateChannelModal';
import { ActivityPanel } from './components/Activity/ActivityPanel';
import { LaterPanel } from './components/Later/LaterPanel';
import { DraftsAndSentPanel } from './components/DraftsAndSent/DraftsAndSentPanel';
import type { LaterItem } from './hooks/useLaterItems';
import type { DraftListItem } from './hooks/useAllDrafts';
import type { ScheduledMessage } from './hooks/useMyScheduledMessages';
import type { SentMessage } from './hooks/useMySentMessages';
import { WorkspaceSearchModal } from './components/Search/WorkspaceSearchModal';
import { WorkspaceSearchResultsPanel } from './components/Search/WorkspaceSearchResultsPanel';
import { CustomDateRangeDialog } from './components/Summarize/CustomDateRangeDialog';
import { SummaryPanel } from './components/Summarize/SummaryPanel';
import {
  type SummaryPayload,
  type SummaryReference,
} from './components/Summarize/summarize.types';
import { useChatSummarize } from '@/hooks/chat/useChatSummarize';
import type { SummarizePreset } from './components/Summarize/SummarizeMenu';
import { useRecentSearches } from './hooks/useRecentSearches';
import { useActivityFeed, type ActivityItem } from './hooks/useActivityFeed';
import { useResizableSplit } from './hooks/useResizableSplit';
import { useChatTheme } from './hooks/useChatTheme';
import { installActivityHoverTracker } from './lib/activityHoverTracker';
import './tokens.css';

// Install the global cursor tracker for activity rows. Idempotent.
installActivityHoverTracker();

const db = supabase as unknown as { from: (t: string) => any };

function useSelfProfile(): { name: string; avatarUrl: string | null } {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['chat-self-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await db
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
  return {
    name: data?.full_name ?? user?.email ?? 'Me',
    avatarUrl: data?.avatar_url ?? null,
  };
}

function ChatV2Inner() {
  const navigate = useNavigate();
  const catalystCtx = useCatalystContextOptional();
  // Nav rail collapse — driven by the global Catalyst sidebar state. The
  // CatalystHeader chevron (and `⌘[`) is the single control point.
  const navRailCollapsed = !!catalystCtx && !catalystCtx.sidebarExpanded;
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [showNewMessagePanel, setShowNewMessagePanel] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activityJumpMessageId, setActivityJumpMessageId] = useState<string | null>(null);
  const [threadJumpMessageId, setThreadJumpMessageId] = useState<string | null>(null);
  const [selectedLaterId, setSelectedLaterId] = useState<string | null>(null);
  const [editScheduledMessage, setEditScheduledMessage] = useState<ScheduledMessage | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchActiveQuery, setSearchActiveQuery] = useState<string | null>(null);
  const { recents: recentSearches, record: recordRecentSearch } = useRecentSearches();
  // Summarize: dialog open, current scope, loading, payload. When `scope` is
  // set the summary right-rail mounts and runs the (mock) generator.
  // Scope is either a date range (channel/DM) or a thread (parent id).
  const [summarizeDialogOpen, setSummarizeDialogOpen] = useState(false);
  type SummaryScope =
    | { kind: 'range'; rangeStart: string; rangeEnd: string }
    | { kind: 'thread'; parentMessageId: string };
  const [summaryScope, setSummaryScope] = useState<SummaryScope | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPayload, setSummaryPayload] = useState<SummaryPayload | null>(null);
  const [summaryStreamingDone, setSummaryStreamingDone] = useState(false);
  const [summaryThreadParentId, setSummaryThreadParentId] = useState<string | null>(null);
  // Layout dimensions:
  //   1. Nav rail (Home/DMs/Activity/Saved) — collapses to 56px icons-only.
  //   2. Sidebar slot — polymorphic + resizable. Holds Sidebar (Home),
  //      Sidebar in DM-only mode (DMs), ActivityPanel (Activity), or
  //      LaterPanel (Saved). Width persists across view switches so
  //      changing nav rows doesn't reshuffle the layout.
  const NAV_RAIL_EXPANDED_W = 220;
  const NAV_RAIL_COLLAPSED_W = 56;
  const SPLITTER_W = 5;
  const RIGHT_PANE_MIN = 360;
  const SIDEBAR_MIN_W = 280;
  const SIDEBAR_DEFAULT_W = 360;
  const navRailW = navRailCollapsed ? NAV_RAIL_COLLAPSED_W : NAV_RAIL_EXPANDED_W;
  const { width: sidebarWidth, setWidth: setSidebarWidth, startResize: startSidebarResize, isResizing: sidebarResizing } = useResizableSplit({
    initialWidth: SIDEBAR_DEFAULT_W,
    min: SIDEBAR_MIN_W,
    max: vw => Math.max(SIDEBAR_MIN_W, vw - navRailW - SPLITTER_W - RIGHT_PANE_MIN),
  });
  useEffect(() => {
    const handler = () => {
      const vw = window.innerWidth;
      const newMax = Math.max(SIDEBAR_MIN_W, vw - navRailW - SPLITTER_W - RIGHT_PANE_MIN);
      setSidebarWidth(prev => Math.min(prev, newMax));
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [navRailW]);
  const queryClient = useQueryClient();
  const shell = useShellState();
  const { conversations } = useConversations();
  const { user } = useAuth();
  const selfProfile = useSelfProfile();
  const { theme } = useChatTheme();
  const createChannelMut = useCreateChannel();
  const startDmMut = useStartDm();
  const summarizeMut = useChatSummarize();
  const [searchParams] = useSearchParams();
  const { unreadCount: unreadActivity } = useActivityFeed();

  useEffect(() => {
    document.body.dataset.cv2Theme = theme;
    return () => { delete document.body.dataset.cv2Theme; };
  }, [theme]);

  const didHydrateParams = useRef(false);
  useEffect(() => {
    if (didHydrateParams.current) return;
    const c = searchParams.get('c');
    const view = searchParams.get('view');
    const tab = searchParams.get('tab');
    if (!c && !view && !tab) return;
    didHydrateParams.current = true;
    if (c) setActiveConversationId(c);
    if (view === 'chat' || view === 'dms' || view === 'activity' || view === 'later' || view === 'people' || view === 'drafts') {
      shell.setActiveView(view);
    }
    if (tab === 'drafts' || tab === 'scheduled' || tab === 'sent') {
      shell.setDraftsActiveTab(tab);
    }
  }, [searchParams, shell]);

  const unreadDMs = useMemo(
    () =>
      conversations.filter(
        c => (c.kind === 'dm' || c.kind === 'group_dm') && c.unreadCount > 0,
      ).length,
    [conversations],
  );

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId],
  );

  const { messages: activeMessages } = useMessages(activeConversationId ?? null);
  const { data: activeMembers } = useConversationMembers(activeConversationId ?? null);
  const [threadSummarizeSourceId, setThreadSummarizeSourceId] = useState<string | null>(null);
  const { messages: threadSummarizeReplies } = useThreadMessages(
    activeConversationId ?? null,
    threadSummarizeSourceId,
  );

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
    // Mark read on open so the unread red dot clears immediately. Best-effort:
    // failure must never block opening the conversation.
    if (user?.id) {
      void db
        .from('chat_conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', id)
        .eq('user_id', user.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }));
    }
    setShowNewMessagePanel(false);
    shell.closeThread();
    setSelectedActivityId(null);
    setActivityJumpMessageId(null);
    if (
      shell.activeView === 'activity' ||
      shell.activeView === 'later' ||
      shell.activeView === 'people' ||
      shell.activeView === 'drafts'
    ) {
      shell.setActiveView('chat');
    }
  };

  const handleNewConv = () => setShowNewConvModal(true);
  const handleConversationCreated = (id: string) => {
    setShowNewConvModal(false);
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    handleSelect(id);
  };

  const handleOpenNewMessagePanel = () => {
    setShowNewMessagePanel(true);
    setActiveConversationId(undefined);
    shell.closeThread();
    setSelectedActivityId(null);
    setActivityJumpMessageId(null);
    if (
      shell.activeView === 'activity' ||
      shell.activeView === 'later' ||
      shell.activeView === 'people' ||
      shell.activeView === 'drafts'
    ) {
      shell.setActiveView('chat');
    }
  };
  const handleNewMessageSent = (id: string) => {
    setShowNewMessagePanel(false);
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    handleSelect(id);
  };

  const handleCreateChannel = async (input: { name: string; isPrivate: boolean }) => {
    const id = await createChannelMut.mutateAsync({
      title: input.name,
      isPrivate: input.isPrivate,
    });
    setShowCreateChannelModal(false);
    await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    handleSelect(id);
  };

  const handleSelectActivity = (item: ActivityItem) => {
    setSelectedActivityId(item.id);
    setActiveConversationId(item.conversationId);
    if (item.kind === 'thread' && item.parentMessageId) {
      shell.openThread(item.parentMessageId);
      setActivityJumpMessageId(null);
    } else {
      shell.closeThread();
      setActivityJumpMessageId(item.targetMessageId);
    }
  };

  // --- Summarize handlers ---
  const participantsForMembers = () =>
    (activeMembers ?? []).map(m => ({
      id: m.userId,
      name: m.name || (m.email ?? 'Member'),
      avatarUrl: null as string | null,
    }));

  const startSummarize = (rangeStart: string, rangeEnd: string) => {
    if (!activeConversation) return;
    setSummaryThreadParentId(null);
    setThreadSummarizeSourceId(null);
    setSummaryScope({ kind: 'range', rangeStart, rangeEnd });
    setSummaryLoading(true);
    setSummaryPayload(null);
    setSummaryStreamingDone(false);
    setSearchActiveQuery(null);
    shell.closeThread();
    const startTs = new Date(rangeStart + 'T00:00:00').getTime();
    const endTs = new Date(rangeEnd + 'T23:59:59').getTime();
    const messagesInRange = activeMessages.filter(m => {
      const t = new Date(m.createdAt).getTime();
      return t >= startTs && t <= endTs;
    });
    const participants = participantsForMembers();
    void summarizeMut
      .mutateAsync({
        conversationTitle: activeConversation.title,
        conversationIsPrivate: !!activeConversation.isPrivate,
        rangeStart,
        rangeEnd,
        mode: 'range',
        messages: messagesInRange,
        participants,
      })
      .then(payload => {
        setSummaryPayload(payload);
        setSummaryLoading(false);
      });
  };

  const startSummarizeThread = (parentMessageId: string) => {
    if (!activeConversation) return;
    setSummaryThreadParentId(null);
    setSummaryScope({ kind: 'thread', parentMessageId });
    setSummaryLoading(true);
    setSummaryPayload(null);
    setSummaryStreamingDone(false);
    setSearchActiveQuery(null);
    setThreadSummarizeSourceId(parentMessageId);
  };

  useEffect(() => {
    if (!activeConversation) return;
    if (!summaryScope || summaryScope.kind !== 'thread') return;
    if (threadSummarizeSourceId !== summaryScope.parentMessageId) return;
    const parent = activeMessages.find(m => m.id === summaryScope.parentMessageId);
    const threadMessages = [
      ...(parent ? [parent] : []),
      ...threadSummarizeReplies,
    ];
    if (threadMessages.length === 0) return;
    const participants = participantsForMembers();
    const conversationTitle = activeConversation.title;
    const conversationIsPrivate = !!activeConversation.isPrivate;
    let cancelled = false;
    void summarizeMut
      .mutateAsync({
        conversationTitle,
        conversationIsPrivate,
        rangeStart: parent?.createdAt?.slice(0, 10) ?? '',
        rangeEnd: threadSummarizeReplies.at(-1)?.createdAt?.slice(0, 10) ?? parent?.createdAt?.slice(0, 10) ?? '',
        mode: 'thread',
        messages: threadMessages,
        participants,
      })
      .then(payload => {
        if (cancelled) return;
        setSummaryPayload(payload);
        setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryScope, threadSummarizeReplies.length, threadSummarizeSourceId, activeConversation?.id]);

  const handleSummarizePreset = (preset: SummarizePreset) => {
    if (preset === 'custom') {
      setSummarizeDialogOpen(true);
      return;
    }
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    if (preset === 'unreads') {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      startSummarize(yesterday.toISOString().slice(0, 10), todayIso);
      return;
    }
    if (preset === 'last7') {
      const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      startSummarize(week.toISOString().slice(0, 10), todayIso);
      return;
    }
  };

  const handleCloseSummary = () => {
    setSummaryScope(null);
    setSummaryPayload(null);
    setSummaryLoading(false);
    setSummaryStreamingDone(false);
    setSummaryThreadParentId(null);
    setThreadSummarizeSourceId(null);
  };

  const handleJumpToReference = (ref: SummaryReference) => {
    if (ref.parentMessageId) {
      setSummaryThreadParentId(ref.parentMessageId);
      return;
    }
    setSummaryThreadParentId(null);
    setActivityJumpMessageId(null);
    window.setTimeout(() => setActivityJumpMessageId(ref.messageId), 0);
  };

  const handleBackFromSummaryThread = () => setSummaryThreadParentId(null);

  const inActivityMode = shell.activeView === 'activity';
  const inLaterMode = shell.activeView === 'later';
  const inDraftsMode = shell.activeView === 'drafts';

  const handleSelectLater = (item: LaterItem) => {
    setSelectedLaterId(item.id);
    if (item.kind !== 'saved_message' || !item.conversationId) return;
    setActiveConversationId(item.conversationId);
    shell.closeThread();
    setActivityJumpMessageId(null);
    if (item.messageId) {
      window.setTimeout(() => setActivityJumpMessageId(item.messageId), 0);
    }
  };
  const summaryOpen = !!summaryScope && !!activeConversation;
  const searchResultsOpen = !!searchActiveQuery && !summaryOpen;
  const threadOpen = !searchResultsOpen && !summaryOpen && !!shell.threadMessageId && !!activeConversation;
  const wideMode = inActivityMode || inLaterMode;
  // Right "thread" column shows Search / Summary in any view. ThreadPane only
  // takes the right column outside of Activity / Saved (in those modes the
  // thread fills the main panel slot — same pattern as the pre-2026-06-18
  // layout).
  const showRightColumn = searchResultsOpen || summaryOpen || (!wideMode && threadOpen);

  const handleSelectDraft = useCallback(
    (draft: DraftListItem) => {
      shell.setActiveView('chat');
      setActiveConversationId(draft.conversationId);
      shell.closeThread();
      setSelectedActivityId(null);
      setActivityJumpMessageId(null);
      setSelectedLaterId(null);
      setEditScheduledMessage(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shell.setActiveView, shell.closeThread],
  );

  const handleSelectScheduled = useCallback(
    (msg: ScheduledMessage) => {
      shell.setActiveView('chat');
      setActiveConversationId(msg.conversationId);
      shell.closeThread();
      setSelectedActivityId(null);
      setActivityJumpMessageId(null);
      setSelectedLaterId(null);
      setEditScheduledMessage(msg);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shell.setActiveView, shell.closeThread],
  );

  const handleSelectSent = useCallback(
    (msg: SentMessage) => {
      shell.setActiveView('chat');
      setActiveConversationId(msg.conversationId);
      setSelectedActivityId(null);
      setSelectedLaterId(null);
      setEditScheduledMessage(null);
      if (msg.parentId) {
        shell.openThread(msg.parentId);
        setThreadJumpMessageId(null);
        window.setTimeout(() => setThreadJumpMessageId(msg.id), 0);
        setActivityJumpMessageId(null);
      } else {
        shell.closeThread();
        setThreadJumpMessageId(null);
        setActivityJumpMessageId(null);
        window.setTimeout(() => setActivityJumpMessageId(msg.id), 0);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shell.setActiveView, shell.closeThread, shell.openThread],
  );

  useEffect(() => {
    if (!editScheduledMessage) return;
    if (
      shell.activeView !== 'chat' ||
      activeConversationId !== editScheduledMessage.conversationId
    ) {
      setEditScheduledMessage(null);
    }
  }, [shell.activeView, activeConversationId, editScheduledMessage]);

  // Minimize — close the chat and return the user to whichever route they
  // came from. ChatDockMount auto-appears once we are off /chat.
  const handleMinimize = useCallback(() => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
    } catch {
      /* noop */
    }
    navigate('/');
  }, [navigate]);

  // Sidebar nav handler — switching nav rows closes whatever was open in
  // the previous view so the user lands on a clean state. Clicking the
  // currently-active row is a no-op.
  const handleSidebarNavigate = (view: typeof shell.activeView) => {
    if (view === shell.activeView) return;
    setActiveConversationId(undefined);
    setSelectedActivityId(null);
    setActivityJumpMessageId(null);
    setSelectedLaterId(null);
    setShowNewMessagePanel(false);
    setEditScheduledMessage(null);
    setSearchActiveQuery(null);
    shell.closeThread();
    shell.setActiveView(view);
  };

  // Layout — nav rail + (resizable) sidebar + splitter + main panel + (optional thread/search/summary column).
  // Sidebar holds Sidebar / ActivityPanel / LaterPanel based on active view.
  const gridTemplateColumns = showRightColumn
    ? `${navRailW}px ${sidebarWidth}px 5px 1fr minmax(360px, 420px)`
    : `${navRailW}px ${sidebarWidth}px 5px 1fr`;
  const gridTemplateAreas = showRightColumn
    ? '"navrail sidebar splitter panel thread"'
    : '"navrail sidebar splitter panel"';

  const handleSelectSearchHit = (hit: { id: string; conversationId: string; parentId?: string | null }) => {
    setActiveConversationId(hit.conversationId);
    setSelectedActivityId(null);
    if (shell.activeView === 'activity' || shell.activeView === 'later' || shell.activeView === 'people') {
      shell.setActiveView('chat');
    }
    if (hit.parentId) {
      setActivityJumpMessageId(null);
      shell.openThread(hit.parentId);
      setThreadJumpMessageId(null);
      window.setTimeout(() => setThreadJumpMessageId(hit.id), 0);
    } else {
      shell.closeThread();
      setThreadJumpMessageId(null);
      setActivityJumpMessageId(null);
      window.setTimeout(() => setActivityJumpMessageId(hit.id), 0);
    }
  };

  // Sidebar slot — polymorphic. Activity / Saved views replace the
  // conversations Sidebar with their per-view list (ActivityPanel /
  // LaterPanel). Width is fixed by the grid template so switching
  // tabs never reshuffles the rest of the layout.
  const renderSidebarSlot = () => {
    if (inActivityMode) {
      return (
        <ActivityPanel
          onSelectActivity={handleSelectActivity}
          selectedItemId={selectedActivityId}
          showRightBorder
        />
      );
    }
    if (inLaterMode) {
      return (
        <LaterPanel
          selectedItemId={selectedLaterId}
          onSelectItem={handleSelectLater}
          showRightBorder
        />
      );
    }
    return (
      <Sidebar
        activeView={shell.activeView}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelect}
        onNewConversation={handleOpenNewMessagePanel}
        onCreateChannel={() => setShowCreateChannelModal(true)}
        onOpenDrafts={() => shell.setActiveView('drafts')}
        onOpenSearchModal={() => setSearchModalOpen(true)}
      />
    );
  };

  // Main panel slot — shows the selected item's detail. In Activity / Saved
  // views the navigator lives in the feed column to the left, so the main
  // panel shows the MessagePanel (or ThreadPane for thread activity items)
  // for the selected row. In other views it shows the current conversation
  // or the appropriate non-conversation panel.
  const renderMainPanel = () => {
    if (inDraftsMode) {
      return (
        <DraftsAndSentPanel
          activeTab={shell.draftsActiveTab}
          conversations={conversations}
          onActiveTabChange={shell.setDraftsActiveTab}
          onSelectDraft={handleSelectDraft}
          onSelectScheduled={handleSelectScheduled}
          onSelectSent={handleSelectSent}
          onNewMessage={handleOpenNewMessagePanel}
        />
      );
    }
    // Activity / Saved item detail — match the pre-2026-06-18 layout: the
    // main panel hosts MessagePanel (or ThreadPane for thread items). Items
    // that have no associated conversation (rare) leave the panel empty.
    if (inActivityMode) {
      if (selectedActivityId && activeConversation) {
        if (threadOpen && shell.threadMessageId) {
          return (
            <ThreadPane
              conversation={activeConversation}
              parentMessageId={shell.threadMessageId}
              onClose={shell.closeThread}
              onSummarize={() => startSummarizeThread(shell.threadMessageId!)}
              gridArea="panel"
              initialJumpMessageId={threadJumpMessageId}
            />
          );
        }
        return (
          <MessagePanel
            conversation={activeConversation}
            onOpenThread={shell.openThread}
            onClose={() => {
              setActiveConversationId(undefined);
              setSelectedActivityId(null);
              setActivityJumpMessageId(null);
            }}
            initialJumpMessageId={activityJumpMessageId}
            onSummarize={handleSummarizePreset}
            onOpenForwardSource={(conversationId, messageId) =>
              handleSelectSearchHit({ id: messageId, conversationId, parentId: null })
            }
            onForwardCompleted={handleSelect}
          />
        );
      }
      return <EmptyPanel />;
    }
    if (inLaterMode) {
      if (selectedLaterId && activeConversation) {
        if (threadOpen && shell.threadMessageId) {
          return (
            <ThreadPane
              conversation={activeConversation}
              parentMessageId={shell.threadMessageId}
              onClose={shell.closeThread}
              onSummarize={() => startSummarizeThread(shell.threadMessageId!)}
              gridArea="panel"
              initialJumpMessageId={threadJumpMessageId}
            />
          );
        }
        return (
          <MessagePanel
            conversation={activeConversation}
            onOpenThread={shell.openThread}
            onClose={() => {
              setActiveConversationId(undefined);
              setSelectedLaterId(null);
              setActivityJumpMessageId(null);
            }}
            initialJumpMessageId={activityJumpMessageId}
            onSummarize={handleSummarizePreset}
            onOpenForwardSource={(conversationId, messageId) =>
              handleSelectSearchHit({ id: messageId, conversationId, parentId: null })
            }
            onForwardCompleted={handleSelect}
          />
        );
      }
      return <EmptyPanel />;
    }
    if (showNewMessagePanel) {
      return (
        <NewMessagePanel
          selfId={user?.id ?? null}
          selfName={selfProfile.name}
          selfAvatarUrl={selfProfile.avatarUrl}
          onClose={() => setShowNewMessagePanel(false)}
          onConversationStarted={handleNewMessageSent}
        />
      );
    }
    if (activeConversation) {
      return (
        <MessagePanel
          conversation={activeConversation}
          onOpenThread={shell.openThread}
          onClose={() => setActiveConversationId(undefined)}
          initialJumpMessageId={activityJumpMessageId}
          onSummarize={handleSummarizePreset}
          onOpenForwardSource={(conversationId, messageId) =>
            handleSelectSearchHit({ id: messageId, conversationId, parentId: null })
          }
          onForwardCompleted={handleSelect}
          editScheduledMessage={
            editScheduledMessage && editScheduledMessage.conversationId === activeConversation.id
              ? editScheduledMessage
              : null
          }
          onDismissEditScheduled={() => setEditScheduledMessage(null)}
          onSeeAllScheduled={() => {
            shell.setActiveView('drafts');
            shell.setDraftsActiveTab('scheduled');
          }}
        />
      );
    }
    return <EmptyPanel />;
  };

  // Right column content. Priority: Search → Summary → Thread (non-wide-mode).
  // Activity / Saved item detail is NOT here — it lives in the main panel.
  const renderRightColumn = () => {
    if (searchResultsOpen && searchActiveQuery) {
      return (
        <WorkspaceSearchResultsPanel
          query={searchActiveQuery}
          onSelectHit={handleSelectSearchHit}
          onClose={() => setSearchActiveQuery(null)}
        />
      );
    }
    if (summaryOpen && summaryScope && activeConversation) {
      if (summaryThreadParentId) {
        return (
          <ThreadPane
            conversation={activeConversation}
            parentMessageId={summaryThreadParentId}
            onClose={handleBackFromSummaryThread}
          />
        );
      }
      return (
        <SummaryPanel
          mode={summaryScope.kind}
          loading={summaryLoading}
          rangeStart={summaryScope.kind === 'range' ? summaryScope.rangeStart : undefined}
          rangeEnd={summaryScope.kind === 'range' ? summaryScope.rangeEnd : undefined}
          conversationTitle={activeConversation.title}
          conversationIsPrivate={!!activeConversation.isPrivate}
          payload={summaryPayload}
          onJumpToReference={handleJumpToReference}
          onClose={handleCloseSummary}
          alreadyStreamed={summaryStreamingDone}
          onStreamingComplete={() => setSummaryStreamingDone(true)}
        />
      );
    }
    if (!wideMode && threadOpen && activeConversation && shell.threadMessageId) {
      return (
        <ThreadPane
          conversation={activeConversation}
          parentMessageId={shell.threadMessageId}
          onClose={shell.closeThread}
          onSummarize={() => startSummarizeThread(shell.threadMessageId!)}
          initialJumpMessageId={threadJumpMessageId}
        />
      );
    }
    return null;
  };

  return (
    <>
      {showNewConvModal && (
        <NewConversationModal
          onClose={() => setShowNewConvModal(false)}
          onCreated={handleConversationCreated}
        />
      )}
      {showCreateChannelModal && (
        <CreateChannelModal
          workspaceName="Catalyst"
          onClose={() => setShowCreateChannelModal(false)}
          onCreate={handleCreateChannel}
        />
      )}
      {searchModalOpen && (
        <WorkspaceSearchModal
          placeholder="Search Senaei BAU"
          currentConversationName={activeConversation?.title ?? null}
          currentConversationPrivate={!!activeConversation?.isPrivate}
          recents={recentSearches}
          onClose={() => setSearchModalOpen(false)}
          onSubmit={q => {
            recordRecentSearch(q);
            setSearchActiveQuery(q);
            setSearchModalOpen(false);
          }}
          onSelectPerson={async personId => {
            setSearchModalOpen(false);
            try {
              const conversationId = await startDmMut.mutateAsync(personId);
              handleSelect(conversationId);
            } catch (e) {
              console.error('[chat-v2] start dm from search failed', e);
            }
          }}
          onSelectMessage={hit => {
            setSearchModalOpen(false);
            handleSelectSearchHit(hit);
          }}
        />
      )}
      {summarizeDialogOpen && (
        <CustomDateRangeDialog
          onClose={() => setSummarizeDialogOpen(false)}
          onSubmit={({ start, end }) => {
            setSummarizeDialogOpen(false);
            startSummarize(start, end);
          }}
        />
      )}
      <div
        className="cv2-chat-shell"
        data-cv2-theme={theme}
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns,
          gridTemplateAreas,
          height: '100%',
          width: '100%',
          background: 'var(--cv2-bg-panel)',
          color: 'var(--cv2-text)',
          fontFamily: 'var(--cv2-font)',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <ChatNavRail
          activeView={shell.activeView}
          onNavigate={handleSidebarNavigate}
          unreadDMs={unreadDMs}
          unreadActivity={unreadActivity}
          collapsed={navRailCollapsed}
        />
        {renderSidebarSlot()}
        <SidebarSplitter onMouseDown={startSidebarResize} isResizing={sidebarResizing} />
        {renderMainPanel()}
        {renderRightColumn()}
        <MinimizeButton onClick={handleMinimize} />
      </div>
    </>
  );
}

function MinimizeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Minimize chat"
      title="Minimize chat"
      style={{
        position: 'absolute',
        top: 8,
        right: 12,
        zIndex: 50,
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cv2-bg-row-hover)',
        color: 'var(--cv2-text-subtle)',
        border: '1px solid var(--cv2-border)',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
        transition: 'background var(--cv2-transition-fast), color var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'var(--cv2-bg-row-active, var(--cv2-bg-row-hover))';
        el.style.color = 'var(--cv2-text-strong)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'var(--cv2-bg-row-hover)';
        el.style.color = 'var(--cv2-text-subtle)';
      }}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14" />
      </svg>
    </button>
  );
}

function SidebarSplitter({
  onMouseDown,
  isResizing,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const showAccent = hovered || isResizing;
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridArea: 'splitter',
        position: 'relative',
        cursor: 'col-resize',
        background: showAccent ? 'var(--cv2-accent)' : 'var(--cv2-border)',
        transition: 'background 120ms ease',
        zIndex: 2,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: -4,
          right: -4,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 3,
          height: 36,
          borderRadius: 2,
          background: showAccent ? 'var(--ds-surface)' : 'var(--cv2-text-subtle)',
          opacity: showAccent ? 0.9 : 0.35,
          pointerEvents: 'none',
          transition: 'background 120ms ease, opacity 120ms ease',
        }}
      />
    </div>
  );
}

/**
 * Shell-mounted gate — mirrors the dockMounted pattern in ChatDockMount/ChatDock.
 * ChatV2Inner owns useConversations + useActivityFeed (cascade = 8-10 parallel
 * Supabase queries on mount). Firing all of them in SyncLane on /chat navigation
 * blocks the main thread long enough for Chrome to show "Page Unresponsive".
 *
 * The fix: delay mounting ChatV2Inner by one frame via startTransition, identical
 * to how ChatDock defers DockDirectory. React renders a lightweight placeholder
 * first (committed in SyncLane, instant), then switches to TransitionLane for the
 * heavy subtree (yields every 5ms — never freezes).
 */
export function ChatV2Shell() {
  const [shellMounted, setShellMounted] = useState(false);

  useEffect(() => {
    startTransition(() => setShellMounted(true));
  }, []);

  if (!shellMounted) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--ds-text-subtlest)',
        fontSize: 'var(--ds-font-size-400)',
      }}>
        <div style={{
          width: 20,
          height: 20,
          border: '2px solid var(--ds-border)',
          borderTopColor: 'var(--ds-border-brand)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <ChatRealtimeProvider>
      <ChatV2Inner />
    </ChatRealtimeProvider>
  );
}

export default ChatV2Shell;
