/**
 * CatyWorkflowPanel — Slide-in AI workflow editor panel.
 *
 * Positioned fixed on the right side (position:fixed, z-50).
 * Does NOT overlay the diagram — the parent shrinks the diagram area.
 * Uses @atlaskit/button/new + @atlaskit/textfield exclusively (ADS gate).
 */

import React, { useRef, useEffect, useState } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import type { WorkflowStatus, WorkflowTransition } from '@/hooks/useCatalystWorkflow';
import type { WorkflowAIMessage, WorkflowAIProposal } from '@/hooks/useWorkflowAI';
import { useWorkflowAI } from '@/hooks/useWorkflowAI';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schemeId: string;
  schemeName: string;
  issueType: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  onInvalidate: () => void;
}

// ─── Proposal Diff Display ────────────────────────────────────────────────────

function ProposalDiff({ proposal, statuses }: { proposal: WorkflowAIProposal; statuses: WorkflowStatus[] }) {
  const getName = (id: string) => statuses.find(s => s.id === id)?.name ?? id;

  const adds = proposal.statusesToAdd ?? [];
  const removes = proposal.statusesToRemove ?? [];
  const updates = proposal.statusesToUpdate ?? [];
  const tAdds = proposal.transitionsToAdd ?? [];
  const tRemoves = proposal.transitionsToRemove ?? [];

  const hasChanges = adds.length + removes.length + updates.length + tAdds.length + tRemoves.length > 0;
  if (!hasChanges) return null;

  return (
    <div style={{
      marginTop: 10,
      background: 'var(--ds-surface,#fff)',
      border: '1px solid var(--ds-border-brand,#579DFF)',
      borderRadius: 6,
      padding: '10px 12px',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--ds-text,#172B4D)', fontSize: 12 }}>
        Proposed changes
      </div>

      {adds.map((s, i) => (
        <div key={i} style={{ padding: '2px 0', color: 'var(--ds-text-success,#216E4E)' }}>
          + Status: <strong>{s.name}</strong> ({s.category.replace('_', ' ')}, pos {s.position})
        </div>
      ))}
      {removes.map((s, i) => (
        <div key={i} style={{ padding: '2px 0', color: 'var(--ds-text-danger,#AE2A19)', textDecoration: 'line-through' }}>
          − Status: {getName(s.id)}
        </div>
      ))}
      {updates.map((s, i) => (
        <div key={i} style={{ padding: '2px 0', color: 'var(--ds-text-warning,#CF8800)' }}>
          ~ Status: {getName(s.id)}{s.name ? ` → "${s.name}"` : ''}{s.category ? ` (${s.category})` : ''}{s.position !== undefined ? ` pos ${s.position}` : ''}
        </div>
      ))}
      {tAdds.map((t, i) => {
        const from = t.from_status_id
          ? t.from_status_id.startsWith('NEW:') ? t.from_status_id.slice(4) : getName(t.from_status_id)
          : 'Any';
        const to = t.to_status_id.startsWith('NEW:') ? t.to_status_id.slice(4) : getName(t.to_status_id);
        return (
          <div key={i} style={{ padding: '2px 0', color: 'var(--ds-text-success,#216E4E)' }}>
            + Transition: {from} → {to}{t.is_global ? ' (global)' : ''}
          </div>
        );
      })}
      {tRemoves.map((t, i) => {
        const tr = null; // transitions not in scope here
        return (
          <div key={i} style={{ padding: '2px 0', color: 'var(--ds-text-danger,#AE2A19)', textDecoration: 'line-through' }}>
            − Transition: {t.id}
          </div>
        );
      })}
    </div>
  );
}

// ─── Single Message Bubble ────────────────────────────────────────────────────

function MessageBubble({
  msg,
  statuses,
  onApply,
  onReject,
}: {
  msg: WorkflowAIMessage;
  statuses: WorkflowStatus[];
  onApply: (id: string, proposal: WorkflowAIProposal) => void;
  onReject: (id: string) => void;
}) {
  const isUser = msg.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        maxWidth: '90%',
        background: isUser
          ? 'var(--ds-background-brand-subtlest,#E9F2FF)'
          : 'var(--ds-surface-raised,#F1F2F4)',
        borderRadius: isUser ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
        padding: '10px 12px',
        fontSize: 13,
        color: 'var(--ds-text,#172B4D)',
        lineHeight: 1.5,
      }}>
        {msg.content}

        {/* Questions */}
        {msg.response?.type === 'questions' && msg.response.questions && (
          <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 12, color: 'var(--ds-text-subtle,#42526E)' }}>
            {msg.response.questions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        )}

        {/* Violations */}
        {msg.response?.type === 'violation' && msg.response.violations && (
          <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 12, color: 'var(--ds-text-danger,#AE2A19)' }}>
            {msg.response.violations.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        )}

        {/* Proposal diff + Apply/Skip */}
        {msg.response?.type === 'proposal' && msg.response.proposal && !msg.applied && !msg.rejected && (
          <>
            <ProposalDiff proposal={msg.response.proposal} statuses={statuses} />
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <Button
                appearance="primary"
                onClick={() => onApply(msg.id, msg.response!.proposal!)}
              >
                Apply changes
              </Button>
              <Button appearance="subtle" onClick={() => onReject(msg.id)}>
                Skip
              </Button>
            </div>
          </>
        )}

        {/* Applied badge */}
        {msg.applied && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ds-text-success,#216E4E)', fontWeight: 600 }}>
            ✓ Applied
          </div>
        )}
        {msg.rejected && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ds-text-subtlest,#6B778C)' }}>
            Skipped
          </div>
        )}
      </div>

      {/* Role label */}
      <div style={{ fontSize: 10, color: 'var(--ds-text-subtlest,#6B778C)', marginTop: 2, padding: '0 2px' }}>
        {isUser ? 'You' : 'CATY'}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CatyWorkflowPanel({
  isOpen,
  onClose,
  schemeId,
  schemeName,
  issueType,
  statuses,
  transitions,
  onInvalidate,
}: Props) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    hasUnappliedChanges,
    sendMessage,
    applyProposal,
    rejectProposal,
    restoreSession,
    clearMessages,
  } = useWorkflowAI({ schemeId, schemeName, issueType, statuses, transitions, onInvalidate });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Close + clear on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleClose = () => {
    clearMessages();
    onClose();
  };

  if (!isOpen) return null;

  const EXAMPLE_PROMPTS = [
    `Add a "Code Review" status between In Development and In QA`,
    `Remove the "On Hold" status and its transitions`,
    `Make "Staging/QA" a final status`,
    `Add a global transition to every status in the done category`,
  ];

  return (
    /* Panel — position:fixed right side, not inside ReactFlow (A2/N3 safe) */
    <div
      role="complementary"
      aria-label="Ask CATY — Workflow AI"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--ds-surface,#ffffff)',
        borderLeft: '1px solid var(--ds-border,var(--cp-lozenge-grey-bg, #DFE1E6))',
        boxShadow: '-4px 0 20px rgba(9,30,66,0.12)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--ds-border,var(--cp-lozenge-grey-bg, #DFE1E6))',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--ds-surface-sunken,#F7F8F9)',
      }}>
        {/* CATY avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--ds-background-brand-bold,#0C66E4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ds-text-inverse,#fff)', fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>
          C
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text,#172B4D)' }}>
            Ask CATY
          </div>
          <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest,#6B778C)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {issueType} Workflow · {statuses.length} statuses
          </div>
        </div>
        <Button appearance="subtle" onClick={handleClose} aria-label="Close">
          ✕
        </Button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 13, color: 'var(--ds-text-subtle,#42526E)', marginBottom: 12, lineHeight: 1.5 }}>
              Describe a workflow change in plain English. I'll propose the exact status and transition edits needed.
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest,#6B778C)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Examples
            </div>
            {EXAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => { setInput(p); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 10px', marginBottom: 5, borderRadius: 4,
                  border: '1px solid var(--ds-border,var(--cp-lozenge-grey-bg, #DFE1E6))',
                  background: 'var(--ds-surface-sunken,#F7F8F9)',
                  color: 'var(--ds-text-subtle,#42526E)', fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                "{p}"
              </button>
            ))}
          </div>
        )}

        {/* Message list */}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            statuses={statuses}
            onApply={applyProposal}
            onReject={rejectProposal}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
            <Spinner size="small" />
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest,#6B778C)' }}>CATY is thinking…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--ds-border,var(--cp-lozenge-grey-bg, #DFE1E6))', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Textfield
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Describe a workflow change…"
            aria-label="Workflow change instruction"
            isDisabled={isLoading}
          />
        </div>
        <Button
          appearance="primary"
          onClick={handleSend}
          isDisabled={!input.trim() || isLoading}
        >
          Send
        </Button>
      </div>

      {/* Restore footer — only when changes have been applied */}
      {hasUnappliedChanges && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--ds-border,var(--cp-lozenge-grey-bg, #DFE1E6))' }}>
          <Button appearance="danger" onClick={restoreSession} shouldFitContainer>
            ↩ Restore to session start
          </Button>
        </div>
      )}
    </div>
  );
}
