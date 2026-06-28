/**
 * Project Testing Status — first REAL-data report of the Test Hub reporting revamp.
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001 (B1 group 1).
 *
 * Renders, for a selected project, the proven model:
 *   - Coverage % (stories denominator, D-006)  - Execution distribution
 *   - Defects (hybrid ph_issues + tm_defects, D-005)
 *   - Governance mismatches (story Done + failing test, B5 G-M1)
 *   - Uncovered stories
 * ADS tokens only · @atlaskit components own their color · JiraTable for lists.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { supabase } from '@/integrations/supabase/client';
import {
  useProjectTestingStatus,
  type MismatchRow,
  type StoryRow,
} from './useProjectTestingStatus';

const SENAEI_BAU_ID = '84f91caf-7511-470a-9a26-3e52e66258bf';

interface ProjectOption {
  label: string;
  value: string;
}

function useTmProjects() {
  return useQuery({
    queryKey: ['tm-projects-list'],
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data } = await supabase
        .from('tm_projects')
        .select('id, name')
        .order('name', { ascending: true });
      return (data ?? []).map((p: { id: string; name: string }) => ({ label: p.name, value: p.id }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

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

const cardStyle: React.CSSProperties = {
  background: 'var(--ds-surface-raised)',
  border: '1px solid var(--ds-border)',
  borderRadius: 8,
  padding: 16,
  minWidth: 150,
  flex: '1 1 0',
};
const metricValue: React.CSSProperties = {
  fontSize: 26, fontWeight: 600, color: 'var(--ds-text)', lineHeight: 1.1,
};
const metricLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--ds-text-subtle)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4,
};

export default function ProjectTestingStatusPage() {
  const navigate = useNavigate();
  const { data: projects } = useTmProjects();
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  const activeOption = useMemo<ProjectOption | null>(() => {
    if (selected) return selected;
    if (!projects?.length) return null;
    return projects.find((p) => p.value === SENAEI_BAU_ID) ?? projects[0];
  }, [selected, projects]);

  const { data, isLoading } = useProjectTestingStatus(activeOption?.value, activeOption?.label);

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

  const health = data ? coverageHealth(data.coveragePct) : null;
  const insight = useMemo(() => {
    if (!data) return null;
    if (data.totalStories === 0) return 'No stories in scope for this project — coverage cannot be assessed.';
    const parts: string[] = [];
    parts.push(`Coverage ${data.coveragePct}% (${data.coveredStories}/${data.totalStories} stories).`);
    if (data.coveragePct < 40) parts.push('Coverage is far too low to assess release readiness.');
    if (data.mismatches.length) parts.push(`${data.mismatches.length} story(ies) marked Done have a failing test — investigate before release.`);
    if (data.exec.total === 0) parts.push('No executions recorded.');
    return parts.join(' ');
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
      <ProjectPageHeader
        hubType="test"
        title="Project Testing Status"
        trail={[{ text: 'Reports', href: '/testhub/reports' }, { text: 'Project Testing Status' }]}
      />

      <div style={{ flex: 1, padding: '24px 24px 48px', width: '100%', boxSizing: 'border-box' }}>
        {/* Scope selector */}
        <div style={{ maxWidth: 320, marginBottom: 24 }}>
          <div style={metricLabel}>Project</div>
          <Select<ProjectOption>
            inputId="pts-project"
            options={projects ?? []}
            value={activeOption}
            onChange={(opt) => setSelected(opt as ProjectOption)}
            isLoading={!projects}
            spacing="default"
          />
        </div>

        {isLoading || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading testing status…
          </div>
        ) : (
          <>
            {/* Metric ribbon */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={cardStyle}>
                <div style={metricValue}>{data.coveragePct}%</div>
                <div style={metricLabel}>Story coverage</div>
                <div style={{ marginTop: 8 }}>{health && <Lozenge appearance={health.appearance}>{health.label}</Lozenge>}</div>
                <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', marginTop: 8 }}>{data.coveredStories}/{data.totalStories} stories</div>
              </div>
              <div style={cardStyle}>
                <div style={metricValue}>{data.exec.total}</div>
                <div style={metricLabel}>Executions</div>
                <div style={{ fontSize: 12, color: 'var(--ds-text-subtle)', marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--ds-text-success)' }}>{data.exec.passed} passed</span>
                  <span style={{ color: 'var(--ds-text-danger)' }}>{data.exec.failed} failed</span>
                  <span style={{ color: 'var(--ds-text-warning)' }}>{data.exec.blocked} blocked</span>
                  <span style={{ color: 'var(--ds-text-subtlest)' }}>{data.exec.not_run} pending</span>
                </div>
              </div>
              <div style={cardStyle}>
                <div style={metricValue}>{data.defects.qaBugs + data.defects.tmDefects}</div>
                <div style={metricLabel}>Defects</div>
                <div style={{ fontSize: 12, color: 'var(--ds-text-subtle)', marginTop: 8 }}>{data.defects.qaBugs} QA bugs · {data.defects.tmDefects} test-linked</div>
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

            {/* Factual AI insight (B6) */}
            {insight && (
              <div style={{ background: 'var(--ds-background-information)', border: '1px solid var(--ds-border-information, var(--ds-border))', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: 'var(--ds-text)', fontSize: 14 }}>
                <strong style={{ color: 'var(--ds-text-information, var(--ds-text))' }}>Insight</strong> — {insight}
              </div>
            )}

            {/* Governance mismatches */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text)', margin: '8px 0 12px' }}>
              Governance mismatches <span style={{ color: 'var(--ds-text-subtlest)', fontWeight: 400 }}>— stories marked Done with a failing test</span>
            </h3>
            <div style={{ marginBottom: 24 }}>
              <JiraTable<MismatchRow>
                columns={mismatchColumns}
                data={data.mismatches}
                getRowId={(r) => `${r.issue_key}-${r.case_key}`}
                onRowClick={(r) => navigate(`/browse/${r.issue_key}`)}
                isLoading={false}
                ariaLabel="Governance mismatches"
                emptyView={<div style={{ padding: 24, color: 'var(--ds-text-subtle)' }}>No governance mismatches. </div>}
              />
            </div>

            {/* Uncovered stories */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text)', margin: '8px 0 12px' }}>
              Uncovered stories <span style={{ color: 'var(--ds-text-subtlest)', fontWeight: 400 }}>— no linked test case ({data.uncovered.length})</span>
            </h3>
            <JiraTable<StoryRow>
              columns={uncoveredColumns}
              data={data.uncovered.slice(0, 100)}
              getRowId={(r) => r.issue_key}
              onRowClick={(r) => navigate(`/browse/${r.issue_key}`)}
              isLoading={false}
              ariaLabel="Uncovered stories"
              emptyView={<div style={{ padding: 24, color: 'var(--ds-text-subtle)' }}>Every in-scope story has at least one test case.</div>}
            />
          </>
        )}
      </div>
    </div>
  );
}
