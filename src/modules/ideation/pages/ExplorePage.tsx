/**
 * Ideation · Explore — browse/search all ideas.
 *
 * Phase 2 S4: real list — filter-chip row (Status + Class) + search +
 * JiraTable, reading every idn_ideas row (not just the Inbox triage subset).
 * Structure adopted from Mobbin evidence 05 §C row 2 (Deel People table:
 * filter-chip row above table; Dovetail: chips-in-cells = our Lozenges).
 * Phase 2 S2: hosts the ?create=idea deep link (D6) via CreateIdeaModal.
 */

import { useMemo, useState } from 'react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/core/search';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';
import { CreateIdeaModal } from '@/modules/ideation/components/CreateIdeaModal';
import { useCreateIdeaParam } from '@/modules/ideation/hooks/useCreateIdeaParam';
import { JiraTable, makeKeyCell, type Column } from '@/components/shared/JiraTable';
import { StatusLozenge, humanizeStatus } from '@/components/shared/StatusLozenge/StatusLozenge';
import { useIdeationExplore } from '@/hooks/useIdeationExplore';
import type { IdeaClass, IdeaRow, IdeaStatusKey } from '@/modules/ideation/types';

const ALL_STATUSES: IdeaStatusKey[] = [
  'draft', 'submitted', 'screening', 'evaluation', 'approved', 'declined', 'parked', 'merged', 'converted', 'delivered',
];
const ALL_CLASSES: IdeaClass[] = ['problem', 'opportunity', 'improvement'];

const CLASS_LABEL: Record<IdeaClass, string> = {
  problem: 'Problem',
  opportunity: 'Opportunity',
  improvement: 'Improvement',
};

function ClassBadge({ ideaClass }: { ideaClass: IdeaClass }) {
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

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        font: '500 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
        padding: '4px 10px',
        borderRadius: 'var(--ds-border-radius-100, 12px)',
        border: `1px solid ${active ? 'transparent' : token('color.border', 'var(--ds-border)')}`,
        background: active ? token('color.background.selected', 'var(--ds-background-selected)') : token('color.background.neutral', 'var(--ds-background-neutral)'),
        color: active ? token('color.text.selected', 'var(--ds-text-selected)') : token('color.text.subtle', 'var(--ds-text-subtle)'),
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const createModal = useCreateIdeaParam();
  const { data: rows, isLoading, isError } = useIdeationExplore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<IdeaStatusKey>>(new Set());
  const [classFilter, setClassFilter] = useState<Set<IdeaClass>>(new Set());

  const presentStatuses = useMemo(
    () => ALL_STATUSES.filter((s) => (rows ?? []).some((r) => r.workflow_status_key === s)),
    [rows]
  );
  const presentClasses = useMemo(
    () => ALL_CLASSES.filter((c) => (rows ?? []).some((r) => r.idea_class === c)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (statusFilter.size > 0 && !statusFilter.has(r.workflow_status_key)) return false;
      if (classFilter.size > 0 && !classFilter.has(r.idea_class)) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.idea_key.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, statusFilter, classFilter]);

  const toggleStatus = (s: IdeaStatusKey) =>
    setStatusFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  const toggleClass = (c: IdeaClass) =>
    setClassFilter((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  const columns: Column<IdeaRow>[] = useMemo(
    () => [
      { id: 'key', label: 'Key', width: 7, cell: makeKeyCell((row) => row.idea_key) },
      { id: 'class', label: 'Class', width: 11, cell: ({ row }) => <ClassBadge ideaClass={row.idea_class} /> },
      {
        id: 'title',
        label: 'Summary',
        width: 42,
        cell: ({ row }) => <span style={{ color: token('color.text', 'var(--ds-text)') }}>{row.title}</span>,
      },
      { id: 'status', label: 'Status', width: 12, cell: ({ row }) => <StatusLozenge status={row.workflow_status_key} /> },
    ],
    []
  );

  if (isLoading) {
    return (
      <div data-testid="ideation-explore-page" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="ideation-explore-page">
        <HubPageHeader title="Explore" />
        <EmptyState header="Couldn't load ideas" description="There was a problem reading ideas. Try again shortly." testId="ideation-explore-error" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div data-testid="ideation-explore-page">
        <HubPageHeader title="Explore" />
        <EmptyState
          header="No ideas yet"
          description="Every idea submitted to the organization shows up here. Be the first — capture the problem, and reviewers take it from there."
          primaryAction={
            <Button appearance="primary" onClick={createModal.open}>
              Submit idea
            </Button>
          }
          secondaryAction={<Button onClick={() => navigate(Routes.ideation.inbox())}>Back to Inbox</Button>}
          testId="ideation-explore-empty"
        />
        <CreateIdeaModal isOpen={createModal.isOpen} onClose={createModal.close} />
      </div>
    );
  }

  return (
    <div data-testid="ideation-explore-page">
      <HubPageHeader title="Explore" />

      <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ maxWidth: 320 }}>
          <Textfield
            elemBefore={<SearchIcon label="" color="currentColor" />}
            placeholder="Search ideas…"
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            testId="ideation-explore-search"
          />
        </div>

        {/* Filter-chip row — Deel evidence (05 §C row 2) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {presentStatuses.map((s) => (
            <FilterChip key={s} label={humanizeStatus(s)} active={statusFilter.has(s)} onClick={() => toggleStatus(s)} />
          ))}
          {presentStatuses.length > 0 && presentClasses.length > 0 && (
            <span style={{ width: 1, background: token('color.border', 'var(--ds-border)'), margin: '0 2px' }} />
          )}
          {presentClasses.map((c) => (
            <FilterChip key={c} label={CLASS_LABEL[c]} active={classFilter.has(c)} onClick={() => toggleClass(c)} />
          ))}
        </div>
      </div>

      <JiraTable
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(Routes.ideation.idea(row.slug))}
        density="comfortable"
        showRowCount
        totalRowCount={rows.length}
      />

      <CreateIdeaModal isOpen={createModal.isOpen} onClose={createModal.close} />
    </div>
  );
}
