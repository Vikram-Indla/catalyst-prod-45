/**
 * Ideation · Explore — browse/search/filter all ideas (design 04 §C.2).
 *
 * Phase 2 S4: real "anyone finds any idea" surface. JiraTable (full density)
 * + search + Stage/Class filters + CSV export, reading live idn_ideas via
 * useIdeationExplore (D16: drafts excluded at the query layer). Row click
 * navigates to the Detail page (S3, already live). Mobbin evidence 05 §C
 * row 2 (Deel/Dovetail): filter-chip row above table + semantic Lozenge
 * chips in cells, no rainbow palette.
 *
 * Non-scope (03_PLAN_LOCK_PHASE2_S4_EXPLORE.md): Score/Votes/Owner columns,
 * Strategy filter, bulk actions, server-side pagination, saved-filter chips
 * — all need joins/permissions not yet built. Client-side filter/sort/CSV
 * only, matching every other "explore all" list page in this codebase.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/glyph/search';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import DownloadIcon from '@atlaskit/icon/glyph/download';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { formatDistanceToNowStrict } from 'date-fns';

import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';
import { JiraTable, makeKeyCell, type Column, type SortOrder } from '@/components/shared/JiraTable';
import { StatusLozenge, humanizeStatus } from '@/components/shared/StatusLozenge/StatusLozenge';
import { exportToCsv } from '@/utils/exports';
import { useIdeationExplore } from '@/hooks/useIdeationExplore';
import { CreateIdeaModal } from '@/modules/ideation/components/CreateIdeaModal';
import { useCreateIdeaParam } from '@/modules/ideation/hooks/useCreateIdeaParam';
import type { IdeaRow } from '@/modules/ideation/types';

const CLASS_LABEL: Record<IdeaRow['idea_class'], string> = {
  problem: 'Problem',
  opportunity: 'Opportunity',
  improvement: 'Improvement',
};

// Sentence-case label, no text-transform — audit gate flags new
// uppercase-transform instances (design-governance typography rule).
function ClassBadge({ ideaClass }: { ideaClass: IdeaRow['idea_class'] }) {
  return (
    <span
      style={{
        font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans", ui-sans-serif, sans-serif)',
        color: token('color.text.subtle', 'var(--ds-text-subtle)'),
      }}
    >
      {CLASS_LABEL[ideaClass]}
    </span>
  );
}

interface SelectOption {
  label: string;
  value: string;
}

// D16 already excludes 'draft' at the query layer — Stage filter options
// mirror the statuses Explore can actually contain (no approved/declined/
// parked/merged/converted/delivered rows exist yet, but the filter should
// not silently hide them once they do).
const STAGE_OPTIONS: SelectOption[] = [
  { label: 'Any stage', value: '' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Screening', value: 'screening' },
  { label: 'Evaluation', value: 'evaluation' },
  { label: 'Approved', value: 'approved' },
  { label: 'Declined', value: 'declined' },
  { label: 'Parked', value: 'parked' },
  { label: 'Merged', value: 'merged' },
  { label: 'Converted', value: 'converted' },
  { label: 'Delivered', value: 'delivered' },
];

const CLASS_OPTIONS: SelectOption[] = [
  { label: 'Any class', value: '' },
  { label: 'Problem', value: 'problem' },
  { label: 'Opportunity', value: 'opportunity' },
  { label: 'Improvement', value: 'improvement' },
];

const CSV_COLUMNS = [
  { key: 'idea_key' as const, header: 'Key' },
  { key: 'title' as const, header: 'Title' },
  { key: 'idea_class' as const, header: 'Class', formatter: (v: string) => CLASS_LABEL[v as IdeaRow['idea_class']] ?? v },
  { key: 'workflow_status_key' as const, header: 'Stage', formatter: (v: string) => humanizeStatus(v) },
  { key: 'created_at' as const, header: 'Created' },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const createModal = useCreateIdeaParam();
  const { data: rows, isLoading, isError } = useIdeationExplore();

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [ideaClass, setIdeaClass] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    let result = rows.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q)) return false;
      if (stage && r.workflow_status_key !== stage) return false;
      if (ideaClass && r.idea_class !== ideaClass) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      const dir = sortOrder === 'ASC' ? 1 : -1;
      const av = (a as unknown as Record<string, string>)[sortKey] ?? '';
      const bv = (b as unknown as Record<string, string>)[sortKey] ?? '';
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return result;
  }, [rows, search, stage, ideaClass, sortKey, sortOrder]);

  const hasAnyRows = (rows?.length ?? 0) > 0;
  const hasFiltersApplied = !!search || !!stage || !!ideaClass;

  const columns: Column<IdeaRow>[] = useMemo(
    () => [
      {
        id: 'idea_key',
        label: 'Key',
        width: 10,
        sortable: true,
        cell: makeKeyCell((row) => row.idea_key),
      },
      {
        id: 'title',
        label: 'Title',
        width: 38,
        flex: true,
        sortable: true,
        cell: ({ row }) => <span style={{ color: token('color.text', 'var(--ds-text)') }}>{row.title}</span>,
      },
      {
        id: 'idea_class',
        label: 'Class',
        width: 13,
        sortable: true,
        cell: ({ row }) => <ClassBadge ideaClass={row.idea_class} />,
      },
      {
        id: 'workflow_status_key',
        label: 'Stage',
        width: 13,
        sortable: true,
        cell: ({ row }) => <StatusLozenge status={row.workflow_status_key} />,
      },
      {
        id: 'created_at',
        label: 'Age',
        width: 12,
        sortable: true,
        cell: ({ row }) => (
          <span style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
            {formatDistanceToNowStrict(new Date(row.created_at), { addSuffix: true })}
          </span>
        ),
      },
    ],
    []
  );

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportToCsv(filtered, CSV_COLUMNS, { filename: 'ideation-explore' });
  };

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
        <EmptyState
          header="Couldn't load Explore"
          description="There was a problem reading ideas. Try again shortly."
          testId="ideation-explore-error"
        />
      </div>
    );
  }

  if (!hasAnyRows) {
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
          secondaryAction={
            <Button onClick={() => navigate(Routes.ideation.inbox())}>Back to Inbox</Button>
          }
          testId="ideation-explore-empty"
        />
        <CreateIdeaModal isOpen={createModal.isOpen} onClose={createModal.close} />
      </div>
    );
  }

  return (
    <div data-testid="ideation-explore-page">
      <HubPageHeader title="Explore" />

      {/* Filter row — search + Stage + Class + CSV export (04 §C.2 header) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 12px' }}>
        <div style={{ width: 240 }}>
          <Textfield
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search ideas..."
            aria-label="Search ideas"
            testId="idea-explore-search"
            elemBeforeInput={
              <span style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: 8, color: token('color.text.subtle') }}>
                <SearchIcon label="" size="small" />
              </span>
            }
            elemAfterInput={
              search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', paddingRight: 8, color: token('color.text.subtle') }}
                >
                  <CrossIcon label="" size="small" />
                </button>
              ) : undefined
            }
          />
        </div>
        <div style={{ width: 180 }}>
          <Select<SelectOption>
            inputId="idea-explore-stage"
            options={STAGE_OPTIONS}
            value={STAGE_OPTIONS.find((o) => o.value === stage)}
            onChange={(opt) => setStage((opt as SelectOption | null)?.value ?? '')}
            isSearchable={false}
            spacing="compact"
            aria-label="Filter by stage"
          />
        </div>
        <div style={{ width: 170 }}>
          <Select<SelectOption>
            inputId="idea-explore-class"
            options={CLASS_OPTIONS}
            value={CLASS_OPTIONS.find((o) => o.value === ideaClass)}
            onChange={(opt) => setIdeaClass((opt as SelectOption | null)?.value ?? '')}
            isSearchable={false}
            spacing="compact"
            aria-label="Filter by class"
          />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            iconBefore={(p) => <DownloadIcon {...p} label="" />}
            onClick={handleExport}
            isDisabled={filtered.length === 0}
            testId="idea-explore-export"
          >
            CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          header="No ideas match"
          description="Clear filters to see everything, or try a different search term."
          primaryAction={
            hasFiltersApplied ? (
              <Button
                onClick={() => {
                  setSearch('');
                  setStage('');
                  setIdeaClass('');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
          testId="ideation-explore-no-results"
        />
      ) : (
        <JiraTable
          columns={columns}
          data={filtered}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(Routes.ideation.idea(row.slug))}
          density="comfortable"
          showRowCount
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
        />
      )}

      <CreateIdeaModal isOpen={createModal.isOpen} onClose={createModal.close} />
    </div>
  );
}
