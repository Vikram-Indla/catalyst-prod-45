/**
 * Ideation · Inbox — triage queue landing (inbox-first per design 04 §C.1).
 *
 * Phase 2 S1: real 2-pane triage (queue list w/ counts + preview pane),
 * reading live idn_ideas. Structure adopted from Mobbin evidence 05 §C row 1
 * (Intercom inbox: queue-list-with-counts + preview pane; Givingli: confirms
 * 2-pane sufficiency). Explicit departure per 09_DECISIONS.md: 2-pane, not
 * Intercom's 4-pane — sidebar nav already covers the queue-nav role.
 */
import { useMemo, useState } from 'react';
import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';
import { JiraTable, makeKeyCell, type Column } from '@/components/shared/JiraTable';
import { StatusLozenge, humanizeStatus } from '@/components/shared/StatusLozenge/StatusLozenge';
import { useIdeationInbox, useIdeationInboxCounts, adfToPlainText } from '@/hooks/useIdeationInbox';
import type { IdeaRow } from '@/modules/ideation/types';

const CLASS_LABEL: Record<IdeaRow['idea_class'], string> = {
  problem: 'Problem',
  opportunity: 'Opportunity',
  improvement: 'Improvement',
};

function ClassBadge({ ideaClass }: { ideaClass: IdeaRow['idea_class'] }) {
  return (
    <span
      style={{
        font: '600 11px/16px var(--ds-font-family-body, "Atlassian Sans", ui-sans-serif, sans-serif)',
        color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {CLASS_LABEL[ideaClass]}
    </span>
  );
}

export default function InboxPage() {
  const navigate = useNavigate();
  const { data: rows, isLoading, isError } = useIdeationInbox();
  const counts = useIdeationInboxCounts(rows);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => rows?.find((r) => r.id === selectedId) ?? rows?.[0] ?? null,
    [rows, selectedId]
  );

  const columns: Column<IdeaRow>[] = useMemo(
    () => [
      {
        id: 'key',
        label: 'Key',
        width: 7,
        cell: makeKeyCell((row) => row.idea_key),
      },
      {
        id: 'class',
        label: 'Class',
        width: 11,
        cell: ({ row }) => <ClassBadge ideaClass={row.idea_class} />,
      },
      {
        id: 'title',
        label: 'Summary',
        width: 42,
        cell: ({ row }) => (
          <span style={{ color: token('color.text', 'var(--ds-text)') }}>{row.title}</span>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 12,
        cell: ({ row }) => <StatusLozenge status={row.workflow_status_key} />,
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div data-testid="ideation-inbox-page" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="ideation-inbox-page">
        <HubPageHeader title="Inbox" />
        <EmptyState
          header="Couldn't load the Inbox"
          description="There was a problem reading ideas. Try again shortly."
          testId="ideation-inbox-error"
        />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div data-testid="ideation-inbox-page">
        <HubPageHeader title="Inbox" />
        <EmptyState
          header="Inbox zero"
          description="Nothing is waiting on you. New ideas land here for triage — explore what's already in flight or submit your own."
          primaryAction={
            <Button appearance="primary" onClick={() => navigate(Routes.ideation.submit())}>
              Submit idea
            </Button>
          }
          secondaryAction={
            <Button onClick={() => navigate(Routes.ideation.explore())}>Explore ideas</Button>
          }
          testId="ideation-inbox-empty"
        />
      </div>
    );
  }

  const previewText = selected ? adfToPlainText(selected.problem_statement) : null;

  return (
    <div data-testid="ideation-inbox-page">
      <HubPageHeader title="Inbox" />

      {/* Queue-list-with-counts header — Intercom evidence (05 §C row 1) */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--ds-space-300, 24px)',
          padding: '0 16px 12px',
          font: '400 12px/16px var(--ds-font-family-body, "Atlassian Sans", ui-sans-serif, sans-serif)',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        }}
      >
        {Object.entries(counts).map(([status, count]) => (
          <span key={status}>
            <strong style={{ color: token('color.text', 'var(--ds-text)') }}>{count}</strong>{' '}
            {humanizeStatus(status)}
          </span>
        ))}
      </div>

      {/* 2-pane: queue list + preview. Not 4-pane (Intercom) — sidebar nav
          already covers the queue-nav role (09_DECISIONS.md departure). */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 0, alignItems: 'start' }}>
        <div style={{ minWidth: 0, overflowX: 'auto' }}>
          <JiraTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            onRowClick={(row) => setSelectedId(row.id)}
            density="comfortable"
            showRowCount
          />
        </div>

        <aside
          style={{
            borderLeft: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            padding: '16px',
            minHeight: 240,
            position: 'sticky',
            top: 0,
          }}
          data-testid="ideation-inbox-preview"
        >
          {selected ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)'), font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")' }}>
                  {selected.idea_key}
                </span>
                <StatusLozenge status={selected.workflow_status_key} />
              </div>
              <h2 style={{ font: '600 16px/22px var(--ds-font-family-body, "Atlassian Sans")', color: token('color.text', 'var(--ds-text)'), margin: '0 0 8px' }}>
                {selected.title}
              </h2>
              <ClassBadge ideaClass={selected.idea_class} />
              {previewText && (
                <p style={{ marginTop: 12, color: token('color.text.subtle', 'var(--ds-text-subtle)'), font: '400 13px/20px var(--ds-font-family-body, "Atlassian Sans")' }}>
                  {previewText}
                </p>
              )}
              <div style={{ marginTop: 16 }}>
                <Button appearance="primary" onClick={() => navigate(Routes.ideation.idea(selected.slug))}>
                  Open idea
                </Button>
              </div>
            </>
          ) : (
            <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
              Select an idea to preview it here.
            </span>
          )}
        </aside>
      </div>
    </div>
  );
}
