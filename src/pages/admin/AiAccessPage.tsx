import React, { useRef, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import {
  useAdminAiAssistant,
  ChatMessage,
  StepResult,
  CommandPlan,
  CommandStep,
} from '@/hooks/useAdminAiAssistant';
import { AiCommandHeader }        from '@/components/admin/ai-assistant/AiCommandHeader';
import { AiAdminStatsStrip }      from '@/components/admin/ai-assistant/AiAdminStatsStrip';
import { AiCommandLibrary }       from '@/components/admin/ai-assistant/AiCommandLibrary';
import { AiConversationTimeline } from '@/components/admin/ai-assistant/AiConversationTimeline';
import { AiActionPlanPanel }      from '@/components/admin/ai-assistant/AiActionPlanPanel';
import { AiExecutionProgress }    from '@/components/admin/ai-assistant/AiExecutionProgress';
import { AiConfirmationModal }    from '@/components/admin/ai-assistant/AiConfirmationModal';
import { AiRecentActions }        from '@/components/admin/ai-assistant/AiRecentActions';
import { AiCommandComposer }      from '@/components/admin/ai-assistant/AiCommandComposer';

// Re-export types so existing imports still work
export type { ChatMessage, StepResult, CommandPlan, CommandStep };

const RISK_THRESHOLD = new Set(['High', 'Critical']);

function needsConfirmModal(plan: CommandPlan | null): boolean {
  if (!plan) return false;
  const riskLevel = (plan as CommandPlan & { risk_level?: string }).risk_level;
  return !!(riskLevel && RISK_THRESHOLD.has(riskLevel)) || plan.warnings.length > 0;
}

export default function AiAccessPage() {
  const { messages, status, pendingPlan, sendMessage, confirmPlan, cancelPlan, reset } = useAdminAiAssistant();
  const [input, setInput]             = useState('');
  const [composerError, setComposerError] = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll timeline
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Open high-risk modal when plan arrives
  useEffect(() => {
    if (status === 'awaiting_confirm' && needsConfirmModal(pendingPlan)) {
      setModalOpen(true);
    }
  }, [status, pendingPlan]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) {
      setComposerError('Please enter a request before sending.');
      return;
    }
    if (status !== 'idle') return;
    setComposerError('');
    setInput('');
    sendMessage(text);
  };

  const handleConfirm = () => {
    setModalOpen(false);
    confirmPlan();
  };

  const handleCancel = () => {
    setModalOpen(false);
    cancelPlan();
  };

  const handleLibrarySelect = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleEditRequest = () => {
    // Cancel plan, keep input as-is for user to edit
    cancelPlan();
    inputRef.current?.focus();
  };

  return (
    <AdminGuard>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--ds-surface, #FFFFFF)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <AiCommandHeader
          hasMessages={messages.length > 0}
          onReset={reset}
        />

        {/* ── Stats strip ───────────────────────────────────────────────── */}
        <AiAdminStatsStrip />

        {/* ── 3-column cockpit ──────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '220px 1fr 300px',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Left: Command library */}
          <AiCommandLibrary
            onSelect={handleLibrarySelect}
            isDisabled={status === 'loading' || status === 'executing'}
          />

          {/* Center: Timeline + Execution progress + Composer */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <AiConversationTimeline
              messages={messages}
              status={status}
              pendingPlan={pendingPlan}
              bottomRef={bottomRef}
            />

            {/* Inline execution progress */}
            <AiExecutionProgress status={status} />

            <AiCommandComposer
              value={input}
              onChange={val => { setInput(val); if (composerError) setComposerError(''); }}
              onSend={handleSend}
              onConfirm={handleConfirm}
              status={status}
              inputRef={inputRef}
              error={composerError}
            />
          </div>

          {/* Right: Action plan */}
          <AiActionPlanPanel
            plan={pendingPlan}
            status={status}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onEditRequest={handleEditRequest}
          />
        </div>

        {/* ── Recent actions (collapsible bottom bar) ───────────────────── */}
        <AiRecentActions messages={messages} />
      </div>

      {/* ── High-risk confirmation modal ───────────────────────────────── */}
      <AiConfirmationModal
        isOpen={modalOpen}
        plan={pendingPlan}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isExecuting={status === 'executing'}
      />
    </AdminGuard>
  );
}
