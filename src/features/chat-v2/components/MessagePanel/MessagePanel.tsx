import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessagePanelHeader, type PanelTab } from './MessagePanelHeader';
import { MessageList } from './MessageList';
import { Composer } from '../Composer/Composer';
import { ForwardModal } from '../Forward/ForwardModal';
import { DeleteMessageDialog } from './DeleteMessageDialog';
import { PinsPanel } from './PinsPanel';
import { DropzoneOverlay } from '../Attachments/DropzoneOverlay';
import { UploadProgressBanner } from '../Attachments/UploadProgressBanner';
import { ChannelEmptyState } from './ChannelEmptyState';
import { AddPeopleModal } from '../CreateChannel/AddPeopleModal';
import { EditDescriptionModal } from '../CreateChannel/EditDescriptionModal';
import { computeSeenCaption } from './seenReceipts';
import { useMessages } from '@/hooks/chat/useMessages';
import { useChatMessageActions } from '@/hooks/chat/useChatMessageActions';
import { useChatToggleStar } from '@/hooks/chat/useChatActions';
import { useConversationPins, useTogglePin, useMyBookmarks, useToggleBookmark } from '@/hooks/chat/usePinsBookmarks';
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { useStartGroupDm } from '@/hooks/chat/useStartGroupDm';
import { useStagedAttachments } from '../../hooks/useStagedAttachments';
import { useMessageAttachments } from '../../hooks/useMessageAttachments';
import { useConversationDraft } from '../../hooks/useConversationDraft';
import { useTypingPresence } from '../../hooks/useTypingPresence';
import { useMyScheduledCountByConversation } from '../../hooks/useMyScheduledMessages';
import { ScheduledEditBanner } from '../DraftsAndSent/ScheduledEditBanner';
import { ComposerScheduledBanner } from '../DraftsAndSent/ComposerScheduledBanner';
import type { ScheduledMessage } from '../../hooks/useMyScheduledMessages';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveHuddleIds, useHuddleActions } from '@/hooks/chat/useHuddleData';
import { catalystToast } from '@/lib/catalystToast';
import { HuddlePanel } from '../Huddle/HuddlePanel';
import type { ChatConversation, ChatMessage } from '@/types/chat';
import type { ForwardRecipient } from '../Forward/ForwardModal';

interface MessagePanelProps {
  conversation: ChatConversation;
  onOpenThread: (messageId: string) => void;
  onClose?: () => void;
  /** When provided, the panel scroll-jumps + pulses this message id whenever the value changes. */
  initialJumpMessageId?: string | null;
  /** Unread watermark (ISO) captured before mark-read-on-open. Messages from
   *  others after this instant render below a "New messages" divider. */
  unreadSince?: string | null;
  /** Triggered when the user picks a summarize preset from the header menu. */
  onSummarize?: (preset: 'unreads' | 'last7' | 'custom') => void;
  /** Called when the user clicks "View message" on a forwarded card. */
  onOpenForwardSource?: (conversationId: string, messageId: string) => void;
  /** Called after a forward succeeds — passes the destination conversation
   *  id to route to (single DM, group DM, or first channel). */
  onForwardCompleted?: (conversationId: string) => void;
  /** When set, the composer seeds with this scheduled message's body
   *  and shows the scheduled-edit banner above. The composer's normal
   *  send + chevron remain — Send saves the body edit, chevron lets
   *  the user reschedule (all against the same id). Cleared via
   *  onDismissEditScheduled. */
  editScheduledMessage?: ScheduledMessage | null;
  onDismissEditScheduled?: () => void;
  /** Called when the user clicks "See all scheduled messages" on the
   *  passive (non-edit) scheduled banner. */
  onSeeAllScheduled?: () => void;
}

export function MessagePanel({ conversation, onOpenThread, onClose, initialJumpMessageId, unreadSince, onSummarize, onOpenForwardSource, onForwardCompleted, editScheduledMessage, onDismissEditScheduled, onSeeAllScheduled }: MessagePanelProps) {
  const { user } = useAuth();
  const activeHuddleIds = useActiveHuddleIds();
  const { startOrJoin } = useHuddleActions();
  const onStartHuddle = async () => {
    try { await startOrJoin(conversation); }
    catch (e) {
      console.error('[huddle] start failed:', e);
      const msg = e instanceof Error ? e.message : String(e);
      const full = msg === 'HUDDLE_FULL';
      const mic = e instanceof DOMException || /getUserMedia|NotAllowed|NotFound|Permission|microphone/i.test(msg);
      catalystToast.error(
        full ? 'Huddle is full' : 'Could not start huddle',
        full ? 'A huddle allows up to 4 people.'
          : mic ? 'Microphone blocked — allow mic access and try again.'
          : msg,
      );
    }
  };
  const { messages, isLoading, sendMessage } = useMessages(conversation.id);
  const { toggleReaction, editMessage, deleteMessage } = useChatMessageActions(conversation.id);
  const { data: pins } = useConversationPins(conversation.id);
  const { data: bookmarks } = useMyBookmarks();
  const { data: members } = useConversationMembers(conversation.id);
  const togglePinMut = useTogglePin();
  const toggleBookmarkMut = useToggleBookmark();
  const startDmMut = useStartDm();
  const startGroupDmMut = useStartGroupDm();
  const toggleStarMut = useChatToggleStar();
  const queryClient = useQueryClient();
  const savedIds = useMemo(
    () => new Set((bookmarks ?? []).filter(b => b.conversation_id === conversation.id).map(b => b.message_id)),
    [bookmarks, conversation.id],
  );
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());
  const [jumpHighlightId, setJumpHighlightId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>('messages');
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [editDescOpen, setEditDescOpen] = useState(false);
  const staged = useStagedAttachments(conversation.id);
  const { byMessage: attachmentsByMessage } = useMessageAttachments(conversation.id);
  const draftState = useConversationDraft(conversation.id);
  const myName = useMemo(
    () => (members ?? []).find(m => m.id === user?.id)?.name || null,
    [members, user?.id],
  );
  const { typingUsers, notifyTyping } = useTypingPresence(conversation.id, myName);
  const scheduledByConv = useMyScheduledCountByConversation();
  const inScheduledEdit = !!editScheduledMessage;
  const scheduledForThisConv = scheduledByConv.get(conversation.id);
  // When editing a scheduled message, seed the composer with that
  // message's body instead of the persisted draft. Disabling
  // onDraftChange in this mode prevents the in-flight edits from
  // overwriting the unrelated conversation draft.
  const initialComposerBody = inScheduledEdit
    ? editScheduledMessage!.bodyMd
    : draftState.draft;
  const composerKey = inScheduledEdit
    ? `${conversation.id}::sched:${editScheduledMessage!.id}`
    : conversation.id;

  const invalidateScheduledQueries = useCallback(() => {
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-scheduled', user.id] });
    queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-scheduled-count', user.id] });
    queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversation.id] });
    queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-sent', user.id] });
  }, [queryClient, user?.id, conversation.id]);

  const handleScheduledUpdate = useCallback(
    async (newBody: string, newScheduledFor?: string) => {
      if (!user?.id || !editScheduledMessage) return;
      const db = supabase as unknown as { from: (t: string) => any };
      try {
        const update: Record<string, unknown> = { body_text: newBody };
        if (newScheduledFor) {
          update.scheduled_for = newScheduledFor;
          update.created_at = newScheduledFor;
        }
        await db
          .from('chat_messages')
          .update(update)
          .eq('id', editScheduledMessage.id)
          .eq('author_id', user.id)
          .is('delivered_at', null);
      } catch (err) {
        console.warn('[chat-v2] scheduled update failed', err);
      }
      invalidateScheduledQueries();
      onDismissEditScheduled?.();
    },
    [user?.id, editScheduledMessage, invalidateScheduledQueries, onDismissEditScheduled],
  );

  const [dragDepth, setDragDepth] = useState(0);
  const isDragging = dragDepth > 0;
  const dragDepthRef = useRef(0);

  // Reset staged + drag counter on conversation switch.
  useEffect(() => {
    staged.reset();
    dragDepthRef.current = 0;
    setDragDepth(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const pinnedIds = useMemo(() => new Set((pins ?? []).map(p => p.message_id)), [pins]);
  const pinnedByMap = useMemo(() => {
    const map: Record<string, { name: string | null; isMe: boolean }> = {};
    const nameById: Record<string, string> = {};
    (members ?? []).forEach(m => { nameById[m.userId] = m.name; });
    (pins ?? []).forEach(p => {
      map[p.message_id] = {
        name: p.pinned_by ? (nameById[p.pinned_by] ?? null) : null,
        isMe: p.pinned_by === user?.id,
      };
    });
    return map;
  }, [pins, members, user?.id]);

  const placeholder = `Message ${conversation.title}`;

  const handleSaveLater = useCallback(
    (id: string) => {
      const currentlyBookmarked = savedIds.has(id);
      void toggleBookmarkMut.mutateAsync({
        conversationId: conversation.id,
        messageId: id,
        currentlyBookmarked,
      });
    },
    [savedIds, toggleBookmarkMut, conversation.id],
  );

  const handleShare = useCallback(
    (id: string) => {
      const msg = messages.find(m => m.id === id);
      if (msg) setForwardMessage(msg);
    },
    [messages],
  );

  const handleJumpTo = useCallback((messageId: string) => {
    setJumpHighlightId(messageId);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    setTimeout(() => setJumpHighlightId(null), 2400);
  }, []);

  // Drive jump highlights from the parent (e.g. ActivityPanel selecting an item).
  useEffect(() => {
    if (!initialJumpMessageId) return;
    if (isLoading) return;
    if (!messages.some(m => m.id === initialJumpMessageId)) return;
    requestAnimationFrame(() => handleJumpTo(initialJumpMessageId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJumpMessageId, isLoading, messages.length]);

  const handleEdit = useCallback(
    (messageId: string, markdown: string) => {
      void editMessage(messageId, markdown);
    },
    [editMessage],
  );

  const handleRequestDelete = useCallback(
    (messageId: string) => {
      const msg = messages.find(m => m.id === messageId);
      if (msg) setPendingDelete(msg);
    },
    [messages],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setRemovingIds(prev => new Set(prev).add(id));
    setPendingDelete(null);
    // Wait for the 300ms removal animation to finish before issuing the soft-delete.
    setTimeout(() => {
      void deleteMessage(id);
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 320);
  }, [pendingDelete, deleteMessage]);

  const handleTogglePin = useCallback(
    (messageId: string) => {
      const currentlyPinned = pinnedIds.has(messageId);
      void togglePinMut.mutateAsync({
        conversationId: conversation.id,
        messageId,
        currentlyPinned,
      });
    },
    [pinnedIds, togglePinMut, conversation.id],
  );

  const handleCopyLink = useCallback((messageId: string) => {
    const url = `${window.location.origin}/chat?c=${conversation.id}&m=${messageId}`;
    void navigator.clipboard?.writeText(url);
  }, [conversation.id]);

  const handleMarkUnread = useCallback(
    async (messageId: string) => {
      if (!user?.id) return;
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;
      // Set last_read_at to one millisecond before the target so the message and
      // everything after appear unread on next render.
      const beforeIso = new Date(new Date(msg.createdAt).getTime() - 1).toISOString();
      const db = supabase as unknown as { from: (table: string) => any };
      const { error } = await db
        .from('chat_conversation_members')
        .update({ last_read_at: beforeIso })
        .eq('conversation_id', conversation.id)
        .eq('user_id', user.id);
      if (error) {
        console.error('[chat-v2] mark unread failed', error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
    [user?.id, messages, conversation.id, queryClient],
  );

  const handleForwardSubmit = useCallback(
    async (recipients: ForwardRecipient[], comment: string, whenIso?: string) => {
      if (!forwardMessage || !user?.id) { setForwardMessage(null); return; }
      const source = forwardMessage;
      const sourceConversationTitle = conversation.title;
      const sourceConversationIsPrivate = !!conversation.isPrivate;
      const sourceConversationKind = conversation.kind;
      const previewText = source.bodyText.length > 280
        ? source.bodyText.slice(0, 280) + '…'
        : source.bodyText;
      const composedFallback = comment.trim()
        ? `${comment.trim()}\n\n> ${source.authorName}: ${previewText}`
        : `> ${source.authorName}: ${previewText}`;
      const forwardAdf = {
        type: 'forward',
        sourceMessageId: source.id,
        sourceConversationId: source.conversationId,
        sourceConversationTitle,
        sourceConversationIsPrivate,
        sourceConversationKind,
        sourceAuthorId: source.authorId,
        sourceAuthorName: source.authorName,
        sourceAuthorAvatarUrl: source.authorAvatarUrl,
        sourceBodyText: source.bodyText,
        sourceCreatedAt: source.createdAt,
        comment: comment.trim() || null,
      };
      const db = supabase as unknown as { from: (table: string) => any };

      // Split recipients: channels each get an insert; persons combine into
      // a single group DM (≥2) or 1:1 DM (=1) so the forward UI mirrors the
      // group-create flow from the + button.
      const channelIds: string[] = [];
      const personIds: string[] = [];
      for (const r of recipients) {
        const [kind, rawId] = r.id.split(':');
        if (kind === 'channel') channelIds.push(rawId);
        else if (kind === 'person') personIds.push(rawId);
      }

      const destinations: string[] = [];
      let personDestinationId: string | null = null;
      for (const cid of channelIds) destinations.push(cid);
      try {
        if (personIds.length === 1) {
          const cid = await startDmMut.mutateAsync(personIds[0]);
          destinations.push(cid);
          personDestinationId = cid;
        } else if (personIds.length >= 2 && personIds.length <= 7) {
          const cid = await startGroupDmMut.mutateAsync(personIds);
          destinations.push(cid);
          personDestinationId = cid;
        } else if (personIds.length > 7) {
          console.error('[chat-v2] forward: group DM capped at 7 others, splitting first 7');
          const cid = await startGroupDmMut.mutateAsync(personIds.slice(0, 7));
          destinations.push(cid);
          personDestinationId = cid;
        }
      } catch (e) {
        console.error('[chat-v2] forward: resolve person dm/group failed', e);
      }

      const targetIds: string[] = [];
      for (const cid of destinations) {
        const row: Record<string, unknown> = {
          conversation_id: cid,
          author_id: user.id,
          body_text: composedFallback,
          body_adf: forwardAdf,
        };
        if (whenIso) {
          row.scheduled_for = whenIso;
          row.created_at = whenIso;
        }
        const { error } = await db.from('chat_messages').insert(row);
        if (error) {
          console.error('[chat-v2] forward insert failed', cid, error);
          continue;
        }
        targetIds.push(cid);
      }

      for (const cid of targetIds) {
        await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', cid] });
      }
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      setForwardMessage(null);
      // Route to the resulting conversation: prefer the person DM/group DM
      // the user just forwarded into, otherwise the first channel destination.
      const routeTo = personDestinationId
        ?? (targetIds.find(id => channelIds.includes(id)) ?? targetIds[0] ?? null);
      if (routeTo) onForwardCompleted?.(routeTo);
    },
    [forwardMessage, user?.id, startDmMut, startGroupDmMut, queryClient, conversation, onForwardCompleted],
  );

  const handleSend = useCallback(
    async (markdown: string, scheduledFor?: string) => {
      if (!user?.id) return;
      const hasDoneAttachments = staged.attachments.some(a => a.status === 'done');
      // Clear the persisted draft for this conversation — the user just
      // sent (or scheduled) the message, so the draft is no longer needed.
      // Fire-and-forget; consistency is best-effort.
      void draftState.clearDraft();
      if (!hasDoneAttachments) {
        await sendMessage(markdown, scheduledFor ? { scheduledFor } : undefined);
        if (scheduledFor) {
          // Re-fetch scheduled list + count so the composer banner above
          // updates from "1 message scheduled" -> "2 messages scheduled"
          // immediately.
          await queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-scheduled', user.id] });
          await queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-scheduled-count', user.id] });
        }
        return;
      }
      const db = supabase as unknown as { from: (table: string) => any };
      const bodyText = markdown.length > 0 ? markdown : '';
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
        .from('chat_messages')
        .insert(row)
        .select('id')
        .single();
      if (error || !data?.id) {
        console.error('[chat-v2] message insert with attachments failed', error);
        return;
      }
      try {
        await staged.flushToMessage(data.id as string);
      } catch (e) {
        // flushToMessage has already marked the chips as errored; leave
        // them in the composer so the user can see the cause and retry.
        await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversation.id] });
        return;
      }
      staged.reset();
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversation.id] });
      await queryClient.invalidateQueries({ queryKey: ['chat', 'attachments', conversation.id] });
      await queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      if (scheduledFor) {
        await queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-scheduled', user.id] });
        await queryClient.invalidateQueries({ queryKey: ['chat-v2', 'my-scheduled-count', user.id] });
      }
    },
    [user?.id, staged, conversation.id, sendMessage, queryClient, draftState],
  );

  // Drag-and-drop handlers — count depth so nested children don't flicker the overlay.
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragDepth(dragDepthRef.current);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    setDragDepth(dragDepthRef.current);
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setDragDepth(0);
      staged.addFiles(Array.from(e.dataTransfer.files));
    },
    [staged],
  );

  const pinnedMessages = useMemo(
    () => messages.filter(m => pinnedIds.has(m.id)),
    [messages, pinnedIds],
  );

  // WhatsApp-style "Seen" receipt under my last message — DMs/group DMs only.
  // Live updates ride the existing members-query invalidations; no new subscriptions.
  const seenCaption = useMemo(
    () => computeSeenCaption(messages, members ?? [], user?.id ?? null, conversation.kind),
    [messages, members, user?.id, conversation.kind],
  );

  const handleOpenPinned = useCallback(
    (messageId: string) => {
      setActiveTab('messages');
      requestAnimationFrame(() => handleJumpTo(messageId));
    },
    [handleJumpTo],
  );

  return (
    <section
      aria-label="Conversation"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        gridArea: 'panel',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-panel)',
        minWidth: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {staged.isUploading && <UploadProgressBanner />}
      <MessagePanelHeader
        conversation={conversation}
        activeTab={activeTab}
        pinCount={pinnedMessages.length}
        onTabChange={setActiveTab}
        onSummarize={onSummarize}
        onClose={onClose}
        onToggleStar={() => {
          void toggleStarMut.mutateAsync({
            convId: conversation.id,
            starred: !conversation.isStarred,
          });
        }}
        onStartHuddle={() => { void onStartHuddle(); }}
        huddleActive={activeHuddleIds.has(conversation.id)}
        members={members ?? []}
        onOpenMembers={() => setAddPeopleOpen(true)}
      />
      {activeTab === 'messages' &&
        (conversation.kind === 'channel' || conversation.kind === 'custom_channel') &&
        !conversation.projectKey &&
        !isLoading && (
          <ChannelEmptyState
            conversation={conversation}
            onAddPeople={() => setAddPeopleOpen(true)}
            onEditDescription={() => setEditDescOpen(true)}
          />
        )}
      {addPeopleOpen && (
        <AddPeopleModal
          conversationId={conversation.id}
          channelTitle={conversation.title}
          workspaceName="Catalyst"
          existingMemberIds={new Set((members ?? []).map(m => m.userId))}
          onClose={() => setAddPeopleOpen(false)}
          onAdded={() => { /* invalidations handled inside modal */ }}
        />
      )}
      {editDescOpen && (
        <EditDescriptionModal
          conversationId={conversation.id}
          currentDescription={(conversation as any).description ?? null}
          onClose={() => setEditDescOpen(false)}
          onSaved={() => { /* invalidations handled inside modal */ }}
        />
      )}
      {activeTab === 'pins' ? (
        <PinsPanel
          pinnedMessages={pinnedMessages}
          savedIds={savedIds}
          onOpenMessage={handleOpenPinned}
          onAddReaction={(id, emoji) => { void toggleReaction(id, emoji); }}
          onReply={onOpenThread}
          onShare={handleShare}
          onSaveLater={handleSaveLater}
          onCopyLink={handleCopyLink}
          onMarkUnread={handleMarkUnread}
          onTogglePin={handleTogglePin}
          onEdit={handleEdit}
          onRequestDelete={handleRequestDelete}
        />
      ) : (
      <>
      <HuddlePanel conversation={conversation} />
      <MessageList
        messages={messages}
        loading={isLoading}
        unreadSince={unreadSince}
        currentUserId={user?.id ?? null}
        savedIds={savedIds}
        pinnedIds={pinnedIds}
        pinnedByMap={pinnedByMap}
        attachmentsByMessage={attachmentsByMessage}
        removingIds={removingIds}
        jumpHighlightId={jumpHighlightId}
        seenCaption={seenCaption}
        onOpenThread={onOpenThread}
        onToggleReaction={(id, emoji) => {
          void toggleReaction(id, emoji);
        }}
        onJumpTo={handleJumpTo}
        onSaveLater={handleSaveLater}
        onShare={handleShare}
        onEdit={handleEdit}
        onRequestDelete={handleRequestDelete}
        onTogglePin={handleTogglePin}
        onCopyLink={handleCopyLink}
        onMarkUnread={handleMarkUnread}
        onOpenForwardSource={onOpenForwardSource}
      />
      </>
      )}
      {activeTab === 'messages' && typingUsers.length > 0 && (
        <div
          aria-live="polite"
          style={{
            padding: 'var(--ds-space-025) var(--ds-space-250) 0',
            font: 'var(--ds-font-body-small)',
            fontStyle: 'italic',
            color: 'var(--cv2-text-muted)',
          }}
        >
          {typingUsers.length === 1
            ? `${typingUsers[0]} is typing…`
            : typingUsers.length === 2
              ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
              : 'Several people are typing…'}
        </div>
      )}
      {activeTab === 'messages' && (
      <Composer
        key={composerKey}
        placeholder={placeholder}
        conversationId={conversation.id}
        slashActions={[
          {
            id: 'huddle',
            kind: 'action',
            label: '/huddle',
            hint: 'Start an audio huddle in this conversation',
            run: onStartHuddle,
          },
        ]}
        attachments={staged.attachments}
        onAttachFiles={files => staged.addFiles(files)}
        onRemoveAttachment={id => staged.removeAttachment(id)}
        isUploading={staged.isUploading}
        initialDraft={initialComposerBody}
        onDraftChange={
          inScheduledEdit
            ? undefined
            : value => {
                draftState.setDraft(value);
                if (value) notifyTyping();
              }
        }
        bannerAttached={inScheduledEdit || !!scheduledForThisConv}
        notificationBanner={
          inScheduledEdit ? (
            <ScheduledEditBanner
              scheduledFor={editScheduledMessage!.scheduledFor}
              onSeeAll={() => onSeeAllScheduled?.()}
            />
          ) : scheduledForThisConv ? (
            <ComposerScheduledBanner
              count={scheduledForThisConv.count}
              nextSendAt={scheduledForThisConv.nextSendAt}
              onSeeAll={() => onSeeAllScheduled?.()}
            />
          ) : undefined
        }
        onSend={text => {
          if (inScheduledEdit) {
            void handleScheduledUpdate(text);
          } else {
            void handleSend(text);
          }
        }}
        onScheduleSend={(text, whenIso) => {
          if (inScheduledEdit) {
            void handleScheduledUpdate(text, whenIso);
          } else {
            void handleSend(text, whenIso);
          }
        }}
      />
      )}
      {isDragging && (
        <DropzoneOverlay
          workspaceTitle={conversation.title}
          recipientName={conversation.title}
        />
      )}
      {forwardMessage && (
        <ForwardModal
          message={forwardMessage}
          onClose={() => setForwardMessage(null)}
          onForward={(recipients, comment, whenIso) => {
            void handleForwardSubmit(recipients, comment, whenIso);
          }}
        />
      )}
      {pendingDelete && (
        <DeleteMessageDialog
          message={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </section>
  );
}
