import { formatDistanceToNow } from 'date-fns';
import {
  EmptyState,
  Heading,
  Lozenge,
  SectionMessage,
  type LozengeAppearance,
} from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { ARTIFACT_TYPE_LABELS } from './artifactTypes';
import type { DocintelArtifact, DocintelDocument } from '../types';

const MAX_ITEMS_PER_SECTION = 4;

export interface DocintelRecentWorkProps {
  /** Recent source records in display order; the caller owns recency sorting. */
  sources: readonly DocintelDocument[];
  /** Recent generated deliverables in display order; never analysis placeholders. */
  deliverables: readonly DocintelArtifact[];
  isLoading?: boolean;
  error?: Error | null;
  onOpenSource: (source: DocintelDocument) => void;
  onOpenDeliverable: (deliverable: DocintelArtifact) => void;
}

function statusAppearance(status: string): LozengeAppearance {
  switch (status) {
    case 'ready':
    case 'approved':
    case 'promoted':
      return 'success';
    case 'failed':
    case 'rejected':
      return 'removed';
    case 'needs_review':
      return 'moved';
    case 'queued':
    case 'draft':
      return 'default';
    default:
      return 'inprogress';
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return `Updated ${formatDistanceToNow(date, { addSuffix: true })}`;
}

interface RecentWorkRow {
  id: string;
  kind: 'source' | 'deliverable';
  title: string;
  typeLabel: string;
  status: string;
  updatedAt: string;
  source?: DocintelDocument;
  deliverable?: DocintelArtifact;
}

const columns: Column<RecentWorkRow>[] = [
  {
    id: 'title',
    label: 'Item',
    flex: true,
    alwaysVisible: true,
    cell: ({ row }) => <span>{row.title}</span>,
  },
  {
    id: 'type',
    label: 'Type',
    width: 18,
    cell: ({ row }) => <span>{row.typeLabel}</span>,
  },
  {
    id: 'status',
    label: 'Status',
    width: 16,
    cell: ({ row }) => (
      <Lozenge appearance={statusAppearance(row.status)}>
        {statusLabel(row.status)}
      </Lozenge>
    ),
  },
  {
    id: 'updated',
    label: 'Updated',
    width: 22,
    cell: ({ row }) => <span>{relativeTime(row.updatedAt)}</span>,
  },
];

export function DocintelRecentWork({
  sources,
  deliverables,
  isLoading = false,
  error = null,
  onOpenSource,
  onOpenDeliverable,
}: DocintelRecentWorkProps) {
  const rows: RecentWorkRow[] = [
    ...sources.slice(0, MAX_ITEMS_PER_SECTION).map((source) => ({
      id: `source:${source.id}`,
      kind: 'source' as const,
      title: source.title,
      typeLabel: 'Source',
      status: source.status,
      updatedAt: source.updated_at,
      source,
    })),
    ...deliverables.slice(0, MAX_ITEMS_PER_SECTION).map((deliverable) => ({
      id: `deliverable:${deliverable.id}`,
      kind: 'deliverable' as const,
      title: deliverable.title?.trim()
        || ARTIFACT_TYPE_LABELS[deliverable.artifact_type]
        || deliverable.artifact_type,
      typeLabel: ARTIFACT_TYPE_LABELS[deliverable.artifact_type]
        ?? deliverable.artifact_type,
      status: String(deliverable.status),
      updatedAt: deliverable.created_at,
      deliverable,
    })),
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-space-100)' }}>
      <Heading size="medium" as="h2">Recent work</Heading>
      {error ? (
        <SectionMessage appearance="error" title="Could not load recent work">
          {error.message || 'Please try again.'}
        </SectionMessage>
      ) : rows.length === 0 && !isLoading ? (
        <EmptyState
          size="compact"
          header="No recent work yet"
          description="Sources you open and deliverables you create will appear here."
        />
      ) : (
        <JiraTable<RecentWorkRow>
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          onRowClick={(row) => {
            if (row.kind === 'source' && row.source) onOpenSource(row.source);
            if (row.kind === 'deliverable' && row.deliverable) {
              onOpenDeliverable(row.deliverable);
            }
          }}
          isLoading={isLoading}
          showRowCount={false}
          rowsPerPage={MAX_ITEMS_PER_SECTION * 2}
          ariaLabel="Recent sources and deliverables"
        />
      )}
    </div>
  );
}

export default DocintelRecentWork;
