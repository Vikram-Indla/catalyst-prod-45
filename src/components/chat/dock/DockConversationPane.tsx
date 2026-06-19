/**
 * DockConversationPane — in-dock conversation surface (header + messages + composer).
 *
 * Uses chat-v2 Composer + MessageList so dock conversations render with the
 * same composer chrome, markdown rendering, attachment chips, mention picker,
 * and draft persistence as the /chat page. Header + back affordance remain
 * legacy (ConversationHeader) because they are dock-shell concerns.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { MessageList } from "@/features/chat-v2/components/MessagePanel/MessageList";
import { Composer } from "@/features/chat-v2/components/Composer/Composer";
import { ComposerScheduledBanner } from "@/features/chat-v2/components/DraftsAndSent/ComposerScheduledBanner";
import { useStagedAttachments } from "@/features/chat-v2/hooks/useStagedAttachments";
import { useConversationDraft } from "@/features/chat-v2/hooks/useConversationDraft";
import { useMessageAttachments } from "@/features/chat-v2/hooks/useMessageAttachments";
import { useMyScheduledCountByConversation } from "@/features/chat-v2/hooks/useMyScheduledMessages";
import { useChatTheme } from "@/features/chat-v2/hooks/useChatTheme";
import catyIcon from "@/assets/caty-icon.svg";
// ads-scanner:ignore-next-line -- chat.css uses only ADS tokens; kept for ConversationHeader cc-* classes
import "@/components/chat/chat.css";
// ads-scanner:ignore-next-line -- chat-v2 tokens use ADS vars via --cv2-* indirection
import "@/features/chat-v2/tokens.css";

interface DockConversationPaneProps {
  conversation: ChatConversation;
  onBack: () => void;
}

const db = supabase as unknown as { from: (table: string) => any };

export function DockConversationPane({
  conversation,
  onBack,
}: DockConversationPaneProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { theme } = useChatTheme();
  const scheduledByConv = useMyScheduledCountByConversation();
  const scheduledForThisConv = scheduledByConv.get(conversation.id);

  const handleSeeAllScheduled = useCallback(() => {
    navigate("/chat?view=drafts&tab=scheduled");
  }, [navigate]);

  // Portal popovers (schedule menu, emoji picker, mention picker, attachment dropzone)
  // mount to document.body, outside the cv2-chat-shell wrapper. Mirror /chat:
  // set body[data-cv2-theme] so var(--cv2-*) tokens resolve inside portals.
  useEffect(() => {
    if (document.body.dataset.cv2Theme) return; // /chat already owns it
    document.body.dataset.cv2Theme = theme;
    return () => {
      delete document.body.dataset.cv2Theme;
    };
  }, [theme]);
  const {
    messages,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
  } = useMessages(conversation.id);
  const { data: bookmarks } = useMyBookmarks();
  const { data: pins } = useConversationPins(conversation.id);
  const toggleBookmarkMut = useToggleBookmark();
  const togglePinMut = useTogglePin();
  const staged = useStagedAttachments(conversation.id);
  const draftState = useConversationDraft(conversation.id);
  const { byMessage: attachmentsByMessage } = useMessageAttachments(
    conversation.id
  );

  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);

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
      <button
        type="button"
        className="cc-conv-pane__back"
        onClick={onBack}
        aria-label="Back to directory"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>All messages</span>
      </button>

      <ConversationHeader
        conversation={conversation}
        currentUserMuted={conversation.isMuted ?? false}
        currentUserStarred={conversation.isStarred ?? false}
        onBack={onBack}
      />

      {conversation.kind === "ticket" &&
        !summaryDismissed &&
        messages.length >= 3 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "6px 10px",
              padding: "7px 12px",
              borderRadius: 8,
              background: "var(--ds-background-information, #E8F2FF)",
              border: "1px solid var(--ds-border-information, #85B8FF)",
              fontSize: 12,
            }}
          >
            <img
              src={catyIcon}
              alt=""
              width={16}
              height={16}
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                flex: 1,
                color: "var(--ds-text-information, #0055CC)",
                fontWeight: 500,
              }}
            >
              {messages.length} messages — summarize this thread?
            </span>
            <button
              type="button"
              style={{
                background: "var(--ds-background-brand-bold, #0C66E4)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("catalyst:ask-caty", {
                    detail: {
                      prompt: `Summarize the discussion on ${
                        conversation.ticketKey ?? "this ticket"
                      }`,
                    },
                  })
                )
              }
            >
              Summarize
            </button>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ds-text-subtlest, #6B778C)",
                cursor: "pointer",
                padding: 2,
                fontSize: 16,
                lineHeight: 1,
              }}
              aria-label="Dismiss"
              onClick={() => setSummaryDismissed(true)}
            >
              ×
            </button>
          </div>
        )}

      {threadParent ? (
        <ThreadPanel
          conversationId={conversation.id}
          parentMessage={threadParent}
          conversationTitle={conversation.title}
          onClose={() => setThreadParent(null)}
          onAlsoSendToConversation={(text) => sendMessage(text)}
        />
      ) : (
        <>
          <MessageList
            messages={messages}
            loading={isLoading}
            savedIds={savedIds}
            pinnedIds={pinnedIds}
            attachmentsByMessage={attachmentsByMessage}
            onOpenThread={handleOpenThread}
            onToggleReaction={toggleReaction}
            onEdit={(messageId, markdown) => {
              void editMessage(messageId, markdown);
            }}
            onSaveLater={handleSaveLater}
            onTogglePin={handleTogglePin}
            onRequestDelete={handleRequestDelete}
          />
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
        </>
      )}
    </div>
  );
}

export default DockConversationPane;
