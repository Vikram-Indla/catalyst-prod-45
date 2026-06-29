import React, { useRef, useState } from 'react';
import { ActionTooltip } from '../shared/ActionTooltip';
import {
  CheckIcon,
  MarkUnreadIcon,
  MoreDotsIcon,
} from '../shared/Icon';

interface ActivityHoverStripProps {
  onMarkUnread: () => void;
  onMarkRead: () => void;
  onMore: (anchor: DOMRect) => void;
}

interface ActionDef {
  key: string;
  label: string;
  shortcut?: string;
  emoji?: string;
  icon?: React.ReactNode;
  custom?: React.ReactNode;
  handler: () => void;
}

export function ActivityHoverStrip({
  onMarkUnread,
  onMarkRead,
  onMore,
}: ActivityHoverStripProps) {
  const moreRef = useRef<HTMLButtonElement>(null);

  const actions: ActionDef[] = [
    { key: 'unread', label: 'Mark as unread', icon: <MarkUnreadIcon size={16} />, handler: onMarkUnread },
    { key: 'read', label: 'Mark as read', icon: <CheckIcon size={16} />, handler: onMarkRead },
    { key: 'more', label: 'More actions', icon: <MoreDotsIcon size={16} />, handler: () => {
        const r = moreRef.current?.getBoundingClientRect();
        if (r) onMore(r);
      } },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Activity item actions"
      onClick={e => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        height: 24,
        background: 'transparent',
        border: 'none',
      }}
    >
      {actions.map(a => (
        <StripBtn key={a.key} action={a} btnRef={a.key === 'more' ? moreRef : undefined} />
      ))}
    </div>
  );
}

function StripBtn({
  action,
  btnRef,
}: {
  action: ActionDef;
  btnRef?: React.RefObject<HTMLButtonElement>;
}) {
  const localRef = useRef<HTMLButtonElement>(null);
  const ref = btnRef ?? localRef;
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={action.label}
        onClick={e => { e.stopPropagation(); action.handler(); }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-strong)';
          setHovered(true);
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-subtle)';
          setHovered(false);
        }}
        style={{
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: 'var(--cv2-text-subtle)',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          font: 'var(--ds-font-body)',
          lineHeight: 1,
        }}
      >
        {action.custom ?? (action.emoji ? <span aria-hidden="true">{action.emoji}</span> : action.icon)}
      </button>
      <ActionTooltip
        anchorEl={ref.current}
        label={action.label}
        shortcut={action.shortcut}
        visible={hovered}
      />
    </>
  );
}
