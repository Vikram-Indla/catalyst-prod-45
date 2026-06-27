import React, { useState } from 'react';
import { Lozenge } from '@/components/ads';
import { ChatMessage, T } from './aiAdminAssistant.types';

interface RecentAction {
  id: string;
  request: string;
  summary: string;
  status: 'success' | 'failed' | 'partial' | 'cancelled';
  timestamp: string;
  stepCount?: number;
}

function deriveRecentActions(messages: ChatMessage[]): RecentAction[] {
  const actions: RecentAction[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'assistant' && msg.steps && msg.steps.length > 0) {
      // Find the preceding user message
      const userMsg = [...messages].slice(0, i).reverse().find(m => m.role === 'user');
      const failedCount = msg.steps.filter(s => s.status === 'failed').length;
      const successCount = msg.steps.filter(s => s.status === 'success').length;

      let status: RecentAction['status'] = 'success';
      if (msg.rolled_back) status = 'failed';
      else if (failedCount > 0 && successCount > 0) status = 'partial';
      else if (failedCount === msg.steps.length) status = 'failed';

      actions.push({
        id: msg.id,
        request: userMsg?.text ?? 'Unknown request',
        summary: msg.text,
        status,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stepCount: msg.steps.length,
      });
    }
    if (actions.length >= 5) break;
  }
  return actions.reverse();
}

const STATUS_LOZENGE: Record<RecentAction['status'], { label: string; appearance: 'success' | 'removed' | 'moved' | 'default' }> = {
  success:   { label: 'Success',  appearance: 'success' },
  failed:    { label: 'Failed',   appearance: 'removed' },
  partial:   { label: 'Partial',  appearance: 'moved' },
  cancelled: { label: 'Cancelled', appearance: 'default' },
};

interface AiRecentActionsProps {
  messages: ChatMessage[];
}

export function AiRecentActions({ messages }: AiRecentActionsProps) {
  const [expanded, setExpanded] = useState(false);
  const actions = deriveRecentActions(messages);

  if (actions.length === 0) return null;

  return (
    <div
      style={{
        borderTop: `1px solid ${T.border}`,
        background: T.sunken,
        flexShrink: 0,
      }}
    >
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          padding: '8px 24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: T.subtle,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', fontSize: 10 }}>▶</span>
        Recent Actions ({actions.length})
        {!expanded && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {actions.slice(0, 3).map(a => (
              <span key={a.id} style={{ display: 'inline-block' }}>
                <Lozenge appearance={STATUS_LOZENGE[a.status].appearance}>{STATUS_LOZENGE[a.status].label}</Lozenge>
              </span>
            ))}
          </span>
        )}
      </button>

      {expanded && (
        <div style={{ padding: '0 24px 12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {actions.map((action, i) => (
            <div
              key={action.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '7px 0',
                borderBottom: i < actions.length - 1 ? `1px solid ${T.borderSubtle}` : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {action.request}
                </div>
                <div style={{ fontSize: 11, color: T.subtlest, marginTop: 1 }}>
                  {action.stepCount != null ? `${action.stepCount} step${action.stepCount !== 1 ? 's' : ''}` : ''} · {action.timestamp}
                </div>
              </div>
              <span style={{ display: 'inline-block', flexShrink: 0 }}>
                <Lozenge appearance={STATUS_LOZENGE[action.status].appearance}>
                  {STATUS_LOZENGE[action.status].label}
                </Lozenge>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
