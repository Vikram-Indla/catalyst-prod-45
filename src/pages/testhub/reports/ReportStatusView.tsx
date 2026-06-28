/**
 * ReportStatusView — shared metric ribbon + governance/uncovered tables for the
 * testing-status reports (Project, Sprint, …). Feature CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 * Single home for the ribbon/table styling so each report page stays thin.
 * ADS tokens only; @atlaskit Lozenge owns its color; JiraTable for lists.
 */
import { JiraTable } from '@/components/shared/JiraTable';
import Lozenge from '@atlaskit/lozenge';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { Heading } from '@/components/ads';
import type { Column } from '@/components/shared/JiraTable';
import type { ProjectTestingStatus, MismatchRow, StoryRow } from './useProjectTestingStatus';

interface ReportStatusViewProps {
  data: ProjectTestingStatus;
  insight: string | null;
  onRowOpen: (issueKey: string) => void;
  uncoveredEmpty: string;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)',
  borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-200)', flex: '1 1 14rem',
};
const metricValue: React.CSSProperties = { fontSize: 'var(--ds-font-size-800)', fontWeight: 600, color: 'var(--ds-text)' };
const metricLabel: React.CSSProperties = { fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', marginTop: 'var(--ds-space-050)', textTransform: 'uppercase' };
const sectionH: React.CSSProperties = { margin: 'var(--ds-space-100) 0' };
const subtle: React.CSSProperties = { color: 'var(--ds-text-subtlest)', fontWeight: 400 };

function testStatusAppearance(s: string): ThemeAppearance {
  switch (s) {
    case 'passed': return 'success';
    case 'failed': return 'removed';
    case 'blocked': return 'moved';
    case 'in_progress': return 'inprogress';
    default: return 'default';
  }
}
function categoryAppearance(c: string): ThemeAppearance {
  switch (c) {
    case 'Done': return 'success';
    case 'In Progress': return 'inprogress';
    default: return 'default';
  }
}
function coverageHealth(pct: number): { label: string; appearance: ThemeAppearance } {
  if (pct < 40) return { label: 'At risk', appearance: 'removed' };
  if (pct < 80) return { label: 'Partial', appearance: 'moved' };
  return { label: 'Healthy', appearance: 'success' };
}

export { metricLabel, cardStyle, metricValue, sectionH, subtle };

export function ReportStatusView({ data, insight, onRowOpen, uncoveredEmpty }: ReportStatusViewProps) {
  const health = coverageHealth(data.coveragePct);

  const mismatchColumns: Column<MismatchRow>[] = [
    { id: 'issue_key', label: 'Story', width: 14, sortable: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{row.issue_key}</span> },
    { id: 'summary', label: 'Summary', flex: true, cell: ({ row }) => <span style={{ color: 'var(--ds-text)' }}>{row.summary}</span> },
    { id: 'status', label: 'Delivery status', width: 18, cell: ({ row }) => <Lozenge appearance="success">{row.status}</Lozenge> },
    { id: 'case_key', label: 'Test case', width: 14, cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{row.case_key}</span> },
    { id: 'test_status', label: 'Test result', width: 14, cell: ({ row }) => <Lozenge appearance={testStatusAppearance(row.test_status)}>{row.test_status}</Lozenge> },
  ];
  const uncoveredColumns: Column<StoryRow>[] = [
    { id: 'issue_key', label: 'Story', width: 16, sortable: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{row.issue_key}</span> },
    { id: 'summary', label: 'Summary', flex: true, cell: ({ row }) => <span style={{ color: 'var(--ds-text)' }}>{row.summary}</span> },
    { id: 'status_category', label: 'Status', width: 18, cell: ({ row }) => <Lozenge appearance={categoryAppearance(row.status_category)}>{row.status || row.status_category}</Lozenge> },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={cardStyle}>
          <div style={metricValue}>{data.coveragePct}%</div>
          <div style={metricLabel}>Story coverage</div>
          <div style={{ marginTop: 8 }}><Lozenge appearance={health.appearance}>{health.label}</Lozenge></div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', marginTop: 'var(--ds-space-100)' }}>{data.coveredStories}/{data.totalStories} stories</div>
        </div>
        <div style={cardStyle}>
          <div style={metricValue}>{data.exec.total}</div>
          <div style={metricLabel}>Executions</div>
          <div style={{ color: 'var(--ds-text-subtle)', marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--ds-text-success)' }}>{data.exec.passed} passed</span>
            <span style={{ color: 'var(--ds-text-danger)' }}>{data.exec.failed} failed</span>
            <span style={{ color: 'var(--ds-text-warning)' }}>{data.exec.blocked} blocked</span>
            <span style={{ color: 'var(--ds-text-subtlest)' }}>{data.exec.not_run} pending</span>
          </div>
        </div>
        <div style={cardStyle}>
          <div style={metricValue}>{data.defects.qaBugs + data.defects.tmDefects}</div>
          <div style={metricLabel}>Defects</div>
          <div style={{ color: 'var(--ds-text-subtle)', marginTop: 8 }}>{data.defects.qaBugs} QA bugs · {data.defects.tmDefects} test-linked</div>
        </div>
        <div style={cardStyle}>
          <div style={metricValue}>{data.defects.incidents}</div>
          <div style={metricLabel}>Production incidents</div>
        </div>
        <div style={cardStyle}>
          <div style={{ ...metricValue, color: data.mismatches.length ? 'var(--ds-text-danger)' : 'var(--ds-text)' }}>{data.mismatches.length}</div>
          <div style={metricLabel}>Governance flags</div>
        </div>
      </div>

      {insight && (
        <div style={{ background: 'var(--ds-background-information)', border: '1px solid var(--ds-border)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-400)' }}>
          <strong style={{ color: 'var(--ds-text-information)' }}>Insight</strong> — {insight}
        </div>
      )}

      <div style={sectionH}><Heading size="small">Governance mismatches <span style={subtle}>— Done stories with a failing test</span></Heading></div>
      <div style={{ marginBottom: 'var(--ds-space-300)' }}>
        <JiraTable<MismatchRow>
          columns={mismatchColumns}
          data={data.mismatches}
          getRowId={(r) => `${r.issue_key}-${r.case_key}`}
          onRowClick={(r) => onRowOpen(r.issue_key)}
          isLoading={false}
          ariaLabel="Governance mismatches"
          emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No governance mismatches.</div>}
        />
      </div>

      <div style={sectionH}><Heading size="small">Uncovered stories <span style={subtle}>— no linked test case ({data.uncovered.length})</span></Heading></div>
      <JiraTable<StoryRow>
        columns={uncoveredColumns}
        data={data.uncovered.slice(0, 100)}
        getRowId={(r) => r.issue_key}
        onRowClick={(r) => onRowOpen(r.issue_key)}
        isLoading={false}
        ariaLabel="Uncovered stories"
        emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>{uncoveredEmpty}</div>}
      />
    </>
  );
}
