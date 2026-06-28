/**
 * TicketKeyChip — inline ticket-key reference inside a chat message.
 * Canonical JiraIssueTypeIcon + key text. Click opens the Catalyst detail
 * view via useGlobalSearchStore.openDetail — ALWAYS the issue_key string,
 * never a UUID (CLAUDE.md 2026-05-10).
 * Background tinted by status_category for at-a-glance status signal.
 */
import React from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

export function statusBackground(cat: string | undefined): string {
  if (cat === 'done') return 'var(--ds-background-success, rgba(148,199,72,0.18))';
  if (cat === 'inprogress') return 'var(--ds-background-information, rgba(102,157,241,0.18))';
  return 'var(--ds-background-neutral-subtle)';
}

export interface TicketKeyChipProps {
  issueKey: string;
  issueType: string;
  summary?: string;
  statusCategory?: string;
}

export function TicketKeyChip({ issueKey, issueType, summary, statusCategory }: TicketKeyChipProps) {
  return (
    <button
      type="button"
      data-testid="chat-ticket-key-chip"
      data-status-category={statusCategory ?? ''}
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
        background: statusBackground(statusCategory),
        borderRadius: 3,
        color: 'var(--ds-link)',
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
