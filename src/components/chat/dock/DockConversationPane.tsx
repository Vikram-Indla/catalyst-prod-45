/**
 * DockConversationPane — in-dock conversation surface (header + messages + composer).
 *
 * Uses chat-v2 Composer + MessageList so dock conversations render with the
 * same composer chrome, markdown rendering, attachment chips, mention picker,
 * and draft persistence as the /chat page. Header + back affordance remain
 * legacy (ConversationHeader) because they are dock-shell concerns.
 */
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/chat/useMessages";
import {
  useMyBookmarks,
  useToggleBookmark,
  useConversationPins,
  useTogglePin,
} from "@/hooks/chat/usePinsBookmarks";
import type { ChatConversation, ChatMessage } from "@/types/chat";
import { ConversationHeader } from "@/components/chat/main/ConversationHeader";
import { ThreadPanel } from "@/components/chat/main/ThreadPanel";
import { DmSummarizePanel } from "./DmSummarizePanel";
import { MessageList } from "@/features/chat-v2/components/MessagePanel/MessageList";
import { Composer } from "@/features/chat-v2/components/Composer/Composer";
import { ComposerScheduledBanner } from "@/features/chat-v2/components/DraftsAndSent/ComposerScheduledBanner";
import { useStagedAttachments } from "@/features/chat-v2/hooks/useStagedAttachments";
import { useConversationDraft } from "@/features/chat-v2/hooks/useConversationDraft";
import { useMessageAttachments } from "@/features/chat-v2/hooks/useMessageAttachments";
import { useMyScheduledCountByConversation } from "@/features/chat-v2/hooks/useMyScheduledMessages";
import { useChatTheme } from "@/features/chat-v2/hooks/useChatTheme";
// ads-scanner:ignore-next-line -- chat.css uses only ADS tokens; kept for ConversationHeader cc-* classes
import "@/components/chat/chat.css";
// ads-scanner:ignore-next-line -- chat-v2 tokens use ADS vars via --cv2-* indirection
import "@/features/chat-v2/tokens.css";

interface DockConversationPaneProps {
  conversation: ChatConversation;
  onBack: () => void;
}

const db = supabase as unknown as { from: (table: string) => any };

// Module-level ref counter: tracks how many DockConversationPane instances
// currently own document.body[data-cv2-theme]. The attribute is set on first
// mount and deleted only when the last pane unmounts, eliminating the race with
// the full-screen /chat page (which also sets this attribute).
let cv2ThemeOwners = 0;

export function DockConversationPane({
  conversation,
  onBack,
}: DockConversationPaneProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { theme } = useChatTheme();

  // Secondary hooks are deferred by one rAF so the message list paints first.
  // Without this, all 8 hooks fire in the same synchronous reconciliation tick,
  // blocking the first visible frame of the conversation pane.
  const [secondaryReady, setSecondaryReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => { setSecondaryReady(true); });
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Empty-string sentinel: secondary hooks gate on a truthy ID, so passing ''
  // causes them to return empty data immediately without issuing any Supabase
  // queries. They will re-fire with the real ID once secondaryReady=true.
  const secondaryConvId = secondaryReady ? conversation.id : '';

  const handleSeeAllScheduled = useCallback(() => {
    navigate("/chat?view=drafts&tab=scheduled");
  }, [navigate]);

  // Portal popovers need body[data-cv2-theme] for token resolution.
  // Ref-counted so multiple panes (or co-existing /chat page) never race:
  // - first pane to mount writes the attribute
  // - last pane to unmount deletes it
  useEffect(() => {
    cv2ThemeOwners += 1;
    document.body.dataset.cv2Theme = theme;
    return () => {
      cv2ThemeOwners -= 1;
      if (cv2ThemeOwners === 0) {
        delete document.body.dataset.cv2Theme;
      }
    };
  }, [theme]);

  // Critical path: messages fire immediately on mount.
  const {
    messages,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
  } = useMessages(conversation.id);

  // Secondary path: deferred until after first paint via secondaryConvId gate.
  const { data: bookmarks } = useMyBookmarks();
  const { data: pins } = useConversationPins(secondaryConvId);
  const toggleBookmarkMut = useToggleBookmark();
  const togglePinMut = useTogglePin();
  const staged = useStagedAttachments(secondaryConvId);
  const draftState = useConversationDraft(secondaryConvId);
  const { byMessage: attachmentsByMessage } = useMessageAttachments(secondaryConvId);
  const scheduledByConv = useMyScheduledCountByConversation();
  const scheduledForThisConv = scheduledByConv.get(conversation.id);

  const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);
  const [jumpHighlightId, setJumpHighlightId] = useState<string | null>(null);

  // DM-only "summarize" panel (shared work items). Reset when the pane
  // switches to a different conversation.
  const isDm = conversation.kind === "dm";
  const [summarizeOpen, setSummarizeOpen] = useState(false);
  useEffect(() => {
    setSummarizeOpen(false);
  }, [conversation.id]);

  const savedIds = useMemo(
    () =>
      new Set(
        (bookmarks ?? [])
          .filter((b) => b.conversation_id === conversation.id)
          .map((b) => b.message_id)
      ),
    [bookmarks, conversation.id]
  );
  const pinnedIds = useMemo(
    () => new Set((pins ?? []).map((p) => p.message_id)),
    [pins]
  );

  const handleOpenThread = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId) ?? null;
      setThreadParent(msg);
    },
    [messages]
  );

  const handleSend = useCallback(
    async (markdown: string, scheduledFor?: string) => {
      if (!user?.id) return;
      const hasDoneAttachments = staged.attachments.some(
        (a) => a.status === "done"
      );
      void draftState.clearDraft();
      if (!hasDoneAttachments) {
        await sendMessage(
          markdown,
          scheduledFor ? { scheduledFor } : undefined
        );
        if (scheduledFor) {
          await queryClient.invalidateQueries({
            queryKey: ["chat-v2", "my-scheduled", user.id],
          });
          await queryClient.invalidateQueries({
            queryKey: ["chat-v2", "my-scheduled-count", user.id],
          });
        }
        return;
      }
      const bodyText = markdown.length > 0 ? markdown : "";
      const row: Record<string, unknown> = {
        conversation_id: conversation.id,
        author_id: user.id,
        body_text: bodyText,
      };
      if (scheduledFor) {
        row.scheduled_for = scheduledFor;
        row.created_at = scheduledFor;
      }
      const { data, error } = await db
        .from("chat_messages")
        .insert(row)
        .select("id")
        .single();
      if (error || !data?.id) {
        console.error("[dock] message insert with attachments failed", error);
        return;
      }
      try {
        await staged.flushToMessage(data.id as string);
      } catch {
        await queryClient.invalidateQueries({
          queryKey: ["chat", "messages", conversation.id],
        });
        return;
      }
      staged.reset();
      await queryClient.invalidateQueries({
        queryKey: ["chat", "messages", conversation.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["chat", "attachments", conversation.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["chat", "conversations"],
      });
      if (scheduledFor) {
        await queryClient.invalidateQueries({
          queryKey: ["chat-v2", "my-scheduled", user.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ["chat-v2", "my-scheduled-count", user.id],
        });
      }
    },
    [user?.id, staged, conversation.id, sendMessage, queryClient, draftState]
  );

  const handleSaveLater = useCallback(
    (messageId: string) => {
      if (!user?.id) return;
      toggleBookmarkMut.mutate({
        messageId,
        conversationId: conversation.id,
        currentlyBookmarked: savedIds.has(messageId),
      });
    },
    [user?.id, toggleBookmarkMut, conversation.id, savedIds]
  );

  const handleTogglePin = useCallback(
    (messageId: string) => {
      togglePinMut.mutate({
        messageId,
        conversationId: conversation.id,
        currentlyPinned: pinnedIds.has(messageId),
      });
    },
    [togglePinMut, conversation.id, pinnedIds]
  );

  const handleRequestDelete = useCallback(
    (messageId: string) => {
      void deleteMessage(messageId);
    },
    [deleteMessage]
  );

  return (
    <div
      className="cc-conv-pane cv2-chat-shell"
      data-cv2-theme={theme}
      style={{ height: '100%', minHeight: 0 }}
    >
      <ConversationHeader
        conversation={conversation}
        currentUserMuted={conversation.isMuted ?? false}
        currentUserStarred={conversation.isStarred ?? false}
        onBack={onBack}
        onSummarize={isDm ? () => setSummarizeOpen((v) => !v) : undefined}
        summarizeActive={summarizeOpen}
      />


      {threadParent ? (
        <ThreadPanel
          conversationId={conversation.id}
          parentMessage={threadParent}
          conversationTitle={conversation.title}
          onClose={() => setThreadParent(null)}
          onAlsoSendToConversation={(text) => sendMessage(text)}
        />
      ) : (
        <div className="cc-conv-pane__body">
          {summarizeOpen ? (
            <DmSummarizePanel
              conversation={conversation}
              onSkip={() => setSummarizeOpen(false)}
            />
          ) : (
          <MessageList
            messages={messages}
            loading={isLoading}
            savedIds={savedIds}
            pinnedIds={pinnedIds}
            attachmentsByMessage={attachmentsByMessage}
            jumpHighlightId={jumpHighlightId}
            onJumpTo={(messageId) => {
              setJumpHighlightId(messageId);
              requestAnimationFrame(() => {
                document
                  .querySelector(`.cc-conv-pane [data-message-id="${messageId}"]`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
              window.setTimeout(() => setJumpHighlightId(null), 2400);
            }}
            onOpenThread={handleOpenThread}
            onToggleReaction={toggleReaction}
            onEdit={(messageId, markdown) => {
              void editMessage(messageId, markdown);
            }}
            onSaveLater={handleSaveLater}
            onTogglePin={handleTogglePin}
            onRequestDelete={handleRequestDelete}
          />
          )}
          <Composer
            key={conversation.id}
            placeholder={`Message ${
              conversation.ticketKey ?? conversation.title ?? ""
            }`.trim()}
            conversationId={conversation.id}
            attachments={staged.attachments}
            onAttachFiles={(files) => staged.addFiles(files)}
            onRemoveAttachment={(id) => staged.removeAttachment(id)}
            isUploading={staged.isUploading}
            initialDraft={draftState.draft}
            onDraftChange={draftState.setDraft}
            bannerAttached={!!scheduledForThisConv}
            notificationBanner={
              scheduledForThisConv ? (
                <ComposerScheduledBanner
                  count={scheduledForThisConv.count}
                  nextSendAt={scheduledForThisConv.nextSendAt}
                  onSeeAll={handleSeeAllScheduled}
                />
              ) : undefined
            }
            onSend={(text) => {
              void handleSend(text);
            }}
            onScheduleSend={(text, whenIso) => {
              void handleSend(text, whenIso);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default DockConversationPane;
