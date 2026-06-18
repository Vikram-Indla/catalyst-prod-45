/**
 * DraftsAndSentPanel — left-column panel for the Drafts & sent rail
 * view. Owns three tabs (Drafts / Scheduled / Sent), bulk-edit state,
 * and the dismissable "All your outgoing messages" info banner.
 *
 * Mounted by ChatV2Shell in the same grid slot as ActivityPanel /
 * LaterPanel. Clicking a row delegates back up to the shell which
 * swaps the active view to 'chat' and routes per the spec's flows.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DraftsTab as DraftsTabId } from '@/features/chat/hooks/useShellState';
import type { ChatConversation } from '@/types/chat';
import { DraftsAndSentHeader } from './DraftsAndSentHeader';
import { DraftsAndSentTabs } from './DraftsAndSentTabs';
import { DraftsTab } from './DraftsTab';
import { ScheduledTab } from './ScheduledTab';
import { SentTab } from './SentTab';
import { OutgoingMessagesBanner, useOutgoingBannerDismissed } from './OutgoingMessagesBanner';
import { useMyScheduledCount } from '../../hooks/useMyScheduledCount';
import type { DraftListItem } from '../../hooks/useAllDrafts';
import type { ScheduledMessage } from '../../hooks/useMyScheduledMessages';
import type { SentMessage } from '../../hooks/useMySentMessages';
import {
  isDraftsTableAvailable,
  isMissingTableError,
  markDraftsTableMissing,
} from '../../lib/chatDraftsFlags';

const db = supabase as unknown as { from: (t: string) => any };

interface DraftsAndSentPanelProps {
  activeTab: DraftsTabId;
  conversations: ChatConversation[];
  onActiveTabChange: (tab: DraftsTabId) => void;
  onSelectDraft: (draft: DraftListItem) => void;
  onSelectScheduled: (msg: ScheduledMessage) => void;
  onSelectSent: (msg: SentMessage) => void;
  onNewMessage: () => void;
  /** Grid area to mount in. Defaults to 'panel' — the main content
   *  slot to the right of the conversation sidebar. */
  gridArea?: string;
}

export function DraftsAndSentPanel({
  activeTab,
  conversations,
  onActiveTabChange,
  onSelectDraft,
  onSelectScheduled,
  onSelectSent,
  onNewMessage,
  gridArea = 'panel',
}: DraftsAndSentPanelProps) {
  const conversationById = useMemo<Map<string, ChatConversation>>(() => {
    const map = new Map<string, ChatConversation>();
    for (const c of conversations) map.set(c.id, c);
    return map;
  }, [conversations]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bannerDismissed, dismissBanner] = useOutgoingBannerDismissed();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [draftsCount, setDraftsCount] = useState(0);
  const scheduledCount = useMyScheduledCount();

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleToggleEdit = useCallback(() => {
    setSelectMode(true);
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(
    (allIds: string[], allSelected: boolean) => {
      setSelectedIds(allSelected ? new Set() : new Set(allIds));
    },
    [],
  );

  const handleDelete = useCallback(async () => {
    if (!user?.id) return;
    if (selectedIds.size === 0) return;
    if (!isDraftsTableAvailable()) {
      exitSelectMode();
      return;
    }
    const ids = Array.from(selectedIds);
    try {
      await db
        .from('chat_message_drafts')
        .delete()
        .eq('user_id', user.id)
        .in('conversation_id', ids);
      queryClient.invalidateQueries({ queryKey: ['chat-v2', 'all-drafts', user.id] });
      // Also clear any per-conv draft cache for the deleted conversations.
      ids.forEach(convId => {
        queryClient.setQueryData(['chat-v2', 'draft', user.id, convId], null);
      });
    } catch (err) {
      if (isMissingTableError(err)) markDraftsTableMissing();
      console.warn('[chat-v2] bulk draft delete failed', err);
    }
    exitSelectMode();
  }, [user?.id, selectedIds, queryClient, exitSelectMode]);

  // Esc exits select mode without deleting.
  React.useEffect(() => {
    if (!selectMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        exitSelectMode();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [selectMode, exitSelectMode]);

  // Exiting select mode when leaving the Drafts tab — bulk actions
  // are Drafts-only.
  React.useEffect(() => {
    if (activeTab !== 'drafts' && selectMode) {
      exitSelectMode();
    }
  }, [activeTab, selectMode, exitSelectMode]);

  return (
    <section
      aria-label="Drafts and sent"
      style={{
        gridArea,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <DraftsAndSentHeader
        showEditAction={activeTab === 'drafts' && draftsCount > 0}
        inEditMode={selectMode}
        selectedCount={selectedIds.size}
        onToggleEdit={handleToggleEdit}
        onDelete={() => { void handleDelete(); }}
        onDone={exitSelectMode}
      />
      <DraftsAndSentTabs
        activeTab={activeTab}
        draftsCount={draftsCount}
        scheduledCount={scheduledCount}
        onSelect={onActiveTabChange}
      />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!bannerDismissed && <OutgoingMessagesBanner onDismiss={dismissBanner} />}
        {activeTab === 'drafts' && (
          <DraftsTab
            selectMode={selectMode}
            selectedIds={selectedIds}
            conversationById={conversationById}
            onSelectDraft={onSelectDraft}
            onToggleSelected={handleToggleSelected}
            onToggleSelectAll={handleToggleSelectAll}
            onCountChange={setDraftsCount}
            onNewMessage={onNewMessage}
          />
        )}
        {activeTab === 'scheduled' && (
          <ScheduledTab
            conversationById={conversationById}
            onSelectScheduled={onSelectScheduled}
          />
        )}
        {activeTab === 'sent' && (
          <SentTab
            conversationById={conversationById}
            onSelectSent={onSelectSent}
          />
        )}
      </div>
    </section>
  );
}

