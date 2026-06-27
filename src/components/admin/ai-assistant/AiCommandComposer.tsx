import React, { KeyboardEvent, RefObject } from 'react';
import { Button, Textfield, SectionMessage } from '@/components/ads';
import { AssistantStatus, T } from './aiAdminAssistant.types';

interface AiCommandComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onConfirm: () => void;
  status: AssistantStatus;
  inputRef?: RefObject<HTMLInputElement>;
  error?: string;
}

export function AiCommandComposer({ value, onChange, onSend, onConfirm, status, inputRef, error }: AiCommandComposerProps) {
  const isAwaiting = status === 'awaiting_confirm';
  const isBusy = status === 'loading' || status === 'executing';
  const isEmpty = !value.trim();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isAwaiting && isEmpty) {
        onConfirm();
      } else if (!isEmpty && status === 'idle') {
        onSend();
      }
    }
  };

  const handleClick = () => {
    if (isAwaiting && isEmpty) {
      onConfirm();
    } else {
      onSend();
    }
  };

  const isDisabled =
    isBusy ||
    (status === 'idle' && isEmpty) ||
    (isAwaiting && !isEmpty && false); // always allow typing when awaiting

  const buttonLabel = isBusy
    ? 'Running…'
    : isAwaiting && isEmpty
    ? 'Confirm'
    : 'Send';

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${T.border}`,
        padding: '10px 16px 14px',
        background: T.surface,
      }}
    >
      {isAwaiting && (
        <div style={{ marginBottom: 8 }}>
          <SectionMessage appearance="warning" title="Action plan ready">
            Review the plan on the right, then click "Confirm & Execute" — or type a new command to cancel.
          </SectionMessage>
        </div>
      )}

      {/* Label */}
      <label
        htmlFor="ai-admin-composer"
        style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.subtlest, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}
      >
        Admin request
      </label>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Textfield
            id="ai-admin-composer"
            ref={inputRef}
            placeholder={
              isAwaiting
                ? 'Type a new command to cancel the plan, or click Confirm →'
                : 'Example: Add Vikram as Product Owner'
            }
            value={value}
            onChange={e => onChange((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            isDisabled={isBusy}
            aria-label="Admin request"
            aria-describedby="ai-composer-helper"
          />
          {error && (
            <div style={{ fontSize: 11, color: T.danger, marginTop: 3 }}>{error}</div>
          )}
        </div>
        <Button
          appearance={isAwaiting && isEmpty ? 'warning' : 'primary'}
          onClick={handleClick}
          isDisabled={isDisabled}
          isLoading={isBusy}
        >
          {buttonLabel}
        </Button>
      </div>

      {/* Helper text */}
      <p
        id="ai-composer-helper"
        style={{ margin: '5px 0 0', fontSize: 11, color: T.subtlest }}
      >
        The assistant prepares a plan first. No change is made without your confirmation.
        Press <kbd style={{ fontFamily: 'inherit', background: T.neutral, border: `1px solid ${T.border}`, borderRadius: 3, padding: '0 3px', fontSize: 10 }}>Enter</kbd> to send.
      </p>
    </div>
  );
}
