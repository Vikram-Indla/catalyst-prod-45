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
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import {
  makeKeyCell,
  makeDateCell,
  makePriorityCell,
  type LozengeAppearance,
} from '@/components/shared/JiraTable';
import Select from '@atlaskit/select';
import { useBusinessRequests, useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import type { BusinessRequest } from '@/types/business-request';
import type { RowGroup } from '@/components/shared/JiraTable/types';

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

// ─── Group By ─────────────────────────────────────────────────────────────────

type GroupByField = 'none' | 'process_step' | 'request_type' | 'category' | 'urgency';

const GROUP_BY_OPTIONS: { label: string; value: GroupByField }[] = [
  { label: 'None',     value: 'none'         },
  { label: 'Status',   value: 'process_step' },
  { label: 'Type',     value: 'request_type' },
  { label: 'Category', value: 'category'     },
  { label: 'Priority', value: 'urgency'      },
];

function buildGroups(
  requests: BusinessRequest[],
  field: Exclude<GroupByField, 'none'>,
): RowGroup<BusinessRequest>[] {
  const buckets = new Map<string, BusinessRequest[]>();
  for (const r of requests) {
    const raw = (r[field as keyof BusinessRequest] as string | null) ?? '';
    const key = raw || '(none)';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }

  return Array.from(buckets.entries()).map(([key, rows]) => {
    const label = key === '(none)'
      ? 'No ' + GROUP_BY_OPTIONS.find((o) => o.value === field)?.label.toLowerCase()
      : field === 'process_step'
        ? formatStep(key)
        : field === 'request_type'
          ? TYPE_LABEL[key.toLowerCase()] ?? key
          : key;

    const labelNode = field === 'process_step' ? (
      <Lozenge appearance={stepAppearance(key)}>{label}</Lozenge>
    ) : undefined;

    return { id: key, label, rows, labelNode };
  });
}

// ─── Inline create defaults ───────────────────────────────────────────────────
const INLINE_DEFAULTS = {
  platform:   'Other',
  complexity: 'Medium',
  urgency:    'Normal',
} as const;

const MIN_TITLE_LENGTH = 5;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BRBacklogPage() {
  const { key } = useParams<{ key: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const openDetail = useGlobalSearchStore((s) => s.openDetail);

  const { data: requests = [], isLoading } = useBusinessRequests();
  const createMutation = useCreateBusinessRequest();
  const [groupBy, setGroupBy] = useState<GroupByField>('none');

  const groups = useMemo<RowGroup<BusinessRequest>[] | undefined>(() => {
    if (groupBy === 'none') return undefined;
    return buildGroups(requests, groupBy);
  }, [requests, groupBy]);

  // Inline create state
  const [isCreating, setIsCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-open inline create when ?create=true is in the URL (C19 handshake)
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreating(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Focus input when inline create opens
  useEffect(() => {
    if (isCreating) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCreating]);

  const handleStartCreate = useCallback(() => {
    setDraftTitle('');
    setCreateError(null);
    setIsCreating(true);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setDraftTitle('');
    setCreateError(null);
  }, []);

  const handleSubmitCreate = useCallback(async () => {
    const trimmed = draftTitle.trim();
    if (trimmed.length < MIN_TITLE_LENGTH) {
      setCreateError(`Title must be at least ${MIN_TITLE_LENGTH} characters`);
      return;
    }
    setCreateError(null);
    try {
      await createMutation.mutateAsync({
        title: trimmed,
        ...INLINE_DEFAULTS,
      });
      setDraftTitle('');
      setIsCreating(false);
    } catch {
      setCreateError('Failed to create request');
    }
  }, [draftTitle, createMutation]);

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
        {requests.length === 0 && !isCreating ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 200, flexDirection: 'column', gap: 8,
            color: token('color.text.subtlest', '#8590A2'),
            fontFamily: 'var(--cp-font-body)',
          }}>
            <span style={{ fontSize: 14 }}>No business requests yet</span>
            <button
              onClick={handleStartCreate}
              style={{
                fontSize: 13, fontWeight: 500,
                color: token('color.link', '#0052CC'),
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--cp-font-body)', padding: 0,
              }}
            >
              + Create the first request
            </button>
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

      {/* Inline create row */}
      {isCreating ? (
        <div style={{
          borderTop: `1px solid ${token('color.border', 'var(--cp-border-neutral, #DFE1E6)')}`,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: token('color.background.selected', '#E9F2FE'),
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <Textfield
              ref={inputRef}
              value={draftTitle}
              onChange={(e) => {
                setDraftTitle((e.target as HTMLInputElement).value);
                setCreateError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { void handleSubmitCreate(); }
                if (e.key === 'Escape') { handleCancelCreate(); }
              }}
              placeholder="What needs to be done?"
              isInvalid={!!createError}
            />
            {createError && (
              <div style={{
                fontSize: 11, color: token('color.text.danger', '#AE2A19'),
                marginTop: 2, fontFamily: 'var(--cp-font-body)',
              }}>
                {createError}
              </div>
            )}
          </div>
          <Button
            appearance="primary"
            onClick={() => { void handleSubmitCreate(); }}
            isDisabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </Button>
          <Button appearance="subtle" onClick={handleCancelCreate}>
            Cancel
          </Button>
        </div>
      ) : (
        <button
          onClick={handleStartCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%', padding: '8px 16px',
            border: 'none', borderTop: `1px solid ${token('color.border', 'var(--cp-border-neutral, #DFE1E6)')}`,
            background: 'transparent', cursor: 'pointer', textAlign: 'left',
            fontSize: 13, fontWeight: 400,
            color: token('color.text.subtlest', '#8590A2'),
            fontFamily: 'var(--cp-font-body)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)');
            e.currentTarget.style.color = token('color.text', '#292A2E');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = token('color.text.subtlest', '#8590A2');
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Create request
        </button>
      )}
    </div>
  );
}
