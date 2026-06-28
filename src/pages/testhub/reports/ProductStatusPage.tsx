/**
 * Product / Business Request Testing Status — epic-scoped report (B1 group 4).
 * Feature: CAT-TESTHUB-REPORT-REVAMP-20260627-001.
 * Scope = an Epic (Business Request proxy). Reuses ReportStatusView with epic descendant stories.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useProductStatus } from './useProductStatus';
import { ReportStatusView, metricLabel } from './ReportStatusView';

const DEFAULT_EPIC = 'BAU-4466';
interface EpicOption { label: string; value: string }

function useEpics() {
  return useQuery({
    queryKey: ['epic-list'],
    queryFn: async (): Promise<EpicOption[]> => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_key, summary')
        .eq('issue_type', 'Epic')
        .order('jira_updated_at', { ascending: false, nullsFirst: false })
        .limit(200);
      return (data ?? []).map((e: { issue_key: string; summary: string }) => ({ label: `${e.issue_key} · ${e.summary}`, value: e.issue_key }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default function ProductStatusPage() {
  const navigate = useNavigate();
  const { data: epics } = useEpics();
  const [selected, setSelected] = useState<EpicOption | null>(null);

  const activeOption = useMemo<EpicOption | null>(() => {
    if (selected) return selected;
    if (!epics?.length) return null;
    return epics.find((e) => e.value === DEFAULT_EPIC) ?? epics[0];
  }, [selected, epics]);

  const { data, isLoading } = useProductStatus(activeOption?.value);

  const insight = useMemo(() => {
    if (!data) return null;
    if (data.totalStories === 0) return 'This epic has no child stories — nothing to assess.';
    const parts = [`Coverage ${data.coveragePct}% (${data.coveredStories}/${data.totalStories} stories under this epic).`];
    if (data.coveragePct < 40) parts.push('Coverage is too low to assess this business request.');
    if (data.mismatches.length) parts.push(`${data.mismatches.length} Done story(ies) have a failing test.`);
    return parts.join(' ');
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ds-surface)', display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
      <ProjectPageHeader hubType="test" title="Product / Business Request Status" trail={[{ text: 'Reports', href: '/testhub/reports' }, { text: 'Product / Business Request Status' }]} />

      <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '32rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Epic / Business Request</div>
          <Select<EpicOption> inputId="prod-epic" options={epics ?? []} value={activeOption} onChange={(o) => setSelected(o as EpicOption)} isLoading={!epics} spacing="default" />
        </div>

        {isLoading || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading product testing status…
          </div>
        ) : (
          <ReportStatusView data={data} insight={insight} onRowOpen={(k) => navigate(`/browse/${k}`)} uncoveredEmpty="Every story under this epic has a test case." />
        )}
      </div>
    </div>
  );
}
