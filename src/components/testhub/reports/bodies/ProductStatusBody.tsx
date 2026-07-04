/**
 * ProductStatusBody — epic-scoped report body (registry: product-status).
 * Feature: CAT-REPORTS-HUB-20260703-001 (Phase 2 Lane A port from ProductStatusPage).
 * Scope = an Epic (Business Request proxy). Reuses ReportStatusView with epic descendant stories.
 * Picker parity (S1.5): single epic → auto-select; else last-used (validated) or empty-state.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { useReportPickerDefault, rememberReportPick, REPORTS_LAST_EPIC_KEY } from '@/components/testhub/reports/useReportPickerDefault';
import { useProductStatus } from '@/components/testhub/reports/hooks/useProductStatus';
import ReportInsightCard from '@/components/testhub/reports/ReportInsightCard';
import { ReportStatusView, metricLabel } from '@/pages/testhub/reports/ReportStatusView';

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

export function ProductStatusBody() {
  const navigate = useNavigate();
  const { data: epics, isLoading: epicsLoading } = useEpics();
  const [selected, setSelected] = useState<EpicOption | null>(null);

  // S1.5: single epic → auto-select; else last-used (validated) or none (no first-epic default).
  const activeOption = useReportPickerDefault(REPORTS_LAST_EPIC_KEY, epics, selected);

  const { data, isLoading } = useProductStatus(activeOption?.value);

  const insight = useMemo(() => {
    if (!data) return null;
    if (data.totalStories === 0) return 'This epic has no child stories — nothing to assess.';
    const parts = [`Coverage ${data.coveragePct}% (${data.coveredStories}/${data.totalStories} stories under this epic).`];
    if (data.coveragePct < 40) parts.push('Coverage is too low to assess this business request.');
    if (data.mismatches.length) parts.push(`${data.mismatches.length} Done story(ies) have a failing test.`);
    return parts.join(' ');
  }, [data]);

  // Counts-only aggregates for the Caty narrative.
  const aggregates = useMemo<Record<string, unknown> | null>(() => {
    if (!data) return null;
    return {
      report_id: 'product-status',
      total_stories: data.totalStories,
      covered_stories: data.coveredStories,
      coverage_pct: data.coveragePct,
      governance_mismatches: data.mismatches.length,
      uncovered_stories: data.uncovered.length,
    };
  }, [data]);

  return (
    <div style={{ flex: 1, padding: 'var(--ds-space-250) var(--ds-space-300) var(--ds-space-600)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '32rem', marginBottom: 'var(--ds-space-250)' }}>
          <div style={metricLabel}>Epic / Business Request</div>
          <Select<EpicOption>
            inputId="prod-epic"
            options={epics ?? []}
            value={activeOption}
            onChange={(o) => {
              const opt = o as EpicOption;
              setSelected(opt);
              rememberReportPick(REPORTS_LAST_EPIC_KEY, opt.value);
            }}
            isLoading={!epics}
            spacing="default"
          />
        </div>

        {!activeOption ? (
          epicsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
              <Spinner size="medium" /> Loading epics…
            </div>
          ) : (
            <EmptyState header="Select an epic" description="Choose an epic (business request) to run this report." />
          )
        ) : isLoading || !data ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)', padding: 24 }}>
            <Spinner size="medium" /> Loading product testing status…
          </div>
        ) : (
          <>
            <ReportInsightCard
              reportId="product-status"
              reportLabel="Product / Business Request Status"
              projectName={activeOption.label}
              computed={aggregates}
            />
            <ReportStatusView data={data} insight={insight} onRowOpen={(k) => navigate(`/browse/${k}`)} uncoveredEmpty="Every story under this epic has a test case." />
          </>
        )}
    </div>
  );
}

export default ProductStatusBody;
