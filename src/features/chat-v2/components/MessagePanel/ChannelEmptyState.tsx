import React from 'react';
import type { ChatConversation } from '@/types/chat';

interface ChannelEmptyStateProps {
  conversation: ChatConversation;
  onAddPeople?: () => void;
  onEditDescription?: () => void;
}

export function ChannelEmptyState({ conversation, onAddPeople, onEditDescription }: ChannelEmptyStateProps) {
  const description = (conversation.description ?? '').trim();
  const compact = description.length > 0;

  return (
    <div
      style={{
        padding: '32px 32px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--cv2-font)',
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--cv2-text-strong)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize: 26,
              fontWeight: 400,
              color: 'var(--cv2-text-subtle)',
            }}
          >
            {conversation.isPrivate ? '🔒' : '#'}
          </span>
          {conversation.title}
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontFamily: 'var(--cv2-font)',
            fontSize: 15,
            color: 'var(--cv2-text-subtle)',
            lineHeight: 1.5,
          }}
        >
          You created this channel today. This is the very beginning of the{' '}
          <strong style={{ color: 'var(--cv2-text-strong)' }}>
            <span style={{ marginRight: 2 }}>{conversation.isPrivate ? '🔒' : '#'}</span>
            {conversation.title}
          </strong>{' '}
          channel.
          {compact && (
            <>
              {' '}
              {description}{' '}
              <button
                type="button"
                onClick={onEditDescription}
                style={{
                  background: 'transparent',
                  color: 'var(--cv2-accent, #1264A3)',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                (Edit description)
              </button>
            </>
          )}
        </p>
      </div>

      {compact ? (
        <InlinePillRow onAddPeople={onAddPeople} />
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <ActionCard
            title="Add people to channel"
            background="linear-gradient(180deg, #4A154B 0%, #3F0E40 100%)"
            art={<PeopleArt />}
            onClick={onAddPeople}
          />
          <ActionCard
            title="Add channel description"
            background="linear-gradient(180deg, #0F4C56 0%, #073B43 100%)"
            art={<DocArt />}
            onClick={onEditDescription}
          />
        </div>
      )}
    </div>
  );
}

function InlinePillRow({ onAddPeople }: { onAddPeople?: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <PillButton onClick={onAddPeople}>
        <UserPlusIcon />
        <span>Add People to Channel</span>
      </PillButton>
    </div>
  );
}

function PillButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        fontSize: 13,
        fontWeight: 700,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function UserPlusIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function ActionCard({
  title,
  background,
  art,
  onClick,
}: {
  title: string;
  background: string;
  art: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        position: 'relative',
        width: 200,
        height: 250,
        padding: 18,
        background,
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 10,
        textAlign: 'left',
        fontFamily: 'var(--cv2-font)',
        fontSize: 15,
        fontWeight: 700,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: '0 0 auto',
        opacity: onClick ? 1 : 0.85,
      }}
    >
      <span style={{ lineHeight: 1.25 }}>{title}</span>
      <span
        aria-hidden="true"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}
      >
        {art}
      </span>
    </button>
  );
}

function PeopleArt() {
  return (
    <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden="true">
      <g transform="translate(54 6)">
        <circle cx="22" cy="22" r="20" fill="#F2C8A2" />
        <path d="M2 50C2 38 12 30 22 30c10 0 20 8 20 20v18H2z" fill="#3F704D" />
      </g>
      <g transform="translate(48 8)">
        <circle cx="22" cy="22" r="20" fill="#E0AC8B" />
        <ellipse cx="14" cy="22" rx="5" ry="5" fill="none" stroke="#000" strokeWidth="1.4" />
        <ellipse cx="30" cy="22" rx="5" ry="5" fill="none" stroke="#000" strokeWidth="1.4" />
        <path d="M19 22h6" stroke="#000" strokeWidth="1.4" />
        <path d="M2 50C2 38 12 30 22 30c10 0 20 8 20 20v18H2z" fill="#2D5BAB" />
      </g>
      <g transform="translate(10 30)">
        <circle cx="26" cy="26" r="22" fill="#F8B4A0" />
        <path d="M4 26C4 14 14 4 26 4c12 0 22 10 22 22v6H4z" fill="#FB7BA4" />
        <path d="M2 80C2 64 14 52 26 52c12 0 24 12 24 28v6H2z" fill="#F9C04A" />
      </g>
    </svg>
  );
}

function DocArt() {
  return (
    <svg width={120} height={130} viewBox="0 0 120 130" aria-hidden="true">
      <g transform="translate(40 0)">
        <rect x="0" y="0" width="70" height="92" rx="4" fill="#F2EAD3" />
        <rect x="10" y="14" width="20" height="3" fill="#7C8A8E" />
        <rect x="10" y="24" width="46" height="2" fill="#C7D3D6" />
        <rect x="10" y="30" width="40" height="2" fill="#C7D3D6" />
        <rect x="10" y="36" width="44" height="2" fill="#C7D3D6" />
        <path d="M14 58l8 8 16-16" stroke="#1F8553" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(0 38)">
        <path d="M20 80c0-16 12-32 30-32 18 0 22 14 22 26 0 14-14 30-26 30S20 96 20 80z" fill="#E0AC8B" />
        <path d="M40 64c4-2 10 0 12 6" stroke="#B68360" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
