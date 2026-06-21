import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/new';
import { JiraTable, makeKeyCell } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { Column } from '@/components/shared/JiraTable/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReplayDashboardWidgetProps {
  mode: 'product' | 'project' | 'release';
  projectKey?: string;
  productKey?: string;
}

interface QualifyingBR {
  id: string;
  request_key: string | null;
  title: string;
  process_step: string;
  hop_count: number;
  journey_steps: string[];  // inferred: ordered step values from start to current
  created_at: string;
  updated_at: string;
}

// ─── Status chip ────────────────────────────────────────────────────────────

const STEP_TOKEN: Record<string, { bg: string; color: string }> = {
  'In Requirements':    { bg: 'var(--ds-background-information, #E9F2FF)', color: 'var(--ds-text-information, #0055CC)' },
  'Demand Validation':  { bg: 'var(--ds-background-information, #E9F2FF)', color: 'var(--ds-text-information, #0055CC)' },
  'Prioritized Backlog':{ bg: 'var(--ds-background-warning, #FFF7D6)',     color: 'var(--ds-text-warning, #7F5F01)' },
  'In Development':     { bg: 'var(--ds-background-warning, #FFF7D6)',     color: 'var(--ds-text-warning, #7F5F01)' },
  'Done':               { bg: 'var(--ds-background-success, #DFFCF0)',     color: 'var(--ds-text-success, #006644)' },
  "Won't Do":           { bg: 'var(--ds-background-neutral, #F1F2F4)',     color: 'var(--ds-text-subtle, #44546F)' },
  'Rejected':           { bg: 'var(--ds-background-danger, #FFECEB)',      color: 'var(--ds-text-danger, #AE2A19)' },
};

function BRStatusChip({ status }: { status: string }) {
  const s = STEP_TOKEN[status] ?? { bg: 'var(--ds-background-neutral, #F1F2F4)', color: 'var(--ds-text-subtle, #44546F)' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// ─── Data hook ──────────────────────────────────────────────────────────────

const TERMINAL_STEPS = new Set(["Done", "Rejected", "Won't Do"]);

async function fetchQualifyingBRs(): Promise<QualifyingBR[]> {
  // 1. Load canonical step order, exclude terminal steps
  const { data: steps, error: stepsErr } = await supabase
    .from('demand_process_steps')
    .select('value, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (stepsErr) throw stepsErr;

  const progressSteps = (steps ?? []).filter(s => !TERMINAL_STEPS.has(s.value));
  const progressValues = progressSteps.map(s => s.value);

  // Need at least 3 steps to qualify anything
  if (progressValues.length < 3) return [];

  // 2. Load BRs currently in a progress step (not deleted, not terminal)
  const { data: brs, error: brErr } = await supabase
    .from('business_requests')
    .select('id, request_key, title, process_step, created_at, updated_at')
    .is('deleted_at', null)
    .in('process_step', progressValues)
    .order('updated_at', { ascending: false });
  if (brErr) throw brErr;

  // 3. Filter: must be at position >= 2 (0-indexed) = 3rd step or beyond
  const qualifying: QualifyingBR[] = [];
  for (const br of brs ?? []) {
    const pos = progressValues.indexOf(br.process_step ?? '');
    if (pos < 2) continue;
    qualifying.push({
      id: br.id,
      request_key: br.request_key ?? null,
      title: br.title,
      process_step: br.process_step ?? '',
      hop_count: pos + 1,
      journey_steps: progressValues.slice(0, pos + 1),
      created_at: br.created_at,
      updated_at: br.updated_at,
    });
  }
  return qualifying;
}

function useQualifyingBRs() {
  return useQuery<QualifyingBR[]>({
    queryKey: ['replay-qualifying-brs'],
    queryFn: fetchQualifyingBRs,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Journey detail view ─────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function JourneyView({ br, onBack }: { br: QualifyingBR; onBack: () => void }) {
  return (
    <div>
      {/* Back */}
      <div style={{ marginBottom: 12 }}>
        <Button appearance="link" onClick={onBack}>
          ← Back to list
        </Button>
      </div>

      {/* BR title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <JiraIssueTypeIcon type="Business Request" size={16} />
        {br.request_key && (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-link, #0055CC)' }}>
            {br.request_key}
          </span>
        )}
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
          {br.title}
        </span>
      </div>

      {/* Section header */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 8 }}>
        Status journey · {br.hop_count} steps
      </div>

      {/* Timeline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '2px solid var(--ds-border, #DFE1E6)',
          paddingLeft: 12,
        }}
      >
        {br.journey_steps.map((step, i) => {
          const isFirst = i === 0;
          const isLast = i === br.journey_steps.length - 1;
          const date = isFirst ? fmtDate(br.created_at) : isLast ? fmtDate(br.updated_at) : null;
          return (
            <div
              key={step}
              style={{ position: 'relative', paddingBottom: isLast ? 0 : 12 }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -17,
                  top: 4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isLast
                    ? 'var(--ds-background-information-bold, #0055CC)'
                    : 'var(--ds-border-bold, #758195)',
                  border: '2px solid var(--ds-surface, #FFFFFF)',
                }}
              />
              <BRStatusChip status={step} />
              {date && (
                <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>
                  {isFirst ? `Started ${date}` : `Last updated ${date}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--ds-text-subtlest, #6B778C)',
          marginTop: 12,
          fontStyle: 'italic',
        }}
      >
        Journey inferred from current step — exact transition dates appear as activity is recorded.
      </div>

      {/* Play Replay CTA */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
        <Button
          appearance="primary"
          iconBefore={<span style={{ fontSize: 10 }}>▶</span>}
        >
          Play Replay
        </Button>
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
          Full lifecycle theatre — coming next
        </span>
      </div>
    </div>
  );
}

// ─── Widget ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

export function ReplayDashboardWidget({ mode }: ReplayDashboardWidgetProps) {
  const { data: brs = [], isLoading, error } = useQualifyingBRs();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<QualifyingBR | null>(null);

  const totalPages = Math.ceil(brs.length / PAGE_SIZE);
  const pageData = useMemo(() => brs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [brs, page]);

  const columns = useMemo<Column<QualifyingBR>[]>(() => {
    const keyRenderer = makeKeyCell(
      (row: QualifyingBR) => row.request_key ?? row.id.slice(0, 8),
      (row: QualifyingBR) => setSelected(row),
      undefined,
      (_row: QualifyingBR) => <JiraIssueTypeIcon type="Business Request" size={14} />,
    );

    return [
      {
        id: 'key',
        label: 'Summary',
        flex: true,
        alwaysVisible: true,
        accessor: (row) => row.request_key ?? row.id,
        cell: (props) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, width: '100%' }}>
            {keyRenderer(props)}
            <span
              style={{
                fontSize: 13,
                color: 'var(--ds-text, #172B4D)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
            >
              {props.row.title}
            </span>
          </span>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 20,
        accessor: (row) => row.process_step,
        cell: ({ row }) => <BRStatusChip status={row.process_step} />,
      },
      {
        id: '__replay',
        label: '',
        width: 8,
        align: 'end',
        cell: ({ row }) => (
          <button
            className="replay-br-cta"
            onClick={(e) => { e.stopPropagation(); setSelected(row); }}
            style={{
              opacity: 0,
              transition: 'opacity 0.15s',
              background: 'var(--ds-background-brand-bold, #0055CC)',
              color: 'var(--ds-text-inverse, #FFFFFF)',
              border: 'none',
              borderRadius: 3,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ▶ Replay
          </button>
        ),
      },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selected) {
    return <JourneyView br={selected} onBack={() => setSelected(null)} />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ds-text-danger, #AE2A19)', padding: '8px 0' }}>
        Failed to load qualifying business requests.
      </div>
    );
  }

  if (!brs.length) {
    return (
      <div
        style={{
          fontSize: 13,
          color: 'var(--ds-text-subtlest, #6B778C)',
          padding: '16px 0',
          textAlign: 'center',
        }}
      >
        No business requests have advanced to Prioritized Backlog or beyond.
      </div>
    );
  }

  return (
    <>
      <style>{`
        .replay-widget-table tr:hover .replay-br-cta {
          opacity: 1 !important;
        }
      `}</style>

      <div className="replay-widget-table">
        <JiraTable<QualifyingBR>
          columns={columns}
          data={pageData}
          getRowId={(row) => row.id}
          onRowClick={(row) => setSelected(row)}
          density="compact"
          showRowCount={false}
        />
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 8,
            fontSize: 12,
            color: 'var(--ds-text-subtlest, #6B778C)',
          }}
        >
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: page === 0 ? 'default' : 'pointer',
              color: page === 0 ? 'var(--ds-text-disabled, #8590A2)' : 'var(--ds-link, #0055CC)',
              fontSize: 12,
              padding: 0,
            }}
          >
            ← Prev
          </button>
          <span>{page + 1} of {totalPages} · {brs.length} qualifying BRs</span>
          <button
            disabled={page === totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: page === totalPages - 1 ? 'default' : 'pointer',
              color: page === totalPages - 1 ? 'var(--ds-text-disabled, #8590A2)' : 'var(--ds-link, #0055CC)',
              fontSize: 12,
              padding: 0,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
