// src/components/layout/HuddleHeaderStrip.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { useHuddleStore } from '@/store/huddleStore';

/**
 * Persistent call-strip docked below the global header. Visible on ANY route
 * while a huddle is active (the store lives at app-shell scope so the call
 * survives navigating away from /chat). Disappears only when the user leaves.
 */
export function HuddleHeaderStrip() {
  const active = useHuddleStore((s) => s.active);
  const leave = useHuddleStore((s) => s.leave);
  const toggleMute = useHuddleStore((s) => s.toggleMute);
  const navigate = useNavigate();

  if (!active) return null;

  const connecting = active.connectionState !== 'connected';

  return (
    <div
      role="region"
      aria-label="Active huddle"
      style={{
        position: 'fixed',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 40,
        padding: '0 16px',
        background: 'var(--ds-background-success, #DCFFF1)',
        borderBottom: '1px solid var(--ds-border-success, #4BCE97)',
      }}
    >
      <span style={{ display: 'inline-flex', width: 8, height: 8, borderRadius: '50%',
        background: 'var(--ds-icon-success, #22A06B)' }} aria-hidden />
      <button
        type="button"
        onClick={() => navigate('/chat')}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}
      >
        Huddle · {active.conversationName}
      </button>
      <Avatar size="xsmall" />
      {connecting && <Spinner size="small" />}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button type="button" onClick={toggleMute}
          style={stripBtn()}>
          {active.micMuted ? 'Unmute' : 'Mute'}
        </button>
        <button type="button" onClick={leave}
          style={stripBtn('var(--ds-text-danger, #AE2A19)')}>
          Leave
        </button>
      </div>
    </div>
  );
}

function stripBtn(color = 'var(--ds-text, #172B4D)'): React.CSSProperties {
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
