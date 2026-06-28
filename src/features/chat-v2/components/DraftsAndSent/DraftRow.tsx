import React from 'react';
import { formatRowTimestamp } from '../../lib/formatTimestamp';
import { ConversationAvatar, ConversationTitle } from './ConversationAvatar';
import type { DraftListItem } from '../../hooks/useAllDrafts';
import type { ChatConversation } from '@/types/chat';

interface DraftRowProps {
  draft: DraftListItem;
  conversation?: ChatConversation;
  onClick: () => void;
  /** When in select mode, leading checkbox is rendered + click toggles selection. */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}

export function DraftRow({
  draft,
  conversation,
  onClick,
  selectMode = false,
  selected = false,
  onToggleSelected,
}: DraftRowProps) {
  const handleClick = () => {
    if (selectMode) {
      onToggleSelected?.();
      return;
    }
    onClick();
  };
  const avatar = resolveAvatar(draft, conversation);
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '12px 16px',
        background: 'transparent',
        border: '1px solid var(--cv2-border)',
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {selectMode && (
        <span
          aria-hidden="true"
          style={{
            width: 16,
            height: 16,
            border: '1.5px solid var(--cv2-border-strong, var(--cv2-border))',
            borderRadius: 3,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selected ? 'var(--cv2-accent)' : 'transparent',
            borderColor: selected ? 'var(--cv2-accent)' : undefined,
            flex: '0 0 auto',
          }}
        >
          {selected && (
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="var(--ds-surface, #FFFFFF)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      )}
      <ConversationAvatar
        kind={conversation?.kind ?? draft.conversationKind}
        isPrivate={conversation?.isPrivate ?? draft.conversationIsPrivate}
        name={avatar.name}
        displayLabel={avatar.displayLabel}
        size={36}
      />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ConversationTitle
          kind={conversation?.kind ?? draft.conversationKind}
          isPrivate={conversation?.isPrivate ?? draft.conversationIsPrivate}
          title={conversation?.title ?? draft.conversationTitle}
        />
        <span
          style={{
            fontSize: 'var(--ds-font-size-300)',
            color: 'var(--cv2-text-subtle)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {draft.bodyPreview || 'No content'}
        </span>
      </span>
      <span
        style={{
          flex: '0 0 auto',
          fontSize: 'var(--ds-font-size-200)',
          color: 'var(--cv2-text-muted)',
        }}
      >
        {formatRowTimestamp(draft.updatedAt)}
      </span>
    </button>
  );
}

function resolveAvatar(
  draft: DraftListItem,
  conversation: ChatConversation | undefined,
): { src: string | null; name: string; displayLabel?: string } {
  const kind = conversation?.kind ?? draft.conversationKind;
  if (kind === 'dm') {
    const url = conversation?.dmAvatarUrls?.[0] ?? null;
    const name =
      conversation?.dmMemberNames?.[0] ??
      conversation?.title ??
      draft.conversationTitle;
    return { src: url, name };
  }
  if (kind === 'group_dm') {
    const count = conversation?.dmMemberNames?.length ?? 0;
    return {
      src: null,
      name: conversation?.title ?? draft.conversationTitle,
      displayLabel: count > 0 ? String(count) : undefined,
    };
  }
  // Channels, projects, tickets — no per-user avatar, render initial.
  return { src: null, name: conversation?.title ?? draft.conversationTitle };
}
