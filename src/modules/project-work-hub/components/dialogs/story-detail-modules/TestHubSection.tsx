/**
 * TestHubSection — extracted from StoryDetailModal
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AddIcon from '@atlaskit/icon/core/add';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import type { TmTestCase, ThTestExecution, TestResult } from './types';
import { LOZENGE, TEST_RESULT_STYLES } from './constants';
import { getAvatarColor, formatDateShort } from './helpers';
import { SectionBlock, SkeletonRows, EmptyState } from './shared-components';
import { statusToLozenge, type LozengeAppearance } from '../../../utils/statusToLozenge';

const LOZENGE_STYLES: Record<LozengeAppearance, { bg: string; color: string }> = {
  default:    { bg: '#DFE1E6', color: '#253858' },
  inprogress: { bg: '#DEEBFF', color: '#0747A6' },
  success:    { bg: '#E3FCEF', color: '#006644' },
  removed:    { bg: '#DFE1E6', color: '#253858' },
  moved:      { bg: '#DFE1E6', color: '#253858' },
  new:        { bg: '#DFE1E6', color: '#253858' },
};

function CatalystLozenge({ appearance, children }: { appearance: LozengeAppearance; children: React.ReactNode }) {
  const s = LOZENGE_STYLES[appearance] ?? LOZENGE_STYLES.default;
  return (
    <span style={{
      background: s.bg, color: s.color,
      height: 20, padding: '0 6px', borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em',
      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
    }}>{children}</span>
  );
}

export function TestHubSection({ storyId }: { storyId: string }) {
  const [activeTab, setActiveTab] = useState<'cases' | 'executions'>('cases');
  const queryClient = useQueryClient();

  const { data: testCases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['testCases', storyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tm_test_case_links')
        .select(`id, test_case:tm_test_cases ( id, case_key, title, status, priority_id, assigned_to, created_at )`)
        .eq('linked_item_id', storyId).eq('linked_item_type', 'story');
      if (error) throw error;
      return (data?.map((r: any) => r.test_case).filter(Boolean) ?? []) as TmTestCase[];
    },
  });

  const { data: executions = [], isLoading: execLoading } = useQuery({
    queryKey: ['testExecutions', storyId],
    queryFn: async () => {
      const { data: links } = await supabase.from('tm_test_case_links')
        .select('test_case_id:tm_test_cases(id,case_key,title)')
        .eq('linked_item_id', storyId).eq('linked_item_type', 'story');
      if (!links?.length) return [];
      const caseIds = links.map((l: any) => l.test_case_id?.id).filter(Boolean);
      const { data, error } = await supabase.from('th_test_executions')
        .select('id,test_case_id,cycle_name,result,executed_by,executed_at')
        .in('test_case_id', caseIds).order('executed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ThTestExecution[];
    },
    enabled: activeTab === 'executions',
  });

  const unlinkCase = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase.from('tm_test_case_links').delete()
        .eq('linked_item_id', storyId).eq('test_case_id', caseId).eq('linked_item_type', 'story');
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testCases', storyId] }),
  });

  return (
    <SectionBlock title="TestHub" count={testCases.length} defaultExpanded={testCases.length > 0} headerRight={
      <>
        <button className="sdm-visibility-btn" style={{ gap: 4 }}><LinkExternalIcon label="Open TestHub" /> Open TestHub</button>
        <button className="sdm-create-btn sdm-visibility-btn"><AddIcon label="Link test" /> Link test</button>
      </>
    }>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(9,30,66,.14)', background: 'var(--ds-surface-sunken, #F8FAFC)' }}>
        {([{ key: 'cases' as const, label: 'Test Cases', count: testCases.length }, { key: 'executions' as const, label: 'Test Executions', count: executions.length }]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, height: 33, fontSize: 12, fontWeight: 500, border: 'none', background: 'transparent', cursor: 'pointer',
            color: activeTab === tab.key ? 'var(--ds-text-brand, #2563EB)' : 'var(--ds-text-subtlest, #6B778C)',
            borderBottom: `2px solid ${activeTab === tab.key ? 'var(--ds-text-brand, #2563EB)' : 'transparent'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'color .12s, border-color .12s',
            fontFamily: 'var(--cp-font-body)',
          }}>
            {tab.label}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: activeTab === tab.key ? '#DEEBFF' : 'var(--ds-border, #DFE1E6)', color: activeTab === tab.key ? '#0747A6' : '#42526E' }}>{tab.count}</span>
          </button>
        ))}
      </div>
      {activeTab === 'cases' && (
        <>
          {casesLoading && <SkeletonRows />}
          {!casesLoading && testCases.length === 0 && <EmptyState heading="No test cases linked" sub="Link test cases from TestHub to track coverage" />}
          {!casesLoading && testCases.length > 0 && (
            <div className="sdm-child-list" role="list">
              {testCases.map(tc => (
                <div key={tc.id} className="sdm-child-row">
                  <span className="sdm-type-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </span>
                  <span className="sdm-child-key" style={{ color: '#42526E' }}>{tc.case_key}</span>
                  <span className="sdm-child-summary">{tc.title}</span>
                  <span className="sdm-status-lozenge"><CatalystLozenge appearance={statusToLozenge(tc.status)}>{tc.status}</CatalystLozenge></span>
                  <span className="sdm-date-col">{formatDateShort(tc.created_at)}</span>
                  <div className="sdm-row-actions">
                    <button className="sdm-row-action-btn" title="Open in TestHub"><LinkExternalIcon label="Open in TestHub" /></button>
                    <button className="sdm-row-action-btn sdm-row-action-btn--danger" title="Unlink" onClick={e => { e.stopPropagation(); unlinkCase.mutate(tc.id); }}><CrossIcon label="Unlink" size="small" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {activeTab === 'executions' && (
        <>
          {execLoading && <SkeletonRows />}
          {!execLoading && executions.length === 0 && <EmptyState heading="No test executions" sub="Run test cases from TestHub to see results here" />}
          {!execLoading && executions.length > 0 && (
            <div className="sdm-child-list" role="list">
              {executions.map(ex => (
                <div key={ex.id ?? ex.test_case_id} className="sdm-child-row">
                  <span style={{
                    ...TEST_RESULT_STYLES[ex.result as TestResult] ?? TEST_RESULT_STYLES.not_run,
                    display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 6px', borderRadius: 3,
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', flexShrink: 0,
                  }}>{ex.result?.replace('_', ' ') ?? 'N/A'}</span>
                  <span className="sdm-child-key" style={{ color: '#42526E' }}>{ex.case_key ?? '—'}</span>
                  <span className="sdm-child-summary">{ex.cycle_name ?? 'Manual execution'}</span>
                  {ex.executed_by && (
                    <div className="sdm-child-avatar" style={{ background: getAvatarColor(ex.executed_by) }}>{ex.executed_by.charAt(0).toUpperCase()}</div>
                  )}
                  <span className="sdm-date-col">{formatDateShort(ex.executed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </SectionBlock>
  );
}
