import React from 'react';
import { Lozenge, Spinner } from '@/components/ads';
import { ChatMessage, StepResult, AssistantStatus, T } from './aiAdminAssistant.types';

// ── Step result row ────────────────────────────────────────────────────────────

function StepRow({ step }: { step: StepResult }) {
  const icons: Record<StepResult['status'], string> = {
    success: '✓', failed: '✗', rolled_back: '↩', skipped: '—',
  };
  const colors: Record<StepResult['status'], string> = {
    success: T.iconSuccess ?? 'var(--ds-icon-success, #22A06B)',
    failed:  'var(--ds-icon-danger, #CA3521)',
    rolled_back: 'var(--ds-icon-warning, #974F0C)',
    skipped: T.subtlest,
  };
  const lozengeApp: Record<StepResult['status'], 'success' | 'removed' | 'moved' | 'default'> = {
    success: 'success', failed: 'removed', rolled_back: 'moved', skipped: 'default',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.borderSubtle}` }}>
      <span style={{ width: 18, flexShrink: 0, color: colors[step.status], fontWeight: 700, fontSize: 13, paddingTop: 2 }}>
        {icons[step.status]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, color: T.text }}>{step.label}</span>
        {step.error && <div style={{ fontSize: 11, color: T.danger, marginTop: 2 }}>{step.error}</div>}
      </div>
      <span style={{ display: 'inline-block', flexShrink: 0 }}>
        <Lozenge appearance={lozengeApp[step.status]}>{step.status.replace('_', ' ')}</Lozenge>
      </span>
    </div>
  );
}

// ── Message card ───────────────────────────────────────────────────────────────

function MessageCard({ msg, isPending }: { msg: ChatMessage; isPending: boolean }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Sender row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: isUser ? T.bgBrand : T.neutral,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: isUser ? T.inverse : T.subtle,
            flexShrink: 0,
          }}
        >
          {isUser ? 'YOU' : 'AI'}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.subtlest }}>
          {isUser ? 'You' : 'Catalyst AI'}
        </span>
      </div>

      {/* Card body */}
      <div
        style={{
          marginLeft: 28,
          background: isUser ? T.selected : T.surface,
          border: `1px solid ${isUser ? 'var(--ds-border-selected, #0C66E4)' : T.border}`,
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 13,
          color: T.text,
          lineHeight: '18px',
          wordBreak: 'break-word',
        }}
      >
        {msg.text}
      </div>

      {/* Warning badge if plan has warnings and pending */}
      {msg.plan && isPending && msg.plan.warnings.length > 0 && (
        <div
          style={{
            marginLeft: 28,
            marginTop: 4,
            padding: '6px 10px',
            background: T.bgWarning,
            border: `1px solid var(--ds-border-warning, #F8C543)`,
            borderRadius: 4,
            fontSize: 12,
            color: T.warning,
          }}
        >
          {msg.plan.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      {/* Execution results */}
      {msg.steps && msg.steps.length > 0 && (
        <div
          style={{
            marginLeft: 28,
            marginTop: 4,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            background: T.raised,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '5px 10px', background: T.neutral, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.subtle }}>Execution results</span>
            {msg.rolled_back && (
              <span style={{ display: 'inline-block' }}>
                <Lozenge appearance="moved" isBold>rolled back</Lozenge>
              </span>
            )}
          </div>
          <div style={{ padding: '4px 10px' }}>
            {msg.steps.map(s => <StepRow key={s.id} step={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyTimeline() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 24 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: T.selected,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        ✦
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>
          Ready for your command
        </p>
        <p style={{ fontSize: 12, color: T.subtle, margin: '4px 0 0' }}>
          Type a request below or pick a command from the library.
        </p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AiConversationTimelineProps {
  messages: ChatMessage[];
  status: AssistantStatus;
  pendingPlan: ChatMessage['plan'] | null;
  bottomRef: React.RefObject<HTMLDivElement>;
}

export function AiConversationTimeline({ messages, status, pendingPlan, bottomRef }: AiConversationTimelineProps) {
  const isEmpty = messages.length === 0 && status === 'idle';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isEmpty ? 0 : '12px 16px' }}>
      {isEmpty ? (
        <EmptyTimeline />
      ) : (
        <>
          {messages.map((msg, i) => {
            const isLastWithPlan = msg.role === 'assistant' && msg.plan != null && i === messages.length - 1;
            return (
              <MessageCard
                key={msg.id}
                msg={msg}
                isPending={isLastWithPlan && status === 'awaiting_confirm'}
              />
            );
          })}
          {status === 'loading' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', color: T.subtle, fontSize: 12 }}
              aria-live="polite" aria-label="AI is thinking">
              <Spinner size="small" />
              <span>Analysing your request…</span>
            </div>
          )}
          {status === 'executing' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', color: T.subtle, fontSize: 12 }}
              aria-live="polite" aria-label="Executing plan">
              <Spinner size="small" />
              <span>Executing plan safely…</span>
            </div>
          )}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
