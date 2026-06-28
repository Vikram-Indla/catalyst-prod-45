/**
 * PresenceIndicator — Online status dot, typing indicator, last-seen
 *
 * Renders:
 * - Green dot next to avatar when user online
 * - "Alice is typing…" when user has typing_until > now()
 * - "Last seen 2h ago" in sidebar when offline
 *
 * Usage:
 *   <PresenceIndicator
 *     presenceUI={presenceRow}
 *     size="small" // 'small' | 'medium' | 'large'
 *   />
 */

import React, { useMemo } from 'react';
import { PresenceUI } from '@/lib/chat/presence.types';
import { css } from '@emotion/react';

interface PresenceIndicatorProps {
  presenceUI: PresenceUI;
  size?: 'small' | 'medium' | 'large';
  showLastSeen?: boolean; // Default: true (show "Last seen Xh ago")
  showTyping?: boolean; // Default: true (show "Alice is typing…")
}

const COLORS = {
  online: 'var(--ds-background-success-bold)', // ADS green
  offline: 'var(--ds-icon-subtle)', // ADS muted
};

const SIZES = {
  small: { dot: 6, container: 18 },
  medium: { dot: 8, container: 24 },
  large: { dot: 10, container: 32 },
};

/**
 * PresenceIndicator — compact indicator showing online/offline + typing
 */
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  presenceUI,
  size = 'medium',
  showLastSeen = true,
  showTyping = true,
}) => {
  const { dot, container } = SIZES[size];

  const statusColor = presenceUI.status === 'online' ? COLORS.online : COLORS.offline;

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: 4px;
      `}
    >
      {/* Online dot */}
      <div
        css={css`
          position: relative;
          width: ${container}px;
          height: ${container}px;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        <div
          css={css`
            width: ${dot}px;
            height: ${dot}px;
            border-radius: 50%;
            background-color: ${statusColor};
            box-shadow: 0 0 0 2px white, 0 0 0 3px ${statusColor};
          `}
        />

        {/* Pulse animation for typing */}
        {presenceUI.is_typing && (
          <div
            css={css`
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              border: 2px solid ${statusColor};
              opacity: 0.3;
              animation: pulse 1.5s ease-in-out infinite;

              @keyframes pulse {
                0% {
                  opacity: 0.6;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.3;
                }
                100% {
                  opacity: 0.6;
                  transform: scale(1.3);
                }
              }
            `}
          />
        )}
      </div>

      {/* Typing or last-seen text */}
      <div
        css={css`
          font-size: 11px;
          color: var(--ds-text-subtlest);
          line-height: 1.2;
        `}
      >
        {showTyping && presenceUI.is_typing ? (
          <span>typing…</span>
        ) : showLastSeen && presenceUI.last_seen_text && presenceUI.status === 'offline' ? (
          <span>{presenceUI.last_seen_text}</span>
        ) : null}
      </div>
    </div>
  );
};

/**
 * TypingIndicator — "Alice, Bob are typing…" display
 *
 * Usage:
 *   <TypingIndicator
 *     typingUsers={[
 *       { user_name: 'Alice', user_avatar: 'https://...' },
 *       { user_name: 'Bob', user_avatar: 'https://...' }
 *     ]}
 *   />
 */

interface TypingIndicatorProps {
  typingUsers: Pick<PresenceUI, 'user_name' | 'user_avatar'>[];
  maxNames?: number; // Default: 2 (show "Alice, Bob are typing…")
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  maxNames = 2,
}) => {
  if (typingUsers.length === 0) return null;

  const displayNames = useMemo(() => {
    const names = typingUsers.slice(0, maxNames).map((u) => u.user_name);
    if (typingUsers.length > maxNames) {
      names.push(`+${typingUsers.length - maxNames} more`);
    }
    return names.join(', ');
  }, [typingUsers, maxNames]);

  const pluralVerb = typingUsers.length === 1 ? 'is' : 'are';

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background-color: var(--ds-surface-sunken);
        border-radius: 4px;
        font-size: 12px;
        color: var(--ds-text-subtle);
        border-left: 4px solid var(--ds-border);
      `}
    >
      {/* Animated dots */}
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: 0px;
        `}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            css={css`
              width: 3px;
              height: 3px;
              border-radius: 50%;
              background-color: var(--ds-text-subtle);
              animation: typingBounce 1.4s ease-in-out infinite;
              animation-delay: ${i * 0.2}s;

              @keyframes typingBounce {
                0%, 60%, 100% {
                  opacity: 0.5;
                  transform: translateY(0);
                }
                30% {
                  opacity: 1;
                  transform: translateY(-6px);
                }
              }
            `}
          />
        ))}
      </div>

      <span>{displayNames} {pluralVerb} typing…</span>
    </div>
  );
};

/**
 * PresenceList — sidebar or participant list showing all users in a conversation
 *
 * Usage:
 *   <PresenceList
 *     presenceList={presenceList}
 *     onlineFirst={true}
 *   />
 */

interface PresenceListProps {
  presenceList: PresenceUI[];
  onlineFirst?: boolean; // Default: true (show online users first)
}

export const PresenceList: React.FC<PresenceListProps> = ({
  presenceList,
  onlineFirst = true,
}) => {
  const sortedList = useMemo(() => {
    const sorted = [...presenceList];
    if (onlineFirst) {
      sorted.sort((a, b) => {
        // Online first
        const aOnline = a.status === 'online' ? 0 : 1;
        const bOnline = b.status === 'online' ? 0 : 1;
        if (aOnline !== bOnline) return aOnline - bOnline;
        // Then by name
        return a.user_name.localeCompare(b.user_name);
      });
    }
    return sorted;
  }, [presenceList, onlineFirst]);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: 8px;
      `}
    >
      {sortedList.map((presence) => (
        <div
          key={presence.id}
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 0;
          `}
        >
          {/* Avatar */}
          <img
            src={presence.user_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
            alt={presence.user_name}
            css={css`
              width: 24px;
              height: 24px;
              border-radius: 50%;
              object-fit: cover;
            `}
          />

          {/* Name and status */}
          <div
            css={css`
              flex: 1;
              min-width: 0;
            `}
          >
            <div
              css={css`
                font-size: 12px;
                font-weight: 500;
                color: var(--ds-text);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              {presence.user_name}
            </div>

            {presence.is_typing && (
              <div
                css={css`
                  font-size: 11px;
                  color: var(--ds-text-subtlest);
                  font-style: italic;
                `}
              >
                typing…
              </div>
            )}

            {presence.status === 'offline' && presence.last_seen_text && (
              <div
                css={css`
                  font-size: 11px;
                  color: var(--ds-text-subtlest);
                `}
              >
                {presence.last_seen_text}
              </div>
            )}
          </div>

          {/* Online indicator */}
          <PresenceIndicator presenceUI={presence} size="small" showLastSeen={false} />
        </div>
      ))}
    </div>
  );
};
