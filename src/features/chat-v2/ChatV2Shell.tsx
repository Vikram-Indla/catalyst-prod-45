/**
 * ChatV2Shell — Slack-look chat surface.
 * Reuses the existing chat backend hooks (useConversations, useMessages, etc.)
 * Imports tokens.css EXACTLY ONCE from this file.
 *
 * Mounted by src/pages/chat/ChatPage.tsx.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatRealtimeProvider } from '@/hooks/chat/ChatRealtimeProvider';
import { useConversations } from '@/hooks/chat/useConversations';
import { useCreateChannel } from '@/hooks/chat/useCreateChannel';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { useMessages } from '@/hooks/chat/useMessages';
import { useThreadMessages } from '@/hooks/chat/useThreadMessages';
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';
import { useShellState } from '@/features/chat/hooks/useShellState';
import { NewConversationModal } from '@/features/chat/components/NewConversationModal';
import { WorkspaceRail } from './components/WorkspaceRail/WorkspaceRail';
import { Sidebar } from './components/Sidebar/Sidebar';
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
import { WorkspaceSearchBar } from './components/Search/WorkspaceSearchBar';
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
  // Lifted so the typewriter does NOT re-run when SummaryPanel un-/re-mounts
  // (e.g. opening a thread from a [N] reference, then closing it). Reset
  // whenever a fresh summary is requested.
  const [summaryStreamingDone, setSummaryStreamingDone] = useState(false);
  // When the user clicks a [N] reference, we may want to open a thread in
  // the same right column. This local id is the parent message of that
  // thread; null means "show summary content".
  const [summaryThreadParentId, setSummaryThreadParentId] = useState<string | null>(null);
  // Resizable left-panel widths — apply to ALL views (chat, DMs, Later, People, Activity).
  // Both panels share the same splitter component; defaults are the prior fixed widths.
  const RAIL_W = 70;
  const SPLITTER_W = 5;
  const RIGHT_PANE_MIN = 360;
  const ACTIVITY_MIN_W = 360;
  const SIDEBAR_MIN_W = 240;
  const SIDEBAR_DEFAULT_W = 280;
  const { width: activityWidth, setWidth: setActivityWidth, startResize: startActivityResize, isResizing: activityResizing } = useResizableSplit({
    initialWidth: ACTIVITY_MIN_W,
    min: ACTIVITY_MIN_W,
    max: vw => Math.max(ACTIVITY_MIN_W, vw - RAIL_W - SPLITTER_W),
  });
  const { width: sidebarWidth, setWidth: setSidebarWidth, startResize: startSidebarResize, isResizing: sidebarResizing } = useResizableSplit({
    initialWidth: SIDEBAR_DEFAULT_W,
    min: SIDEBAR_MIN_W,
    max: vw => Math.max(SIDEBAR_MIN_W, vw - RAIL_W - SPLITTER_W - RIGHT_PANE_MIN),
  });
  // Clamp both widths to the new max if the viewport shrinks below the current width.
  useEffect(() => {
    const handler = () => {
      const vw = window.innerWidth;
      const newActivityMax = Math.max(ACTIVITY_MIN_W, vw - RAIL_W - SPLITTER_W);
      if (activityWidth > newActivityMax) setActivityWidth(newActivityMax);
      const newSidebarMax = Math.max(SIDEBAR_MIN_W, vw - RAIL_W - SPLITTER_W - RIGHT_PANE_MIN);
      if (sidebarWidth > newSidebarMax) setSidebarWidth(newSidebarMax);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [activityWidth, setActivityWidth, sidebarWidth, setSidebarWidth]);
  const queryClient = useQueryClient();
  const shell = useShellState();
  const { conversations } = useConversations();
  const { user } = useAuth();
  const selfProfile = useSelfProfile();
  const { theme, toggle } = useChatTheme();
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
    if (!c) return;
    didHydrateParams.current = true;
    setActiveConversationId(c);
  }, [searchParams]);

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

  // Messages + members for the active conversation — feeds the mock summary
  // generator with real ids so [N] reference clicks land on real rows.
  const { messages: activeMessages } = useMessages(activeConversationId ?? null);
  const { data: activeMembers } = useConversationMembers(activeConversationId ?? null);
  // Thread mode summary needs the replies of whichever thread is open. Track
  // the parent id we want to summarize separately from `shell.threadMessageId`
  // so the user can summarize the SAME thread they are reading.
  const [threadSummarizeSourceId, setThreadSummarizeSourceId] = useState<string | null>(null);
  const { messages: threadSummarizeReplies } = useThreadMessages(
    activeConversationId ?? null,
    threadSummarizeSourceId,
  );

  const handleSelect = (id: string) => {
    setActiveConversationId(id);
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

  // Slack-style "New message" — opens the panel-mode multi-recipient composer
  // inside the main panel grid area. Triggered by the + icon on the
  // "Direct messages" sidebar section header.
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
      // Force a new ref each time so duplicate selects re-fire the highlight pulse.
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
    // Mock generator runs after a short delay so the loading state is visible.
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
    // Show loading state and trigger the thread-replies fetch. The actual
    // generator runs when threadSummarizeReplies populates (see effect below).
    setSummaryThreadParentId(null);
    setSummaryScope({ kind: 'thread', parentMessageId });
    setSummaryLoading(true);
    setSummaryPayload(null);
    setSummaryStreamingDone(false);
    setSearchActiveQuery(null);
    setThreadSummarizeSourceId(parentMessageId);
  };

  // When thread mode is active, generate the summary once the replies have
  // loaded. We include the parent message in the data set so it can be a
  // reference target alongside its replies.
  useEffect(() => {
    if (!activeConversation) return;
    if (!summaryScope || summaryScope.kind !== 'thread') return;
    if (threadSummarizeSourceId !== summaryScope.parentMessageId) return;
    // Build full thread message list: parent (from activeMessages) + replies.
    const parent = activeMessages.find(m => m.id === summaryScope.parentMessageId);
    const threadMessages = [
      ...(parent ? [parent] : []),
      ...threadSummarizeReplies,
    ];
    if (threadMessages.length === 0) return; // wait for fetch
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
      // "Unreads" mock: last 24h.
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
      // Thread reply — show ThreadPane in the same right column.
      setSummaryThreadParentId(ref.parentMessageId);
      return;
    }
    // Main-chat message — highlight it in the panel. Cycle through null so
    // duplicate jumps re-fire the pulse even if the id has not changed.
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
    // Reminder items (no message attached) have no panel to open.
    if (item.kind !== 'saved_message' || !item.conversationId) return;
    setActiveConversationId(item.conversationId);
    shell.closeThread();
    setActivityJumpMessageId(null);
    if (item.messageId) {
      // Force re-fire of pulse even when the same id is selected twice.
      window.setTimeout(() => setActivityJumpMessageId(item.messageId), 0);
    }
  };
  // Search results, summary, and thread pane share the right column. Order of
  // precedence: search → summary → thread. Opening any of them auto-collapses
  // the others where applicable.
  const summaryOpen = !!summaryScope && !!activeConversation;
  const searchResultsOpen = !!searchActiveQuery && !summaryOpen;
  const threadOpen = !searchResultsOpen && !summaryOpen && !!shell.threadMessageId && !!activeConversation;
  // The 5th "thread" column only exists when search is active OR summary is
  // open OR (in non-activity/later mode) a thread is open. Activity + Later
  // both use the same activity gridArea for their panel and let threads
  // replace the panel area rather than opening a 5th column.
  const wideMode = inActivityMode || inLaterMode;
  const showRightColumn = searchResultsOpen || summaryOpen || (!wideMode && threadOpen);

  // Drafts-tab row click: navigate to that conversation in chat mode.
  // useConversationDraft then re-seeds the composer with the same row.
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

  // Scheduled-tab row click: open the source conversation and mount
  // the EditScheduledMessagePanel above the composer. Composer stays
  // empty — user must explicitly choose Edit/Send now/Delete.
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

  // Sent-tab row click: jump-pulse the message in its source chat.
  // Mirrors handleSelectActivity for non-thread items + the activity
  // flow for thread replies (open ThreadPane + pulse inside it).
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

  // Clear the edit target whenever the user navigates to a different
  // conversation or leaves chat mode — the panel only makes sense for
  // the conversation it was queued in.
  useEffect(() => {
    if (!editScheduledMessage) return;
    if (
      shell.activeView !== 'chat' ||
      activeConversationId !== editScheduledMessage.conversationId
    ) {
      setEditScheduledMessage(null);
    }
  }, [shell.activeView, activeConversationId, editScheduledMessage]);

  // Layout — every view has a draggable splitter between the left panel and the right pane.
  let gridTemplateColumns: string;
  let gridTemplateAreas: string;
  if (wideMode) {
    gridTemplateColumns = showRightColumn
      ? `var(--cv2-rail-w) ${activityWidth}px 5px 1fr minmax(360px, 420px)`
      : `var(--cv2-rail-w) ${activityWidth}px 5px 1fr`;
    gridTemplateAreas = showRightColumn
      ? '"rail activity splitter panel thread"'
      : '"rail activity splitter panel"';
  } else if (showRightColumn) {
    gridTemplateColumns = `var(--cv2-rail-w) ${sidebarWidth}px 5px 1fr minmax(360px, 420px)`;
    gridTemplateAreas = '"rail sidebar splitter panel thread"';
  } else {
    gridTemplateColumns = `var(--cv2-rail-w) ${sidebarWidth}px 5px 1fr`;
    gridTemplateAreas = '"rail sidebar splitter panel"';
  }
  const sidebarStartResize = wideMode ? startActivityResize : startSidebarResize;
  const sidebarIsResizing = wideMode ? activityResizing : sidebarResizing;

  const handleSelectSearchHit = (hit: { id: string; conversationId: string; parentId?: string | null }) => {
    setActiveConversationId(hit.conversationId);
    setSelectedActivityId(null);
    if (shell.activeView === 'activity' || shell.activeView === 'later' || shell.activeView === 'people') {
      shell.setActiveView('chat');
    }
    if (hit.parentId) {
      // Thread reply — open thread, highlight reply inside ThreadPane.
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
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          height: '100vh',
          width: '100%',
          background: 'var(--cv2-bg-panel)',
          color: 'var(--cv2-text)',
          fontFamily: 'var(--cv2-font)',
          overflow: 'hidden',
        }}
      >
      <WorkspaceSearchBar
        workspaceLabel="Senaei BAU"
        onOpen={() => setSearchModalOpen(true)}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns,
          gridTemplateAreas,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <WorkspaceRail
          activeView={shell.activeView}
          onNavigate={view => {
            shell.setActiveView(view);
            if (view !== 'activity') {
              setSelectedActivityId(null);
              setActivityJumpMessageId(null);
            }
            if (view !== 'later') {
              setSelectedLaterId(null);
            }
          }}
          unreadDMs={unreadDMs}
          unreadActivity={unreadActivity}
          theme={theme}
          onToggleTheme={toggle}
          onCreate={handleNewConv}
          userName={selfProfile.name}
          userAvatarUrl={selfProfile.avatarUrl}
        />
        {inActivityMode ? (
          <ActivityPanel
            onSelectActivity={handleSelectActivity}
            selectedItemId={selectedActivityId}
            showRightBorder={false}
          />
        ) : inLaterMode ? (
          <LaterPanel
            selectedItemId={selectedLaterId}
            onSelectItem={handleSelectLater}
            showRightBorder={false}
          />
        ) : (
          <Sidebar
            activeView={shell.activeView}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelect}
            onNewConversation={handleOpenNewMessagePanel}
            onCreateChannel={() => setShowCreateChannelModal(true)}
            onOpenDrafts={() => shell.setActiveView('drafts')}
          />
        )}
        <ActivitySplitter onMouseDown={sidebarStartResize} isResizing={sidebarIsResizing} />
        {inActivityMode ? (
          selectedActivityId && activeConversation ? (
            threadOpen ? (
              <ThreadPane
                conversation={activeConversation}
                parentMessageId={shell.threadMessageId!}
                onClose={shell.closeThread}
                onSummarize={() => startSummarizeThread(shell.threadMessageId!)}
                gridArea="panel"
                initialJumpMessageId={threadJumpMessageId}
              />
            ) : (
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
            )
          ) : null
        ) : inLaterMode ? (
          selectedLaterId && activeConversation ? (
            threadOpen ? (
              <ThreadPane
                conversation={activeConversation}
                parentMessageId={shell.threadMessageId!}
                onClose={shell.closeThread}
                onSummarize={() => startSummarizeThread(shell.threadMessageId!)}
                gridArea="panel"
                initialJumpMessageId={threadJumpMessageId}
              />
            ) : (
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
            )
          ) : null
        ) : inDraftsMode ? (
          <DraftsAndSentPanel
            activeTab={shell.draftsActiveTab}
            conversations={conversations}
            onActiveTabChange={shell.setDraftsActiveTab}
            onSelectDraft={handleSelectDraft}
            onSelectScheduled={handleSelectScheduled}
            onSelectSent={handleSelectSent}
            onNewMessage={handleOpenNewMessagePanel}
          />
        ) : showNewMessagePanel ? (
          <NewMessagePanel
            selfId={user?.id ?? null}
            selfName={selfProfile.name}
            selfAvatarUrl={selfProfile.avatarUrl}
            onClose={() => setShowNewMessagePanel(false)}
            onConversationStarted={handleNewMessageSent}
          />
        ) : activeConversation ? (
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
        ) : (
          <EmptyPanel />
        )}
        {searchResultsOpen && searchActiveQuery ? (
          <WorkspaceSearchResultsPanel
            query={searchActiveQuery}
            onSelectHit={handleSelectSearchHit}
            onClose={() => setSearchActiveQuery(null)}
          />
        ) : summaryOpen && summaryScope && activeConversation ? (
          summaryThreadParentId ? (
            <ThreadPane
              conversation={activeConversation}
              parentMessageId={summaryThreadParentId}
              onClose={handleBackFromSummaryThread}
            />
          ) : (
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
          )
        ) : !inActivityMode && threadOpen && activeConversation && shell.threadMessageId ? (
          <ThreadPane
            conversation={activeConversation}
            parentMessageId={shell.threadMessageId}
            onClose={shell.closeThread}
            onSummarize={() => startSummarizeThread(shell.threadMessageId!)}
            initialJumpMessageId={threadJumpMessageId}
          />
        ) : null}
      </div>
      </div>
    </>
  );
}

function ActivitySplitter({
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
      aria-label="Resize activity panel"
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridArea: 'splitter',
        position: 'relative',
        cursor: 'col-resize',
        background: showAccent ? 'var(--cv2-accent)' : 'var(--cv2-border-strong)',
        transition: 'background 120ms ease',
        zIndex: 2,
      }}
    >
      {/* widen the hit target without widening the visual line */}
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
      {/* visible grip handle in the middle of the splitter so users can find it */}
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
          background: showAccent ? '#FFFFFF' : 'var(--cv2-text-subtle)',
          opacity: showAccent ? 0.9 : 0.45,
          pointerEvents: 'none',
          transition: 'background 120ms ease, opacity 120ms ease',
        }}
      />
    </div>
  );
}

export function ChatV2Shell() {
  return (
    <ChatRealtimeProvider>
      <ChatV2Inner />
    </ChatRealtimeProvider>
  );
}

export default ChatV2Shell;
