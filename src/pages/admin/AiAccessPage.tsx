import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import { AdminGuard } from '@/components/admin/AdminGuard';
import {
  useAdminAiAssistant,
  ChatMessage,
  StepResult,
} from '@/hooks/useAdminAiAssistant';

const T = {
  text:      'var(--ds-text, #172B4D)',
  subtle:    'var(--ds-text-subtle, #44546F)',
  subtlest:  'var(--ds-text-subtlest, #626F86)',
  surface:   'var(--ds-surface, #FFFFFF)',
  raised:    'var(--ds-surface-raised, #FFFFFF)',
  neutral:   'var(--ds-background-neutral, #F1F2F4)',
  border:    'var(--ds-border, #DCDFE4)',
  brand:     'var(--ds-background-brand-bold, #0C66E4)',
  brandText: 'var(--ds-text-inverse, #FFFFFF)',
  success:   'var(--ds-icon-success, #22A06B)',
  danger:    'var(--ds-icon-danger, #CA3521)',
  warning:   'var(--ds-icon-warning, #974F0C)',
};

// ── Step result row ───────────────────────────────────────────────────────────

function StepRow({ step }: { step: StepResult }) {
  const icon: Record<StepResult['status'], React.ReactNode> = {
    success:     <span style={{ color: T.success, fontSize: 16, fontWeight: 700 }}>✓</span>,
    failed:      <span style={{ color: T.danger,  fontSize: 16, fontWeight: 700 }}>✗</span>,
    rolled_back: <span style={{ color: T.warning, fontSize: 16 }}>↩</span>,
    skipped:     <span style={{ color: T.subtlest, fontSize: 16 }}>—</span>,
  };

  const lozengeAppearance: Record<StepResult['status'], 'success' | 'removed' | 'moved' | 'default'> = {
    success:     'success',
    failed:      'removed',
    rolled_back: 'moved',
    skipped:     'default',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
        {icon[step.status]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: T.text }}>{step.label}</span>
        {step.error && (
          <div style={{ fontSize: 11, color: T.danger, marginTop: 2 }}>{step.error}</div>
        )}
      </div>
      <Lozenge appearance={lozengeAppearance[step.status]}>{step.status}</Lozenge>
    </div>
  );
}

// ── Plan preview card ─────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onConfirm,
  onCancel,
  isExecuting,
}: {
  plan: NonNullable<ChatMessage['plan']>;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        background: T.raised,
        marginTop: 8,
        overflow: 'hidden',
      }}
    >
      {plan.warnings.length > 0 && (
        <div style={{ padding: '8px 12px', background: 'var(--ds-background-warning, #FFF7D6)', borderBottom: `1px solid ${T.border}` }}>
          {plan.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: T.warning }}>⚠ {w}</div>
          ))}
        </div>
      )}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          {plan.steps.length} step{plan.steps.length !== 1 ? 's' : ''} planned
        </div>
        {plan.steps.map((step, i) => (
          <div
            key={step.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < plan.steps.length - 1 ? `1px solid ${T.border}` : 'none' }}
          >
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: T.neutral, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.subtle, flexShrink: 0 }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 13, color: T.text }}>{step.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: `1px solid ${T.border}`, justifyContent: 'flex-end' }}>
        <Button appearance="subtle" onClick={onCancel} isDisabled={isExecuting}>
          Cancel
        </Button>
        <Button appearance="primary" onClick={onConfirm} isLoading={isExecuting}>
          Confirm & run
        </Button>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onConfirm,
  onCancel,
  isExecuting,
  isPending,
}: {
  msg: ChatMessage;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting: boolean;
  isPending: boolean;
}) {
  const isUser = msg.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      <div style={{ maxWidth: '78%', minWidth: 0 }}>
        {/* Sender label */}
        <div style={{ fontSize: 11, color: T.subtlest, marginBottom: 4, textAlign: isUser ? 'right' : 'left' }}>
          {isUser ? 'You' : 'Catalyst AI'}
        </div>

        {/* Bubble */}
        <div
          style={{
            background: isUser ? T.brand : T.neutral,
            color: isUser ? T.brandText : T.text,
            borderRadius: isUser ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
            padding: '8px 12px',
            fontSize: 14,
            lineHeight: '20px',
            wordBreak: 'break-word',
          }}
        >
          {msg.text}
        </div>

        {/* Plan card — only shown for the most recent plan + awaiting confirm */}
        {msg.plan && isPending && (
          <PlanCard plan={msg.plan} onConfirm={onConfirm} onCancel={onCancel} isExecuting={isExecuting} />
        )}

        {/* Execution results */}
        {msg.steps && msg.steps.length > 0 && (
          <div style={{ marginTop: 8, border: `1px solid ${T.border}`, borderRadius: 6, background: T.raised, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', background: T.neutral, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.subtle }}>Execution results</span>
              {msg.rolled_back && (
                <span style={{ marginLeft: 8 }}>
                  <Lozenge appearance="moved">rolled back</Lozenge>
                </span>
              )}
            </div>
            <div style={{ padding: '4px 12px' }}>
              {msg.steps.map(s => <StepRow key={s.id} step={s} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Invite john@example.com as a Backend Developer',
  'Assign Sarah to the Product Manager role',
  'Create a new role called "QA Lead"',
  'Give the Senior Developer role permission to Create Sprint',
  'Reset password for user@example.com',
];

export default function AiAccessPage() {
  const { messages, status, pendingPlan, sendMessage, confirmPlan, cancelPlan, reset } = useAdminAiAssistant();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || status !== 'idle') return;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <AdminGuard>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 56px)',
          maxWidth: 820,
          margin: '0 auto',
          padding: '24px 32px 0',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: T.text, lineHeight: '28px' }}>
              AI Admin Assistant
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: T.subtle }}>
              Manage users, roles, and permissions with natural language.
            </p>
          </div>
          {messages.length > 0 && (
            <Button appearance="subtle" spacing="compact" onClick={reset}>
              New session
            </Button>
          )}
        </div>

        {/* Messages area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          {isEmpty ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
                <p style={{ fontSize: 16, fontWeight: 500, color: T.text, margin: 0 }}>
                  What would you like to do?
                </p>
                <p style={{ fontSize: 13, color: T.subtle, margin: '6px 0 0' }}>
                  Invite users, assign roles, update permissions, or reset passwords.
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    style={{
                      border: `1px solid ${T.border}`,
                      borderRadius: 20,
                      background: T.surface,
                      color: T.subtle,
                      fontSize: 12,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.1s, color 0.1s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--ds-border-focused, #0C66E4)';
                      (e.currentTarget as HTMLElement).style.color = T.text;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = T.border;
                      (e.currentTarget as HTMLElement).style.color = T.subtle;
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isLastAssistantWithPlan = msg.role === 'assistant' && msg.plan != null && i === messages.length - 1;
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    onConfirm={confirmPlan}
                    onCancel={cancelPlan}
                    isExecuting={status === 'executing'}
                    isPending={isLastAssistantWithPlan && status === 'awaiting_confirm'}
                  />
                );
              })}
              {status === 'loading' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', color: T.subtle, fontSize: 13 }}>
                  <Spinner size="small" />
                  <span>Thinking…</span>
                </div>
              )}
              {status === 'executing' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', color: T.subtle, fontSize: 13 }}>
                  <Spinner size="small" />
                  <span>Executing…</span>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          style={{
            flexShrink: 0,
            borderTop: `1px solid ${T.border}`,
            padding: '12px 0 20px',
          }}
        >
          {status === 'awaiting_confirm' && (
            <div style={{ marginBottom: 10 }}>
              <SectionMessage appearance="warning" title="Confirm before running">
                Review the plan above, then click "Confirm & run" — or type a new command to cancel.
              </SectionMessage>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Textfield
                ref={inputRef}
                placeholder={
                  status === 'awaiting_confirm'
                    ? 'Type a new command to cancel the plan…'
                    : 'Invite a user, assign a role, update permissions…'
                }
                value={input}
                onChange={e => setInput((e.target as HTMLInputElement).value)}
                onKeyDown={handleKeyDown}
                isDisabled={status === 'loading' || status === 'executing'}
              />
            </div>
            <Button
              appearance="primary"
              onClick={status === 'awaiting_confirm' && !input.trim() ? confirmPlan : handleSend}
              isDisabled={
                (status !== 'idle' && status !== 'awaiting_confirm') ||
                (status === 'awaiting_confirm' && !input.trim() ? false : !input.trim())
              }
              isLoading={status === 'loading' || status === 'executing'}
            >
              {status === 'awaiting_confirm' && !input.trim() ? 'Confirm' : 'Send'}
            </Button>
          </div>
          <div style={{ fontSize: 11, color: T.subtlest, marginTop: 6 }}>
            AI may make mistakes. Review each plan before confirming.
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
