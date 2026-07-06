// src/components/chat/MissedCallsList.tsx
import React from 'react';
import { Avatar } from '@/components/ads';
import type { MissedCall } from '@/hooks/chat/useMissedCalls';

/**
 * MissedCallsList — hover popover shown from the SNOOZED call FAB. Lists calls
 * that rang and ended without being answered, with a call-back + dismiss action.
 * ADS-token styled so it renders correctly outside any cv2 theme context.
 */
type Props = {
  centerX: number;
  centerY: number;
  open: boolean;
  missed: MissedCall[];
  onOpen: () => void;
  onClose: () => void;
  onCallBack: (conversationId: string, name: string) => void;
  onDismiss: (huddleId: string) => void;
  onDismissAll: () => void;
};

const CARD_W = 300;

function relTime(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function MissedCallsList({ centerX, centerY, open, missed, onOpen, onClose, onCallBack, onDismiss, onDismissAll }: Props) {
  if (!open) return null;
  const left = Math.max(8, centerX - CARD_W - 12);
  const top = Math.max(8, centerY - 300);

  return (
    <div
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      style={{
        position: 'fixed',
        left,
        top,
        width: CARD_W,
        maxHeight: 340,
        zIndex: 602,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 12,
        boxShadow: 'var(--ds-shadow-overlay)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--ds-border)' }}>
        <span style={{ font: 'var(--ds-font-body)', fontWeight: 700, color: 'var(--ds-text)' }}>
          Missed calls{missed.length ? ` (${missed.length})` : ''}
        </span>
        {missed.length > 0 && (
          <button type="button" onClick={onDismissAll}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: 'var(--ds-font-body-small)', fontWeight: 600, color: 'var(--ds-text-brand)' }}>
            Clear all
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', padding: 4 }}>
        {missed.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
            No missed calls.
          </div>
        ) : (
          missed.map((m) => (
            <div key={m.huddleId}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8 }}>
              <Avatar size="small" name={m.callerName} src={m.callerAvatarUrl ?? undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: 'var(--ds-font-body)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.callerName}
                </div>
                <div style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtlest)' }}>
                  Missed · {relTime(m.endedAt)}
                </div>
              </div>
              <button type="button" title="Call back" aria-label={`Call back ${m.callerName}`}
                onClick={() => onCallBack(m.conversationId, m.callerName)}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ds-background-success-bold)', color: 'var(--ds-text-inverse)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.6 9.8a16 16 0 0 0 6 6l1.4-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
                </svg>
              </button>
              <button type="button" title="Dismiss" aria-label="Dismiss" onClick={() => onDismiss(m.huddleId)}
                style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--ds-background-neutral-subtle)', color: 'var(--ds-text-subtle)', fontSize: 15, lineHeight: 1 }}>
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MissedCallsList;
