/**
 * Tester Performance — tester-scoped real-data report (B1 group 8).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 * Workload + execution for one tester. ADS tokens; @atlaskit components own color; JiraTable for the case list.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import type { ThemeAppearance } from '@atlaskit/lozenge';
import { Heading } from '@/components/ads';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { supabase } from '@/integrations/supabase/client';
import { useTesterPerformance, type TesterCaseRow } from './useTesterPerformance';
import { cardStyle, metricValue, metricLabel, sectionH } from './ReportStatusView';

interface TesterOption {
  label: string;
  value: string;
}

function useTesters() {
  return useQuery({
    queryKey: ['tester-list'],
    queryFn: async (): Promise<TesterOption[]> => {
      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('assigned_to')
        .not('assigned_to', 'is', null);
      const ids = Array.from(new Set((cases ?? []).map((c: { assigned_to: string }) => c.assigned_to)));
      if (!ids.length) return [];
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      return (profs ?? [])
        .map((p: { id: string; full_name: string | null }) => ({ label: p.full_name ?? p.id, value: p.id }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function runAppearance(s: string): ThemeAppearance {
  switch (s) {
    case 'passed': return 'success';
    case 'failed': return 'removed';
    case 'blocked': return 'moved';
    case 'in_progress': return 'inprogress';
    default: return 'default';
  }
}

export default function TesterPerformancePage() {
  const navigate = useNavigate();
  const { data: testers } = useTesters();
  const [selected, setSelected] = useState<TesterOption | null>(null);

  const activeOption = useMemo<TesterOption | null>(() => {
    if (selected) return selected;
    return testers?.[0] ?? null;
  }, [selected, testers]);

  const { data, isLoading } = useTesterPerformance(activeOption?.value);

  const caseColumns: Column<TesterCaseRow>[] = [
    { id: 'caseKey', label: 'Test case', width: 14, sortable: true, cell: ({ row }) => <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{row.caseKey}</span> },
    { id: 'title', label: 'Title', flex: true, cell: ({ row }) => <span style={{ color: 'var(--ds-text)' }}>{row.title}</span> },
    { id: 'story', label: 'Covers story', width: 16, cell: ({ row }) => row.story === '—' ? <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span> : <span style={{ color: 'var(--ds-text-subtle)' }}>{row.story}</span> },
    { id: 'runStatus', label: 'Latest result', width: 14, cell: ({ row }) => <Lozenge appearance={runAppearance(row.runStatus)}>{row.runStatus.replace('_', ' ')}</Lozenge> },
  ];

  const insight = useMemo(() => {
    if (!data) return null;
    if (data.assigned === 0) return 'No test cases assigned to this tester.';
    const done = data.exec.passed + data.exec.failed + data.exec.blocked;
    return `${data.assigned} cases assigned, ${done} executed (${data.exec.passed} passed, ${data.exec.failed} failed). ${data.defectsRaised} defect(s) raised.`;
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
      <ProjectPageHeader hubType="test" title="Tester Performance" trail={[{ text: 'Reports', href: '/testhub/reports' }, { text: 'Tester Performance' }]} />

      <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '20rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Tester</div>
          <Select<TesterOption>
            inputId="tp-tester"
            options={testers ?? []}
            value={activeOption}
            onChange={(opt) => setSelected(opt as TesterOption)}
            isLoading={!testers}
            spacing="default"
          />
        </div>

        {isLoading || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading tester performance…
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={cardStyle}>
                <div style={metricValue}>{data.assigned}</div>
                <div style={metricLabel}>Assigned cases</div>
              </div>
              <div style={cardStyle}>
                <div style={metricValue}>{data.exec.passed + data.exec.failed + data.exec.blocked}</div>
                <div style={metricLabel}>Executed</div>
                <div style={{ color: 'var(--ds-text-subtle)', marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--ds-text-success)' }}>{data.exec.passed} passed</span>
                  <span style={{ color: 'var(--ds-text-danger)' }}>{data.exec.failed} failed</span>
                  <span style={{ color: 'var(--ds-text-warning)' }}>{data.exec.blocked} blocked</span>
                </div>
              </div>
              <div style={cardStyle}>
                <div style={metricValue}>{data.exec.not_run}</div>
                <div style={metricLabel}>Pending</div>
              </div>
              <div style={cardStyle}>
                <div style={metricValue}>{data.defectsRaised}</div>
                <div style={metricLabel}>Defects raised</div>
              </div>
            </div>

            {insight && (
              <div style={{ background: 'var(--ds-background-information)', border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-border-radius)', padding: 'var(--ds-space-150) var(--ds-space-200)', marginBottom: 'var(--ds-space-300)', color: 'var(--ds-text)' }}>
                <strong style={{ color: 'var(--ds-text-information)' }}>Insight</strong> — {insight}
              </div>
            )}

            <div style={sectionH}><Heading size="small">Assigned test cases</Heading></div>
            <JiraTable<TesterCaseRow>
              columns={caseColumns}
              data={data.cases}
              getRowId={(r) => r.caseKey}
              onRowClick={(r) => r.story !== '—' && navigate(`/browse/${r.story}`)}
              isLoading={false}
              ariaLabel="Assigned test cases"
              emptyView={<div style={{ padding: 'var(--ds-space-250)', color: 'var(--ds-text-subtle)' }}>No cases assigned.</div>}
            />
          </>
        )}
      </div>
    </div>
  );
}
