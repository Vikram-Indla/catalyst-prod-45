/**
 * BRBacklogPage — /product-hub/:key/business-requests
 *
 * JiraTable-based listing of Business Requests.
 * Replaces the custom RequestTable used in RequestListingPage with the
 * canonical JiraTable surface — correct column set, ADS-compliant cells,
 * keyboard nav, column picker.
 *
 * Data: business_requests table via useBusinessRequests().
 * Columns: request_key · title · type · category · status · priority · target date.
 *
 * C13 (table component) + C14 (BR column set) from the Product branch gap report.
 */
import React, { useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import {
  makeKeyCell,
  makeDateCell,
  makePriorityCell,
  type LozengeAppearance,
} from '@/components/shared/JiraTable';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import type { BusinessRequest } from '@/types/business-request';

// ─── Status appearance map ────────────────────────────────────────────────────

const STEP_TO_APPEARANCE: Record<string, LozengeAppearance> = {
  new_request:          'default',
  new_demand:           'default',
  funnel:               'default',
  in_review:            'inprogress',
  analyse:              'inprogress',
  implement:            'inprogress',
  approved:             'moved',
  ready_to_implement:   'moved',
  closed:               'success',
  rejected:             'removed',
  on_hold:              'moved',
};

function stepAppearance(step: string | null): LozengeAppearance {
  return STEP_TO_APPEARANCE[(step ?? '').toLowerCase()] ?? 'default';
}

function formatStep(step: string | null): string {
  if (!step) return '—';
  return step.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

// ─── Type badge cell ──────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  feature:      'Feature',
  gap:          'Business gap',
  integration:  'Integration',
  data_request: 'Data request',
};

function TypeCell({ row }: { row: BusinessRequest }) {
  const label = TYPE_LABEL[(row.request_type ?? '').toLowerCase()] ?? row.request_type ?? '—';
  return (
    <span style={{
      fontSize: 12,
      fontWeight: 500,
      color: token('color.text.subtle', '#42526E'),
      fontFamily: 'var(--cp-font-body)',
    }}>
      {label}
    </span>
  );
}

function CategoryCell({ row }: { row: BusinessRequest }) {
  return (
    <span style={{
      fontSize: 12,
      fontWeight: 400,
      color: token('color.text.subtle', '#42526E'),
      fontFamily: 'var(--cp-font-body)',
    }}>
      {row.category ?? '—'}
    </span>
  );
}

function StatusCell({ row }: { row: BusinessRequest }) {
  return (
    <Lozenge appearance={stepAppearance(row.process_step)}>
      {formatStep(row.process_step)}
    </Lozenge>
  );
}

// ─── Priority mapping: BR uses 'urgency' (High/Normal/Low) ────────────────────
// makePriorityCell reads lowercase; 'normal' maps to 'medium' in PRIORITY_ORDER.

function normalisePriority(urgency: string | null): string {
  const u = (urgency ?? '').toLowerCase();
  if (u === 'normal') return 'medium';
  return u;
}

// ─── Column definitions ───────────────────────────────────────────────────────

function buildColumns(
  onOpen: (row: BusinessRequest) => void,
): Column<BusinessRequest>[] {
  return [
    {
      id: 'key',
      label: 'Key',
      width: 10,
      alwaysVisible: true,
      defaultVisible: true,
      sortable: true,
      cell: makeKeyCell(
        (r: BusinessRequest) => r.request_key,
        (r: BusinessRequest) => onOpen(r),
      ),
    },
    {
      id: 'title',
      label: 'Title',
      flex: true,
      alwaysVisible: true,
      defaultVisible: true,
      sortable: true,
      accessor: (r: BusinessRequest) => r.title,
      cell: ({ row }: { row: BusinessRequest }) => (
        <span
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: token('color.text', '#292A2E'),
            fontFamily: 'var(--cp-font-body)',
            cursor: 'pointer',
          }}
          onClick={() => onOpen(row)}
        >
          {row.title ?? '—'}
        </span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      defaultVisible: true,
      sortable: true,
      accessor: (r: BusinessRequest) => r.process_step,
      cell: StatusCell,
    },
    {
      id: 'type',
      label: 'Type',
      width: 10,
      defaultVisible: true,
      sortable: true,
      accessor: (r: BusinessRequest) => r.request_type,
      cell: TypeCell,
    },
    {
      id: 'priority',
      label: 'Priority',
      width: 8,
      defaultVisible: true,
      sortable: true,
      accessor: (r: BusinessRequest) => normalisePriority(r.urgency),
      cell: makePriorityCell((r: BusinessRequest) => normalisePriority(r.urgency)),
    },
    {
      id: 'category',
      label: 'Category',
      width: 12,
      defaultVisible: true,
      sortable: true,
      accessor: (r: BusinessRequest) => r.category,
      cell: CategoryCell,
    },
    {
      id: 'target_date',
      label: 'Target date',
      width: 10,
      defaultVisible: true,
      sortable: true,
      accessor: (r: BusinessRequest) => r.end_date,
      cell: makeDateCell((r: BusinessRequest) => r.end_date ?? null),
    },
    {
      id: 'created',
      label: 'Created',
      width: 10,
      defaultVisible: false,
      sortable: true,
      accessor: (r: BusinessRequest) => r.created_at,
      cell: makeDateCell((r: BusinessRequest) => r.created_at ?? null),
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BRBacklogPage() {
  const { key } = useParams<{ key: string }>();
  const openDetail = useGlobalSearchStore((s) => s.openDetail);

  const { data: requests = [], isLoading } = useBusinessRequests();

  const handleOpen = useCallback(
    (row: BusinessRequest) => {
      openDetail({ id: row.request_key, itemType: 'business_request' });
    },
    [openDetail],
  );

  const columns = useMemo(() => buildColumns(handleOpen), [handleOpen]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 200, gap: 8, color: token('color.text.subtlest', '#8590A2'),
        fontFamily: 'var(--cp-font-body)',
      }}>
        <Spinner size="small" />
        <span>Loading requests…</span>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${token('color.border', 'var(--cp-border-neutral, #DFE1E6)')}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: token('color.text', '#292A2E'),
          fontFamily: 'var(--cp-font-body)',
        }}>
          Business Requests
        </span>
        {key && (
          <span style={{
            fontSize: 12,
            color: token('color.text.subtlest', '#8590A2'),
            fontFamily: 'var(--cp-font-mono)',
          }}>
            {key}
          </span>
        )}
        <span style={{
          marginLeft: 'auto',
          fontSize: 12,
          color: token('color.text.subtlest', '#8590A2'),
          fontFamily: 'var(--cp-font-body)',
        }}>
          {requests.length} requests
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {requests.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 200, flexDirection: 'column', gap: 8,
            color: token('color.text.subtlest', '#8590A2'),
            fontFamily: 'var(--cp-font-body)',
          }}>
            <span style={{ fontSize: 14 }}>No business requests yet</span>
            <span style={{ fontSize: 12 }}>Create a request to get started</span>
          </div>
        ) : (
          <JiraTable
            rows={requests as any[]}
            columns={columns as any}
            rowKey={(r: any) => r.id}
            onRowClick={(r: any) => handleOpen(r as BusinessRequest)}
          />
        )}
      </div>
    </div>
  );
}
