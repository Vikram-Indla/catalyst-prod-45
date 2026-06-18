import React, { useRef, useState } from 'react';
import { ActionTooltip } from '../shared/ActionTooltip';
import {
  BookmarkFilledIcon,
  BookmarkIcon,
  CheckBoxCheckIcon,
  ForwardArrowIcon,
  MessageReplyIcon,
  MoreDotsIcon,
  SmileyIcon,
} from '../shared/Icon';

interface MessageHoverActionsProps {
  visible: boolean;
  isSaved?: boolean;
  toolbarRef?: React.Ref<HTMLDivElement>;
  onComplete?: () => void;
  onMarkSeen?: () => void;
  onCelebrate?: () => void;
  onAddReaction?: () => void;
  onReply: () => void;
  onShare?: () => void;
  onSaveLater?: () => void;
  onMore?: () => void;
}

interface ActionDef {
  key: string;
  label: string;
  shortcut?: string;
  emoji?: string;
  icon?: React.ReactNode;
  customNode?: React.ReactNode;
  highlight?: boolean;
  handler?: () => void;
}

export function MessageHoverActions({
  visible,
  isSaved,
  toolbarRef,
  onComplete,
  onMarkSeen,
  onCelebrate,
  onAddReaction,
  onReply,
  onShare,
  onSaveLater,
  onMore,
}: MessageHoverActionsProps) {
  const actions: ActionDef[] = [
    { key: 'complete', label: 'Mark complete', customNode: <CheckBoxCheckIcon size={16} />, handler: onComplete },
    { key: 'seen', label: 'Mark as seen', emoji: '👀', handler: onMarkSeen },
    { key: 'celebrate', label: 'Celebrate', emoji: '🙌', handler: onCelebrate },
    { key: 'react', label: 'Find another reaction', shortcut: 'R', icon: <SmileyIcon size={16} />, handler: onAddReaction },
    { key: 'reply', label: 'Reply in thread', shortcut: 'T', icon: <MessageReplyIcon size={16} />, handler: onReply },
    { key: 'share', label: 'Forward message', shortcut: 'F', icon: <ForwardArrowIcon size={16} />, handler: onShare },
    {
      key: 'later',
      label: isSaved ? 'Remove from saved' : 'Save for later',
      shortcut: 'A',
      customNode: isSaved
        ? <BookmarkFilledIcon size={16} style={{ color: 'var(--cv2-saved-fg)' }} />
        : <BookmarkIcon size={16} />,
      highlight: isSaved,
      handler: onSaveLater,
    },
    { key: 'more', label: 'More actions', icon: <MoreDotsIcon size={16} />, handler: onMore },
  ];

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Message actions"
      style={{
        position: 'absolute',
        top: -18,
        right: 16,
        display: visible ? 'inline-flex' : 'none',
        alignItems: 'center',
        gap: 0,
        height: 36,
        padding: '0 4px',
        background: 'var(--cv2-bg-toolbar)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 8,
        boxShadow: 'var(--cv2-shadow-toolbar)',
        zIndex: 5,
      }}
    >
      {actions.map(a => (
        <ToolbarButton key={a.key} action={a} />
      ))}
    </div>
  );
}

function ToolbarButton({ action }: { action: ActionDef }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={action.handler}
        aria-label={action.label}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          if (!action.highlight) {
            (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-strong)';
          }
          setHovered(true);
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = action.highlight
            ? 'var(--cv2-saved-fg)'
            : 'var(--cv2-text-subtle)';
          setHovered(false);
        }}
        style={{
          width: 32,
          height: 32,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 6,
          color: action.highlight ? 'var(--cv2-saved-fg)' : 'var(--cv2-text-subtle)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          transition: 'background var(--cv2-transition-fast), color var(--cv2-transition-fast)',
        }}
      >
        {action.customNode ?? (action.emoji ? <span aria-hidden="true">{action.emoji}</span> : action.icon)}
      </button>
      <ActionTooltip
        anchorEl={btnRef.current}
        label={action.label}
        shortcut={action.shortcut}
        visible={hovered}
      />
    </>
  );
}
