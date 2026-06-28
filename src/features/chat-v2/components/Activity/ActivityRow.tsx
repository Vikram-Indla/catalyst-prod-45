import React, { useMemo, useRef } from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { DmsIcon, MentionIcon, ReplyArrowIcon, ThreadInIcon } from '../shared/Icon';
import { formatActivityTime } from '../../lib/formatTimestamp';
import { ActivityHoverStrip } from './ActivityHoverStrip';
import type { ActivityItem } from '../../hooks/useActivityFeed';
import { useAuth } from '@/hooks/useAuth';
import { renderMarkdownInline } from '../../lib/markdown';

/** Body text → HTML with @mention pills + markdown styling (same as chat). */
function bodyHtml(item: ActivityItem, selfToken: string): string {
  const text = item.body || (item.kind === 'thread' ? 'Untitled' : '');
  if (!text) return '';
  return renderMarkdownInline(text, selfToken);
}

interface ActivityRowProps {
  item: ActivityItem;
  variant: 'detailed' | 'dense';
  /** Container width — used to switch the detailed row into single-line mode at ≥760px. */
  panelWidth: number;
  isSelected: boolean;
  /** When true, this row's three-dot menu is open — keep the action strip visible. */
  isMenuOpen?: boolean;
  /** Dense variant uses this to suppress the bottom divider on the last row of its group container. */
  isLastInGroup?: boolean;
  /** Show a checkbox to the left of the row (selection mode is active). */
  showCheckbox?: boolean;
  isChecked?: boolean;
  onToggleChecked?: () => void;
  onSelect: () => void;
  onOpenThread: () => void;
  onJumpToSource: () => void;
  onMarkUnread: () => void;
  onMarkRead: () => void;
  onMore: (anchor: DOMRect) => void;
}

const SINGLE_LINE_BREAKPOINT = 760;

export function ActivityRow({
  item,
  variant,
  panelWidth,
  isSelected,
  isMenuOpen = false,
  isLastInGroup = false,
  showCheckbox = false,
  isChecked = false,
  onToggleChecked,
  onSelect,
  onOpenThread,
  onJumpToSource,
  onMarkUnread,
  onMarkRead,
  onMore,
}: ActivityRowProps) {
  const subline = sublineFor(item);
  const isThread = item.kind === 'thread';
  const useSingleLine = variant === 'detailed' && panelWidth >= SINGLE_LINE_BREAKPOINT;
  const { user } = useAuth();
  const selfToken = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = typeof meta.full_name === 'string' ? meta.full_name : '';
    return fullName.replace(/\s+/g, '');
  }, [user?.user_metadata]);
  // Hover swap is now CSS-driven via .cv2-activity-row:hover (see tokens.css)
  // so it keeps working after route navigation without a JS state probe.
  // The data-cv2-force-actions attribute pins the strip visible while the
  // (portaled) more-menu is open.
  const rowRef = useRef<HTMLDivElement>(null);

  // Detect a click on the thread sub-line so we can route to thread, not jump.
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-cv2-activity-thread-link]')) {
      onOpenThread();
      onSelect();
      return;
    }
    onSelect();
    if (isThread) onOpenThread();
    else onJumpToSource();
  };

  const innerRow = (() => {
    if (variant === 'dense') {
      return (
        <DenseRow
          item={item}
          isSelected={isSelected}
          isLastInGroup={isLastInGroup}
          isMenuOpen={isMenuOpen}
          rowRef={rowRef}
          onClick={handleClick}
          onMarkUnread={onMarkUnread}
          onMarkRead={onMarkRead}
          onMore={onMore}
          selfToken={selfToken}
        />
      );
    }
    if (useSingleLine) {
      return (
        <SingleLineRow
          item={item}
          isSelected={isSelected}
          isMenuOpen={isMenuOpen}
          rowRef={rowRef}
          onClick={handleClick}
          onMarkUnread={onMarkUnread}
          onMarkRead={onMarkRead}
          onMore={onMore}
          selfToken={selfToken}
        />
      );
    }
    return null;
  })();

  if (innerRow) {
    if (!showCheckbox) return innerRow;
    return (
      <RowWithCheckbox isChecked={isChecked} onToggle={onToggleChecked}>
        {innerRow}
      </RowWithCheckbox>
    );
  }

  const detailedRow = (
    <div
      ref={rowRef}
      className="cv2-activity-row"
      data-cv2-force-actions={isMenuOpen ? 'true' : undefined}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        padding: '12px 14px',
        borderRadius: 8,
        background: 'transparent',
        border: isSelected ? '1px solid var(--ds-background-discovery-bold, #7C3AED)' : '1px solid var(--cv2-border)',
        boxShadow: isSelected ? '0 4px 14px var(--ds-background-discovery-bold, rgba(124, 58, 237, 0.28))' : 'none',
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <PresenceAvatar
          name={item.authorName}
          size={32}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
              minHeight: 28,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--cv2-font)',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 700,
                color: 'var(--cv2-text-strong)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
              }}
            >
              {item.authorName}
            </span>
            <RightInfo
              item={item}
              onMarkUnread={onMarkUnread}
              onMarkRead={onMarkRead}
              onMore={onMore}
            />
          </div>
          <div
            data-cv2-activity-thread-link={isThread ? 'true' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 2,
              fontFamily: 'var(--cv2-font)',
              fontSize: 'var(--ds-font-size-200)',
              color: 'var(--cv2-text-subtle)',
              cursor: isThread ? 'pointer' : 'default',
            }}
          >
            {subline.icon}
            <span style={{ fontWeight: 600 }}>{subline.text}</span>
          </div>
          <p
            style={{
              margin: '6px 0 0',
              fontFamily: 'var(--cv2-font)',
              fontSize: 'var(--ds-font-size-400)',
              color: 'var(--cv2-text)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml(item, selfToken) }}
          />
        </div>
      </div>
    </div>
  );

  if (!showCheckbox) return detailedRow;
  return (
    <RowWithCheckbox isChecked={isChecked} onToggle={onToggleChecked}>
      {detailedRow}
    </RowWithCheckbox>
  );
}

function RowWithCheckbox({
  isChecked,
  onToggle,
  children,
}: {
  isChecked: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        aria-label={isChecked ? 'Deselect' : 'Select'}
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        style={{
          flex: '0 0 auto',
          width: 24,
          height: 24,
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: isChecked ? 'var(--cv2-accent, #1264A3)' : 'var(--cv2-text-subtle)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {isChecked ? (
          <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
            <rect x="1" y="1" width="16" height="16" rx="2" fill="currentColor" />
            <path d="M4.6 9.1l3 3 5.4-5.6" fill="none" stroke="var(--ds-surface, #FFFFFF)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
            <rect x="1" y="1" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        )}
      </button>
      {children}
    </div>
  );
}

function DenseRow({
  item,
  isSelected,
  isLastInGroup,
  isMenuOpen,
  rowRef,
  onClick,
  onMarkUnread,
  onMarkRead,
  onMore,
  selfToken,
}: {
  item: ActivityItem;
  isSelected: boolean;
  isLastInGroup: boolean;
  isMenuOpen: boolean;
  rowRef: React.RefObject<HTMLDivElement>;
  onClick: (e: React.MouseEvent) => void;
  onMarkUnread: () => void;
  onMarkRead: () => void;
  onMore: (anchor: DOMRect) => void;
  selfToken: string;
}) {
  const isThread = item.kind === 'thread';
  return (
    <div
      ref={rowRef}
      className="cv2-activity-row"
      data-cv2-force-actions={isMenuOpen ? 'true' : undefined}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        position: 'relative',
        padding: '12px 16px',
        margin: isSelected ? '0 2px' : 0,
        background: 'transparent',
        // Selection cue: purple outline + soft shadow. No background change so
        // layout doesn't shift (preserves hover hit-testing on the row).
        border: isSelected ? '1px solid var(--ds-background-discovery-bold, #7C3AED)' : '1px solid transparent',
        // Divider lives on the row itself so the wrapping group container can
        // be borderless inside. Declared AFTER `border` so the shorthand does
        // not stomp it back to transparent.
        borderBottom: isSelected
          ? '1px solid var(--ds-background-discovery-bold, #7C3AED)'
          : (isLastInGroup ? '1px solid transparent' : '1px solid var(--cv2-border)'),
        borderRadius: isSelected ? 8 : 0,
        boxShadow: isSelected ? '0 4px 14px var(--ds-background-discovery-bold, rgba(124, 58, 237, 0.28))' : 'none',
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <PresenceAvatar
          name={item.authorName}
          size={28}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {isThread ? (
              <span
                data-cv2-activity-thread-link="true"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--cv2-text-subtle)' }}
              >
                <ThreadInIcon size={12} />
                <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>
                  Thread in {item.conversationTitle}
                </span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--cv2-text-subtle)' }}>
                <DmsIcon size={12} />
                <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>
                  {item.conversationKind === 'dm' || item.conversationKind === 'group_dm' ? 'DM' : item.conversationTitle}
                </span>
              </span>
            )}
            <span style={{ flex: 1 }} />
            <RightInfo
              item={item}
              onMarkUnread={onMarkUnread}
              onMarkRead={onMarkRead}
              onMore={onMore}
            />
          </div>
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: 'var(--cv2-font)',
              fontSize: 'var(--ds-font-size-300)',
              color: 'var(--cv2-text)',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml(item, selfToken) }}
          />
        </div>
      </div>
    </div>
  );
}

function SingleLineRow({
  item,
  isSelected,
  isMenuOpen,
  rowRef,
  onClick,
  onMarkUnread,
  onMarkRead,
  onMore,
  selfToken,
}: {
  item: ActivityItem;
  isSelected: boolean;
  isMenuOpen: boolean;
  rowRef: React.RefObject<HTMLDivElement>;
  onClick: (e: React.MouseEvent) => void;
  onMarkUnread: () => void;
  onMarkRead: () => void;
  onMore: (anchor: DOMRect) => void;
  selfToken: string;
}) {
  const isThread = item.kind === 'thread';
  return (
    <div
      ref={rowRef}
      className="cv2-activity-row"
      data-cv2-force-actions={isMenuOpen ? 'true' : undefined}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        position: 'relative',
        padding: '14px 18px',
        borderRadius: 8,
        background: 'transparent',
        border: isSelected ? '1px solid var(--ds-background-discovery-bold, #7C3AED)' : '1px solid var(--cv2-border)',
        boxShadow: isSelected ? '0 4px 14px var(--ds-background-discovery-bold, rgba(124, 58, 237, 0.28))' : 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minWidth: 0,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <PresenceAvatar
        name={item.authorName}
        size={32}
      />
      <span
        style={{
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 700,
          color: 'var(--cv2-text-strong)',
          whiteSpace: 'nowrap',
          flex: '0 0 auto',
          maxWidth: 220,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.authorName}
      </span>
      <span
        data-cv2-activity-thread-link={isThread ? 'true' : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--ds-font-size-300)',
          color: 'var(--cv2-text-subtle)',
          fontWeight: 600,
          flex: '0 0 auto',
          maxWidth: 260,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {isThread ? <ThreadInIcon size={13} /> : <DmsIcon size={13} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isThread
            ? `Thread in ${item.conversationKind === 'dm' || item.conversationKind === 'group_dm' ? 'DM' : item.conversationTitle}`
            : item.conversationKind === 'dm' || item.conversationKind === 'group_dm'
              ? 'DM'
              : item.conversationTitle}
        </span>
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--ds-font-size-400)',
          color: 'var(--cv2-text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        dangerouslySetInnerHTML={{ __html: bodyHtml(item, selfToken) }}
      />
      <RightInfo
        item={item}
        onMarkUnread={onMarkUnread}
        onMarkRead={onMarkRead}
        onMore={onMore}
      />
    </div>
  );
}

function RightInfo({
  item,
  onMarkUnread,
  onMarkRead,
  onMore,
}: {
  item: ActivityItem;
  onMarkUnread: () => void;
  onMarkRead: () => void;
  onMore: (anchor: DOMRect) => void;
}) {
  // Both slots render unconditionally; tokens.css swaps them on :hover (and
  // when data-cv2-force-actions="true" is set on the row). This keeps row
  // height fixed and removes the "hover stops working after route nav" bug.
  return (
    <span
      className="cv2-right-info"
      style={{
        fontFamily: 'var(--cv2-font)',
        fontSize: 'var(--ds-font-size-200)',
        color: 'var(--cv2-text-muted)',
        whiteSpace: 'nowrap',
      }}
    >
      <span className="cv2-right-info-time">
        {formatActivityTime(item.createdAt)}
        {item.isReply && (
          <span aria-label="Reply" style={{ display: 'inline-flex' }}>
            <ReplyArrowIcon size={12} />
          </span>
        )}
      </span>
      <span className="cv2-right-info-strip">
        <ActivityHoverStrip
          onMarkUnread={onMarkUnread}
          onMarkRead={onMarkRead}
          onMore={onMore}
        />
      </span>
      {item.isUnread && (
        <span
          aria-label="Unread"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            padding: '0 6px',
            borderRadius: 9,
            background: 'var(--cv2-unread)',
            color: 'var(--cv2-unread-text, #FFFFFF)',
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 700,
          }}
        >
          1
        </span>
      )}
    </span>
  );
}

function sublineFor(item: ActivityItem): { icon: React.ReactNode; text: string } {
  switch (item.kind) {
    case 'thread':
      return {
        icon: <ThreadInIcon size={12} />,
        text: `Thread in ${item.conversationKind === 'dm' || item.conversationKind === 'group_dm' ? 'DM' : item.conversationTitle}: ${item.conversationTitle}`,
      };
    case 'mention':
      return {
        icon: <MentionIcon size={12} />,
        text: `Mention in ${item.conversationTitle}`,
      };
    case 'dm':
    default:
      return {
        icon: <DmsIcon size={12} />,
        text:
          item.conversationKind === 'dm' || item.conversationKind === 'group_dm'
            ? 'DM'
            : item.conversationTitle,
      };
  }
}
