// src/features/chat-v2/components/Huddle/HuddlePanel.tsx
import React from 'react';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { useActiveHuddle, useHuddleActions } from '@/hooks/chat/useHuddleData';
import { useHuddleStore } from '@/store/huddleStore';
import type { ChatConversation } from '@/types/chat';

/**
 * In-conversation huddle strip. Shows when the open conversation has an active
 * huddle: participant avatars, connection spinner while ICE negotiates, and a
 * Join (or Leave + mute) control. "Huddle full" disables Join at cap 2.
 */
export function HuddlePanel({ conversation }: { conversation: ChatConversation }) {
  const { huddle } = useActiveHuddle(conversation.id);
  const { startOrJoin } = useHuddleActions();
  const active = useHuddleStore((s) => s.active);
  const leave = useHuddleStore((s) => s.leave);
  const toggleMute = useHuddleStore((s) => s.toggleMute);
  const setScreenWindow = useHuddleStore((s) => s.setScreenWindow);

  if (!huddle) return null;

  const inThisHuddle = active?.conversationId === conversation.id;
  const connecting = inThisHuddle && active?.connectionState !== 'connected';
  const remoteSharing = inThisHuddle && !!active?.remoteSharing;

  return (
    <div
      role="region"
      aria-label="Huddle"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '8px 16px',
        borderBottom: '1px solid var(--ds-border)',
        background: 'var(--ds-surface-sunken)',
        borderLeft: '3px solid var(--ds-border-success)',
      }}
    >
      <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)' }}>
        Huddle
      </span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {huddle.participants.map((p) => (
          <span key={p.userId} style={{ marginLeft: -4 }} title={p.name || undefined}>
            <Avatar size="small" name={p.name || undefined} src={p.avatarUrl || undefined} />
          </span>
        ))}
      </div>
      {connecting && <Spinner size="small" />}
      {remoteSharing && (
        <button
          type="button"
          onClick={() => setScreenWindow('normal')}
          title="View shared screen"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            border: '1px solid var(--ds-border-success)', cursor: 'pointer',
            background: 'var(--ds-background-success)', color: 'var(--ds-text)',
            borderRadius: 999, padding: '4px 12px', fontSize: 'var(--ds-font-size-200)', fontWeight: 600,
          }}
        >
          <ScreenGlyph /> {active?.conversationName} is sharing their screen · View
        </button>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {inThisHuddle ? (
          <>
            <button type="button" onClick={toggleMute}
              style={btnStyle()}>
              {active?.micMuted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" onClick={leave}
              style={btnStyle('var(--ds-text-danger)')}>
              Leave
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={huddle.isFull && !huddle.iAmParticipant}
            onClick={() => { void startOrJoin(conversation); }}
            style={btnStyle()}
          >
            {huddle.iAmParticipant ? 'Rejoin huddle' : huddle.isFull ? 'Huddle in progress (full)' : 'Join huddle'}
          </button>
        )}
      </div>
    </div>
  );
}

const ScreenGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ds-icon-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" />
  </svg>
);

function btnStyle(color = 'var(--ds-text)'): React.CSSProperties {
  return {
    border: '1px solid var(--ds-border)',
    background: 'var(--ds-surface)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 'var(--ds-font-size-300)',
    cursor: 'pointer',
    color,
  };
}
