/**
 * LaterRow — single saved/reminder item with hover strip (✓ / 🕐 / ⋯).
 * Strip varies by tab:
 *   in_progress  : ✓ (mark completed) · 🕐 (snooze) · ⋯ (Open variants, Archive, Remove)
 *   completed    : ⋯ only (Open variants, Move to in progress, Remove)
 *   archived     : ⋯ only (Open variants, Move to in progress, Remove)
 * "Incomplete" purple badge renders when a reminder has fired.
 */
import React, { useMemo, useRef, useState } from 'react';
import Lozenge from '@atlaskit/lozenge';
import {
  CheckIcon,
  RemindClockIcon,
  MoreDotsIcon,
} from '../shared/Icon';
import type { LaterItem } from '../../hooks/useLaterItems';
import { formatRowTimestamp } from '../../lib/formatTimestamp';
import { useAuth } from '@/hooks/useAuth';
import { renderMarkdownInline } from '../../lib/markdown';
import { resolveAvatarUrl } from '@/lib/avatars';

interface LaterRowProps {
  item: LaterItem;
  tab: 'in_progress' | 'archived' | 'completed';
  selected: boolean;
  onSelect: () => void;
  onComplete: () => void;
  onSnooze: (anchor: DOMRect) => void;
  onMore: (anchor: DOMRect) => void;
}

export function LaterRow({ item, tab, selected, onSelect, onComplete, onSnooze, onMore }: LaterRowProps) {
  const [hovered, setHovered] = useState(false);
  const clockRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const showStrip = hovered || selected;
  const { user } = useAuth();
  const selfToken = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = typeof meta.full_name === 'string' ? meta.full_name : '';
    return fullName.replace(/\s+/g, '');
  }, [user?.user_metadata]);

  const conversationLabel = item.kind === 'reminder' ? 'Reminder' : item.conversationKind === 'channel' ? 'Channel' : 'Direct Message';
  const showIncomplete = item.state === 'in_progress' && item.remindFired && item.kind === 'reminder';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      style={{
        position: 'relative',
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        background: selected ? 'var(--cv2-bg-row-selected)' : 'transparent',
        borderBottom: '1px solid var(--cv2-divider)',
        cursor: 'pointer',
        outline: 'none',
        transition: 'background var(--cv2-transition-fast)',
      }}
    >
      {/* category label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            font: 'var(--ds-font-body-small)',
            color: 'var(--cv2-text-muted)',
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {showIncomplete && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Lozenge appearance="moved">Incomplete</Lozenge>
              <span>· {formatRowTimestamp(item.remindAt ?? item.createdAt)}</span>
            </span>
          )}
          {!showIncomplete && conversationLabel}
          {item.kind === 'reminder' && !showIncomplete && (
            <span style={{ color: 'var(--cv2-text-muted)' }}>· Reminder</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Avatar name={item.authorName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                font: 'var(--ds-font-body)',
                fontWeight: 700,
                color: 'var(--cv2-text-strong)',
                marginBottom: 0,
              }}
            >
              {item.authorName}
            </div>
            {item.body ? (
              <div
                style={{
                  font: 'var(--ds-font-body)',
                  color: 'var(--cv2-text)',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownInline(item.body, selfToken) }}
              />
            ) : (
              <div
                style={{
                  font: 'var(--ds-font-body)',
                  color: 'var(--cv2-text-muted)',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                (empty)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* hover strip */}
      {showStrip && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            background: 'var(--cv2-bg-toolbar)',
            border: '1px solid var(--cv2-border-strong)',
            borderRadius: 'var(--cv2-radius-lg)',
            padding: '4px 6px',
            boxShadow: 'var(--cv2-shadow-modal)',
            zIndex: 2,
          }}
        >
          {tab === 'in_progress' && (
            <>
              <StripBtn label="Mark complete" onClick={onComplete}>
                <CheckIcon size={16} />
              </StripBtn>
              <StripBtn
                refEl={clockRef}
                label="Snooze"
                onClick={() => { if (clockRef.current) onSnooze(clockRef.current.getBoundingClientRect()); }}
              >
                <RemindClockIcon size={16} />
              </StripBtn>
            </>
          )}
          <StripBtn
            refEl={moreRef}
            label="More"
            onClick={() => { if (moreRef.current) onMore(moreRef.current.getBoundingClientRect()); }}
          >
            <MoreDotsIcon size={16} />
          </StripBtn>
        </div>
      )}
    </div>
  );
}

function StripBtn({
  refEl, label, onClick, children,
}: {
  refEl?: React.RefObject<HTMLButtonElement>;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={refEl}
      type="button"
      aria-label={label}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = (name || 'M').charAt(0).toUpperCase();
  const photo = resolveAvatarUrl(name);
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        width={36}
        height={36}
        style={{ borderRadius: 'var(--cv2-radius-md)', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--cv2-radius-md)',
        background: 'var(--cv2-bg-row-hover)',
        color: 'var(--cv2-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: 'var(--ds-font-body)',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}
