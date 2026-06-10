/**
 * TicketKeyChip — inline ticket-key reference inside a chat message.
 * Canonical JiraIssueTypeIcon + key text. Click opens the Catalyst detail
 * view via useGlobalSearchStore.openDetail — ALWAYS the issue_key string,
 * never a UUID (CLAUDE.md 2026-05-10).
 */
import React from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

export interface TicketKeyChipProps {
  issueKey: string;
  issueType: string;
  summary?: string;
}

export function TicketKeyChip({ issueKey, issueType, summary }: TicketKeyChipProps) {
  return (
    <button
      type="button"
      data-testid="chat-ticket-key-chip"
      title={summary ? `${issueKey} — ${summary}` : issueKey}
      onClick={(e) => {
        e.stopPropagation();
        useGlobalSearchStore.getState().openDetail({ id: issueKey });
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 4px',
        margin: 0,
        border: 'none',
        background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
        borderRadius: 3,
        color: 'var(--ds-link, #0052CC)',
        font: 'inherit',
        fontWeight: 500,
        cursor: 'pointer',
        verticalAlign: 'baseline',
      }}
    >
      <JiraIssueTypeIcon type={issueType} size={14} />
      {issueKey}
    </button>
  );
}

export default TicketKeyChip;
