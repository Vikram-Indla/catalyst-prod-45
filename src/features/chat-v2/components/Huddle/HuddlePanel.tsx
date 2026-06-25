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

  if (!huddle) return null;

  const inThisHuddle = active?.conversationId === conversation.id;
  const connecting = inThisHuddle && active?.connectionState !== 'connected';

  return (
    <div
      role="region"
      aria-label="Huddle"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        borderLeft: '3px solid var(--ds-border-success, #4BCE97)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
        Huddle
      </span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {huddle.participants.map((p) => (
          <span key={p.userId} style={{ marginLeft: -4 }}>
            <Avatar size="small" />
          </span>
        ))}
      </div>
      {connecting && <Spinner size="small" />}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {inThisHuddle ? (
          <>
            <button type="button" onClick={toggleMute}
              style={btnStyle()}>
              {active?.micMuted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" onClick={leave}
              style={btnStyle('var(--ds-text-danger, #AE2A19)')}>
              Leave
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={huddle.isFull}
            onClick={() => { void startOrJoin(conversation); }}
            style={btnStyle()}
          >
            {huddle.isFull ? 'Huddle in progress (full)' : 'Join huddle'}
          </button>
        )}
      </div>
    </div>
  );
}

function btnStyle(color = 'var(--ds-text, #172B4D)'): React.CSSProperties {
  return {
    border: '1px solid var(--ds-border, #DFE1E6)',
    background: 'var(--ds-surface, #FFFFFF)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 13,
    cursor: 'pointer',
    color,
  };
}
