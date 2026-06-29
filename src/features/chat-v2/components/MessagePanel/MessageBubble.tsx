import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { ReactionStrip } from './ReactionStrip';
import { ThreadReplyMeta } from './ThreadReplyMeta';
import { MessageHoverActions } from './MessageHoverActions';
import { MessageMoreMenu } from './MessageMoreMenu';
import { ReminderModal } from '../Activity/ReminderModal';
import { MessageEditInPlace } from './MessageEditInPlace';
import { SavedForLaterBadge } from './SavedForLaterBadge';
import { PinnedIndicator } from './PinnedIndicator';
import { ScheduledBadge } from './ScheduledBadge';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';
import { AttachmentList } from '../Attachments/AttachmentList';
import { LinkPreviewList } from '../LinkPreviews/LinkPreviewList';
import { formatMessageTime, formatMessageTimeShort } from '../../lib/formatTimestamp';
import { renderMarkdownInline } from '../../lib/markdown';
import { useAuth } from '@/hooks/useAuth';
import { extractUrls, useLinkPreviews } from '@/hooks/chat/useLinkPreview';
import type { ChatMessage } from '@/types/chat';
import type { ChatAttachment } from '@/hooks/chat/useChatAttachments';

interface MessageBubbleProps {
  message: ChatMessage;
  /** When true, render avatar + author + timestamp header. When false, only body (intra-group). */
  showHeader: boolean;
  isSaved?: boolean;
  isPinned?: boolean;
  pinnedByName?: string | null;
  pinnedByMe?: boolean;
  attachments?: ChatAttachment[];
  removing?: boolean;
  jumpHighlight?: boolean;
  /** Suppress the "N replies — Last reply X ago" footer (used when this
   *  bubble is the parent message inside a thread pane — the reply meta
   *  is redundant once the thread is open). */
  hideThreadMeta?: boolean;
  onOpenThread: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onSaveLater?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
  onEdit?: (messageId: string, markdown: string) => void;
  onRequestDelete?: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
  onCopyLink?: (messageId: string) => void;
  onMarkUnread?: (messageId: string) => void;
  /** When the body is a forward card, called on "View message" click. */
  onOpenForwardSource?: (conversationId: string, messageId: string) => void;
}

export function MessageBubble({
  message,
  showHeader,
  isSaved,
  isPinned,
  pinnedByName,
  pinnedByMe,
  attachments,
  removing,
  jumpHighlight,
  hideThreadMeta,
  onOpenThread,
  onToggleReaction,
  onSaveLater,
  onShare,
  onEdit,
  onRequestDelete,
  onTogglePin,
  onCopyLink,
  onMarkUnread,
  onOpenForwardSource,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  useEffect(() => {
    if (!reminderToast) return;
    const t = setTimeout(() => setReminderToast(null), 3200);
    return () => clearTimeout(t);
  }, [reminderToast]);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);
  const moreAnchorRef = useRef<HTMLDivElement>(null);

  const canEditOrDelete = user?.id === message.authorId;
  const isPendingScheduled =
    !!message.scheduledFor &&
    !message.deliveredAt &&
    user?.id === message.authorId;
  const forwardInfo = useMemo(() => {
    const adf = message.bodyAdf as Record<string, unknown> | null;
    if (!adf || typeof adf !== 'object') return null;
    if ((adf as { type?: unknown }).type !== 'forward') return null;
    const f = adf as {
      sourceMessageId?: string;
      sourceConversationId?: string;
      sourceConversationTitle?: string;
      sourceConversationIsPrivate?: boolean;
      sourceConversationKind?: string;
      sourceAuthorId?: string;
      sourceAuthorName?: string;
      sourceAuthorAvatarUrl?: string | null;
      sourceBodyText?: string;
      sourceCreatedAt?: string;
      comment?: string | null;
    };
    if (!f.sourceMessageId || !f.sourceConversationId) return null;
    return f;
  }, [message.bodyAdf]);
  const urls = useMemo(() => extractUrls(message.bodyText), [message.bodyText]);
  const { data: linkPreviews } = useLinkPreviews(urls);
  const selfToken = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = typeof meta.full_name === 'string' ? meta.full_name : '';
    return fullName.replace(/\s+/g, '');
  }, [user?.user_metadata]);

  const handlePickEmoji = (emoji: string) => {
    onToggleReaction(message.id, emoji);
    setPickerOpen(false);
  };

  const handleSaveEdit = (markdown: string) => {
    onEdit?.(message.id, markdown);
    setEditing(false);
  };

  const className = [
    jumpHighlight ? 'cv2-msg-jump-highlight' : '',
    removing ? 'cv2-msg-removing' : '',
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div
      data-message-id={message.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '44px 1fr',
        columnGap: 8,
        padding: '0px var(--cv2-page-pad-x, 20px) var(--ds-space-050) 16px',
        marginTop: showHeader ? 'var(--cv2-group-gap, 16px)' : 'var(--cv2-intra-gap, 2px)',
        background: isPinned
          ? 'rgba(236, 178, 46, 0.08)' // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
          : isSaved
            ? 'var(--cv2-saved-bg)'
            : hovered
              ? 'var(--cv2-bg-row-hover)'
              : 'transparent',
        borderLeft: isSaved ? '3px solid var(--cv2-warning)' : '3px solid transparent',
        transition: 'background var(--cv2-transition-fast)',
      }}
    >
      <div
        ref={pickerAnchorRef}
        style={{
          paddingTop: showHeader ? 2 : 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
        }}
      >
        {showHeader ? (
          <PresenceAvatar name={message.authorName} size={36} />
        ) : (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--cv2-font)',
              font: 'var(--ds-font-body-small)',
              lineHeight: '20px',
              color: 'var(--cv2-text-muted)',
              opacity: hovered ? 1 : 0,
              whiteSpace: 'nowrap',
              paddingRight: 4,
              transition: 'opacity var(--cv2-transition-fast)',
            }}
          >
            {formatMessageTimeShort(message.createdAt)}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        {isPinned && <PinnedIndicator byMe={pinnedByMe} byName={pinnedByName} />}
        {isSaved && <SavedForLaterBadge />}
        {showHeader && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--cv2-font)',
                fontSize: 'var(--cv2-fs-msg-name)',
                fontWeight: 700,
                color: 'var(--cv2-text-strong)',
              }}
            >
              {message.authorName}
            </span>
            <span
              style={{
                fontFamily: 'var(--cv2-font)',
                fontSize: 'var(--cv2-fs-msg-time)',
                color: 'var(--cv2-text-muted)',
              }}
            >
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        )}
        {editing ? (
          <MessageEditInPlace
            initialMarkdown={message.bodyText}
            onCancel={() => setEditing(false)}
            onSave={handleSaveEdit}
          />
        ) : forwardInfo ? (
          <ForwardCard
            info={forwardInfo}
            onViewMessage={() => {
              if (forwardInfo.sourceConversationId && forwardInfo.sourceMessageId) {
                onOpenForwardSource?.(forwardInfo.sourceConversationId, forwardInfo.sourceMessageId);
              }
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: 'var(--cv2-font)',
              fontSize: 'var(--cv2-fs-msg-body)',
              fontWeight: 400,
              lineHeight: 'var(--cv2-lh-msg-body)',
              color: 'var(--cv2-text)',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownInline(message.bodyText, selfToken) }}
          />
        )}
        {message.editedAt && !editing && (
          <span style={{ font: 'var(--ds-font-body-small)', color: 'var(--cv2-text-muted)', marginLeft: 4 }}>
            (edited)
          </span>
        )}
        {attachments && attachments.length > 0 && <AttachmentList attachments={attachments} />}
        {linkPreviews && linkPreviews.length > 0 && <LinkPreviewList previews={linkPreviews} />}
        {isPendingScheduled && message.scheduledFor && (
          <ScheduledBadge scheduledFor={message.scheduledFor} />
        )}
        <ReactionStrip
          reactions={message.reactions}
          onToggle={e => onToggleReaction(message.id, e)}
          onAddReaction={() => setPickerOpen(true)}
        />
        {!hideThreadMeta && message.replyCount > 0 && (
          <ThreadReplyMeta
            replyCount={message.replyCount}
            lastReplyIso={message.lastReplyAt}
            onOpen={() => onOpenThread(message.id)}
          />
        )}
      </div>
      <MessageHoverActions
        toolbarRef={moreAnchorRef as React.Ref<HTMLDivElement>}
        visible={(hovered || moreOpen) && !pickerOpen && !editing}
        isSaved={isSaved}
        onComplete={() => onToggleReaction(message.id, '✅')}
        onMarkSeen={() => onToggleReaction(message.id, '👀')}
        onCelebrate={() => onToggleReaction(message.id, '🙌')}
        onAddReaction={() => setPickerOpen(true)}
        onReply={() => onOpenThread(message.id)}
        onShare={onShare ? () => onShare(message.id) : undefined}
        onSaveLater={onSaveLater ? () => onSaveLater(message.id) : undefined}
        onMore={() => setMoreOpen(true)}
      />
      {pickerOpen && (
        <EmojiPicker
          anchor="bubble"
          onPick={handlePickEmoji}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {moreOpen && (
        <MessageMoreMenu
          anchorRect={moreAnchorRef.current?.getBoundingClientRect() ?? null}
          canEdit={canEditOrDelete && !!onEdit}
          canDelete={canEditOrDelete && !!onRequestDelete}
          isPinned={!!isPinned}
          onEdit={() => setEditing(true)}
          onMarkUnread={() => onMarkUnread?.(message.id)}
          onRemindMe={() => setReminderOpen(true)}
          onCopyLink={() => onCopyLink?.(message.id)}
          onCopyMessage={() => { void navigator.clipboard?.writeText(message.bodyText); }}
          onTogglePin={() => onTogglePin?.(message.id)}
          onAddToList={() => { /* TODO */ }}
          onDelete={() => onRequestDelete?.(message.id)}
          onClose={() => setMoreOpen(false)}
        />
      )}
      {reminderOpen && (
        <ReminderModal
          attachedMessageText={message.bodyText}
          onCancel={() => setReminderOpen(false)}
          onSave={iso => {
            const at = new Date(iso);
            setReminderToast(
              `Reminder set for ${at.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
            );
            setReminderOpen(false);
          }}
        />
      )}
      {reminderToast && createPortal(
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--cv2-bg-modal)',
            color: 'var(--cv2-text)',
            border: '1px solid var(--cv2-border-strong)',
            borderRadius: 'var(--cv2-radius-md)',
            boxShadow: 'var(--cv2-shadow-modal)',
            padding: '8px 16px',
            fontFamily: 'var(--cv2-font)',
            font: 'var(--ds-font-body)',
            zIndex: 'var(--cv2-modal-z, 1000)' as unknown as number,
          }}
        >
          {reminderToast}
        </div>,
        document.body,
      )}
    </div>
  );
}

interface ForwardInfo {
  sourceMessageId?: string;
  sourceConversationId?: string;
  sourceConversationTitle?: string;
  sourceConversationIsPrivate?: boolean;
  sourceConversationKind?: string;
  sourceAuthorId?: string;
  sourceAuthorName?: string;
  sourceAuthorAvatarUrl?: string | null;
  sourceBodyText?: string;
  sourceCreatedAt?: string;
  comment?: string | null;
}

function ForwardCard({ info, onViewMessage }: { info: ForwardInfo; onViewMessage: () => void }) {
  const title = info.sourceConversationTitle ?? 'channel';
  const isDm = info.sourceConversationKind === 'dm' || info.sourceConversationKind === 'group_dm';
  const isPrivate = !!info.sourceConversationIsPrivate;
  const prefix = isDm ? '@' : isPrivate ? '🔒 ' : '# ';
  const created = info.sourceCreatedAt ? formatMessageTime(info.sourceCreatedAt) : '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {info.comment && (
        <div
          style={{
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--cv2-fs-msg-body)',
            color: 'var(--cv2-text)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {info.comment}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          borderLeft: '3px solid var(--cv2-border-strong)',
          background: 'transparent',
        }}
      >
        <PresenceAvatar name={info.sourceAuthorName ?? 'Someone'} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: 'var(--ds-font-body-small)', fontWeight: 700, color: 'var(--cv2-text-strong)' }}>
            {info.sourceAuthorName ?? 'Someone'}
          </div>
          {info.sourceBodyText && (
            <div
              style={{
                marginTop: 0,
                font: 'var(--ds-font-body-small)',
                color: 'var(--cv2-text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {info.sourceBodyText}
            </div>
          )}
          <div
            style={{
              marginTop: 4,
              font: 'var(--ds-font-body-small)',
              color: 'var(--cv2-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexWrap: 'wrap',
            }}
          >
            <span>Posted in</span>
            <span style={{ color: 'var(--cv2-text)', fontWeight: 600 }}>{prefix}{title}</span>
            {created && (
              <>
                <span aria-hidden="true">|</span>
                <span>{created}</span>
              </>
            )}
            <span aria-hidden="true">|</span>
            <button
              type="button"
              onClick={onViewMessage}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--cv2-accent)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                font: 'var(--ds-font-body-small)',
                fontWeight: 600,
              }}
            >
              View message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

