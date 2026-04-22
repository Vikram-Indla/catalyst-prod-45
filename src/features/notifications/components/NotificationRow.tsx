// ─────────────────────────────────────────────────────────────────────────────
// NotificationRow — Atlaskit Avatar + Lozenge, 4-state hover model
// ─────────────────────────────────────────────────────────────────────────────

import { memo, useState } from 'react';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import type { NotificationItem } from '../types';
import { formatRelativeTime, getVerbLabel } from '../utils/date';

interface Props {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onClick: (item: NotificationItem) => void;
}

function NotificationRowInner({ item, onMarkRead, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const isUnread = item.readAt === null;

  const handleClick = () => {
    if (isUnread) onMarkRead(item.id);
    onClick(item);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${item.actor.displayName} — ${item.target.title}`}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 16px',
        cursor: 'pointer',
        background: hovered ? 'rgba(15,23,42,0.04)' : 'transparent',
        transition: 'background 150ms ease',
        outline: 'none',
        borderRadius: 0,
        position: 'relative',
      }}
    >
      {/* Left: Atlaskit Avatar */}
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <Avatar
          name={item.actor.displayName}
          src={item.actor.avatarUrl}
          size="medium"
          appearance="circle"
        />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Line 1: verb + relative time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: isUnread ? 500 : 400,
            color: '#0F172A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}>
            {getVerbLabel(item.verb, item.actor.displayName)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>
              {formatRelativeTime(item.createdAt)}
            </span>
            {/* Unread indicator / mark-read button */}
            {isUnread && !hovered && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#2563EB',
                  flexShrink: 0,
                }}
                aria-label="Unread"
              />
            )}
            {isUnread && hovered && (
              <button
                onClick={e => { e.stopPropagation(); onMarkRead(item.id); }}
                title="Mark as read"
                aria-label="Mark as read"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: '1.5px solid #CBD5E1',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Line 2: item title */}
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          color: '#0F172A',
          marginTop: 3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '18px',
        }}>
          {item.target.title}
        </div>

        {/* Line 3: key • Atlaskit Lozenge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          {item.target.key && (
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              fontWeight: 500,
              color: '#3B82F6',
            }}>
              {item.target.key}
            </span>
          )}
          {item.target.statusLabel && item.target.key && (
            <span style={{ color: '#94A3B8', fontSize: 10 }}>•</span>
          )}
          {item.target.statusLabel && (
            <Lozenge appearance={item.target.statusAppearance ?? 'default'} isBold={false}>
              {item.target.statusLabel}
            </Lozenge>
          )}
        </div>
      </div>
    </div>
  );
}

export const NotificationRow = memo(NotificationRowInner);
