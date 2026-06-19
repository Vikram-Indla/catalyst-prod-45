import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { ActionTooltip } from '../shared/ActionTooltip';
import { MessageMoreMenu } from './MessageMoreMenu';
import { EmojiPicker } from '../EmojiPicker/EmojiPicker';
import { ReminderModal } from '../Activity/ReminderModal';
import {
  BookmarkFilledIcon,
  BookmarkIcon,
  ForwardArrowIcon,
  MessageReplyIcon,
  MoreDotsIcon,
  SmileyIcon,
} from '../shared/Icon';
import { formatMessageTime } from '../../lib/formatTimestamp';
import { renderMarkdownInline } from '../../lib/markdown';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage } from '@/types/chat';

interface PinsPanelProps {
  pinnedMessages: ChatMessage[];
  savedIds?: Set<string>;
  onOpenMessage: (messageId: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
  onSaveLater?: (messageId: string) => void;
  onCopyLink?: (messageId: string) => void;
  onMarkUnread?: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
  onEdit?: (messageId: string, markdown: string) => void;
  onRequestDelete?: (messageId: string) => void;
}

export function PinsPanel({
  pinnedMessages,
  savedIds,
  onOpenMessage,
  onAddReaction,
  onReply,
  onShare,
  onSaveLater,
  onCopyLink,
  onMarkUnread,
  onTogglePin,
  onEdit,
  onRequestDelete,
}: PinsPanelProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        background: 'var(--cv2-bg-panel)',
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--cv2-text-muted)',
          marginBottom: 12,
        }}
      >
        Pinned messages
      </div>
      {pinnedMessages.length === 0 ? (
        <div
          style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: 'var(--cv2-text-muted)',
            fontSize: 13,
          }}
        >
          No pinned messages in this conversation yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pinnedMessages.map(m => (
            <PinnedCard
              key={m.id}
              message={m}
              isSaved={savedIds?.has(m.id)}
              onOpen={() => onOpenMessage(m.id)}
              onAddReaction={onAddReaction}
              onReply={onReply}
              onShare={onShare}
              onSaveLater={onSaveLater}
              onCopyLink={onCopyLink}
              onMarkUnread={onMarkUnread}
              onTogglePin={onTogglePin}
              onEdit={onEdit}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PinnedCardProps {
  message: ChatMessage;
  isSaved?: boolean;
  onOpen: () => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
  onSaveLater?: (messageId: string) => void;
  onCopyLink?: (messageId: string) => void;
  onMarkUnread?: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
  onEdit?: (messageId: string, markdown: string) => void;
  onRequestDelete?: (messageId: string) => void;
}

function PinnedCard({
  message,
  isSaved,
  onOpen,
  onAddReaction,
  onReply,
  onShare,
  onSaveLater,
  onCopyLink,
  onMarkUnread,
  onTogglePin,
  onEdit,
  onRequestDelete,
}: PinnedCardProps) {
  const { user } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const reactBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!reminderToast) return;
    const t = setTimeout(() => setReminderToast(null), 3200);
    return () => clearTimeout(t);
  }, [reminderToast]);

  const canEditOrDelete = user?.id === message.authorId;

  const handleCardClick = (e: React.MouseEvent) => {
    if (pickerOpen || moreOpen) return;
    if ((e.target as HTMLElement).closest('[data-cv2-pin-actions]')) return;
    onOpen();
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        background: 'var(--cv2-bg-row-hover)',
        border: hovered || moreOpen || pickerOpen
          ? '1px solid var(--cv2-accent)'
          : '1px solid var(--cv2-border)',
        borderRadius: 'var(--cv2-radius-md)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        transition: 'border-color var(--cv2-transition-fast)',
      }}
    >
      <PresenceAvatar name={message.authorName} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cv2-text-strong)' }}>
            {message.authorName}
          </span>
          <span style={{ fontSize: 12, color: 'var(--cv2-text-muted)' }}>
            {formatMessageTime(message.createdAt)}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 14,
            color: 'var(--cv2-text)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.45,
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdownInline(message.bodyText) }}
        />
      </div>

      {(hovered || moreOpen || pickerOpen) && (
        <div
          data-cv2-pin-actions
          role="toolbar"
          aria-label="Pinned message actions"
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0,
            height: 32,
            padding: '0 4px',
            background: 'var(--cv2-bg-toolbar)',
            border: '1px solid var(--cv2-border-strong)',
            borderRadius: 8,
            boxShadow: 'var(--cv2-shadow-toolbar)',
          }}
        >
          <PinActionBtn
            ref={reactBtnRef}
            label="Find another reaction"
            shortcut="R"
            onClick={() => setPickerOpen(true)}
          >
            <SmileyIcon size={16} />
          </PinActionBtn>
          <PinActionBtn
            label="Reply in thread"
            shortcut="T"
            onClick={() => onReply?.(message.id)}
          >
            <MessageReplyIcon size={16} />
          </PinActionBtn>
          <PinActionBtn
            label="Forward message"
            shortcut="F"
            onClick={() => onShare?.(message.id)}
          >
            <ForwardArrowIcon size={16} />
          </PinActionBtn>
          <PinActionBtn
            label={isSaved ? 'Remove from saved' : 'Save for later'}
            shortcut="A"
            highlight={isSaved}
            onClick={() => onSaveLater?.(message.id)}
          >
            {isSaved
              ? <BookmarkFilledIcon size={16} style={{ color: 'var(--cv2-saved-fg)' }} />
              : <BookmarkIcon size={16} />}
          </PinActionBtn>
          <PinActionBtn
            ref={moreBtnRef}
            label="More actions"
            onClick={() => setMoreOpen(true)}
          >
            <MoreDotsIcon size={16} />
          </PinActionBtn>
        </div>
      )}

      {pickerOpen && (
        <EmojiPicker
          anchor="bubble"
          anchorRect={reactBtnRef.current?.getBoundingClientRect() ?? null}
          onPick={emoji => {
            onAddReaction?.(message.id, emoji);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {moreOpen && (
        <MessageMoreMenu
          anchorRect={moreBtnRef.current?.getBoundingClientRect() ?? null}
          canEdit={canEditOrDelete && !!onEdit}
          canDelete={canEditOrDelete && !!onRequestDelete}
          isPinned={true}
          onEdit={() => { /* TODO: inline edit not yet supported in pins view */ }}
          onMarkUnread={() => onMarkUnread?.(message.id)}
          onRemindMe={() => setReminderOpen(true)}
          onCopyLink={() => onCopyLink?.(message.id)}
          onCopyMessage={() => { void navigator.clipboard?.writeText(message.bodyText); }}
          onTogglePin={() => onTogglePin?.(message.id)}
          onAddToList={() => {}}
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
            padding: '10px 16px',
            fontFamily: 'var(--cv2-font)',
            fontSize: 14,
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

const PinActionBtn = React.forwardRef<HTMLButtonElement, {
  label: string;
  shortcut?: string;
  highlight?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>(function PinActionBtn({ label, shortcut, highlight, onClick, children }, ref) {
  const localRef = useRef<HTMLButtonElement>(null);
  const buttonRef = (ref as React.MutableRefObject<HTMLButtonElement | null>) ?? localRef;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={e => { e.stopPropagation(); onClick(); }}
        aria-label={label}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          if (!highlight) (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-strong)';
          setTooltipVisible(true);
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = highlight
            ? 'var(--cv2-saved-fg)'
            : 'var(--cv2-text-subtle)';
          setTooltipVisible(false);
        }}
        style={{
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: highlight ? 'var(--cv2-saved-fg)' : 'var(--cv2-text-subtle)',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'background var(--cv2-transition-fast), color var(--cv2-transition-fast)',
        }}
      >
        {children}
      </button>
      <ActionTooltip
        anchorEl={buttonRef.current}
        label={label}
        shortcut={shortcut}
        visible={tooltipVisible}
      />
    </>
  );
});
