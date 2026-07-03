/**
 * ApprovalAgeBody — pending/decided approval ages (registry: approval-age).
 * Feature: CAT-REPORTS-HUB-20260703-001 gap closure S2.3.
 * Sources: tm_plan_approvals + tm_release_signoffs (native requested_at/decided_at).
 */
import { useMemo } from 'react';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { Heading } from '@/components/ads';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { useApprovalAge, type ApprovalAgeRow } from '@/components/testhub/reports/hooks/useApprovalAge';
import ReportInsightCard from '@/components/testhub/reports/ReportInsightCard';
import ReportExportMenu from '@/components/testhub/reports/ReportExportMenu';
import type { ExportColumn, ExportRow } from '@/components/testhub/reports/reportExportRows';
import { cardStyle, metricValue, metricLabel, sectionH } from '@/pages/testhub/reports/ReportStatusView';

// tm_plan_approvals.status: pending/approved/rejected · tm_release_signoffs.decision: pending/approve/reject/abstain
function statusAppearance(s: string): ThemeAppearance {
  switch (s.toLowerCase()) {
    case 'approved':
    case 'approve': return 'success';
    case 'rejected':
    case 'reject': return 'removed';
    case 'pending': return 'inprogress';
    default: return 'default';
  }
}

export function ApprovalAgeBody() {
  const { data, isLoading } = useApprovalAge();

  const cols: Column<ApprovalAgeRow>[] = [
    { id: 'kind', label: 'Type', width: 14, sortable: true, cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{row.kind}</span> },
    { id: 'subject', label: 'Subject', flex: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{row.subject}</span> },
    { id: 'status', label: 'Status', width: 12, cell: ({ row }) => <Lozenge appearance={statusAppearance(row.status)}>{row.status}</Lozenge> },
    {
      id: 'requestedAt', label: 'Requested', width: 12,
      cell: ({ row }) => row.requestedAt
        ? <span style={{ color: 'var(--ds-text-subtle)' }}>{row.requestedAt.slice(0, 10)}</span>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'ageDays', label: 'Age (days)', width: 10, align: 'center', sortable: true,
      cell: ({ row }) => row.ageDays === null
        ? <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
        : <span style={{ color: !row.decidedAt && row.ageDays > 7 ? 'var(--ds-text-danger)' : 'var(--ds-text)' }}>{row.ageDays}</span>,
    },
  ];

  const exportColumns: ExportColumn[] = [
    { key: 'kind', header: 'Type' },
    { key: 'subject', header: 'Subject' },
    { key: 'status', header: 'Status' },
    { key: 'requestedAt', header: 'Requested' },
    { key: 'decidedAt', header: 'Decided' },
    { key: 'ageDays', header: 'Age (days)' },
  ];
  const exportRows = useMemo<ExportRow[]>(
    () => (data ? data.rows.map((r) => ({
      kind: r.kind, subject: r.subject, status: r.status,
      requestedAt: r.requestedAt?.slice(0, 10) ?? null,
      decidedAt: r.decidedAt?.slice(0, 10) ?? null,
      ageDays: r.ageDays,
    })) : []),
    [data],
  );

  const aggregates = useMemo<Record<string, unknown> | null>(() => {
    if (!data) return null;
    return {
      report_id: 'approval-age',
      pending: data.pending,
      decided: data.decided,
      avg_decision_days: data.avgDecisionDays,
      oldest_pending_days: data.oldestPendingDays,
    };
  }, [data]);

  return (
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
      {isLoading || !data ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
          <Spinner size="medium" /> Loading approvals…
        </div>
      ) : data.rows.length === 0 ? (
        <EmptyState
          header="No approvals or signoffs"
          description="No test-plan approvals or release signoffs have been requested yet."
        />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--ds-space-100)' }}>
            <ReportExportMenu
              reportId="approval-age"
              reportLabel="Approval Age"
              columns={exportColumns}
              rows={exportRows}
            />
          </div>
          <ReportInsightCard
            reportId="approval-age"
            reportLabel="Approval Age"
            computed={aggregates}
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={{ ...metricValue, color: data.pending ? 'var(--ds-text-warning)' : 'var(--ds-text)' }}>{data.pending}</div>
              <div style={metricLabel}>Pending</div>
            </div>
            <div style={cardStyle}>
              <div style={metricValue}>{data.decided}</div>
              <div style={metricLabel}>Decided</div>
            </div>
            <div style={cardStyle}>
              <div style={metricValue}>{data.avgDecisionDays ?? '—'}</div>
              <div style={metricLabel}>Avg days to decision</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...metricValue, color: (data.oldestPendingDays ?? 0) > 7 ? 'var(--ds-text-danger)' : 'var(--ds-text)' }}>
                {data.oldestPendingDays ?? '—'}
              </div>
              <div style={metricLabel}>Oldest pending (days)</div>
            </div>
          </div>

          <div style={sectionH}><Heading size="small">Approvals and signoffs</Heading></div>
          <JiraTable<ApprovalAgeRow>
            columns={cols}
            data={data.rows}
            getRowId={(r) => r.id}
            isLoading={false}
            ariaLabel="Approval age"
            emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No approvals.</div>}
          />
        </>
      )}
    </div>
  );
}

export default ApprovalAgeBody;
