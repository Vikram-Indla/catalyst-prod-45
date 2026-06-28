import React, { useCallback, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import ProgressBar from '@atlaskit/progress-bar';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { CatyInsightCard } from './CatyInsightCard';
import { CatyRainbowCTA } from './CatyRainbowCTA';

interface MemberSignal { name: string; avatarUrl?: string | null; openItems: number; roleAvg: number; closureTrend: 'up' | 'down' | 'flat'; closureRate: number; staleCount: number; status: 'overloaded' | 'healthy' | 'has-capacity'; detail: string }
interface WorkloadRiskData { summary: string; members: MemberSignal[] }
interface CatyWorkloadRiskProps { teamMembers: Array<{ userId: string; name: string; allocationPct: number; allocationColor: string; isYou: boolean; projectBreakdown: Array<{ label: string; pct: number; color: string }> }> }

export function CatyWorkloadRisk({ teamMembers }: CatyWorkloadRiskProps) {
  const { user } = useAuth();
  const [data, setData] = useState<WorkloadRiskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const analyzeWorkload = useCallback(async () => {
    if (teamMembers.length === 0) return;
    setIsLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('jira_account_id').eq('id', user?.id ?? '').single();
      const jiraId = profile?.jira_account_id;
      const enriched = [];
      for (const m of teamMembers) {
        const aid = m.isYou && jiraId ? jiraId : null;
        if (!aid) {
          enriched.push({ name: m.name, allocationPct: m.allocationPct, projectCount: m.projectBreakdown.length, isYou: m.isYou, openItems: 0, staleItems: 0 });
          continue;
        }
        const { count } = await supabase.from('ph_issues').select('id', { count: 'exact', head: true }).eq('assignee_account_id', aid).neq('status_category', 'done').is('archived_at', null);
        const { count: stale } = await supabase.from('ph_issues').select('id', { count: 'exact', head: true }).eq('assignee_account_id', aid).neq('status_category', 'done').is('archived_at', null).lt('jira_updated_at', new Date(Date.now() - 21 * 86_400_000).toISOString());
        enriched.push({ name: m.name, allocationPct: m.allocationPct, projectCount: m.projectBreakdown.length, isYou: m.isYou, openItems: count ?? 0, staleItems: stale ?? 0 });
      }
      const context = JSON.stringify(enriched);
      const { data: result, error } = await supabase.functions.invoke('ai-digest', { body: { mode: 'workload-risk', context } });
      if (!error && result?.workload) {
        setData(result.workload);
      } else {
        setData({ summary: 'Workload analysis is being set up. Check back soon.', members: [] });
      }
    } catch {
      setData({ summary: 'Workload analysis is being set up. Check back soon.', members: [] });
    } finally {
      setIsLoading(false);
    }
  }, [teamMembers]);
  if (teamMembers.length === 0) return null;

  const trendArrow = (trend: MemberSignal['closureTrend'], rate: number) => {
    if (trend === 'up') return <span style={{ color: token('color.text.success', 'var(--ds-text-success, #216E4E)') }}>↑ {rate}%</span>;
    if (trend === 'down') return <span style={{ color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}>↓ {rate}%</span>;
    return <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>→ {rate}%</span>;
  };

  if (!data) {
    return <CatyRainbowCTA label="Workload risk" onClick={analyzeWorkload} isLoading={isLoading} />;
  }

  return (
    <CatyInsightCard title="Workload signals" onRefresh={analyzeWorkload} onDismiss={() => { setData(null); }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0, color: token('color.text', 'var(--ds-text, #172B4D)') }}>{data.summary}</p>
        {data.members.map((m) => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 4, background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken, #F7F8F9)') }}>
            <CatalystAvatar name={m.name} src={m.avatarUrl ?? undefined} size="small" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 4 }}>
                <span style={{ font: `500 13px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', 'var(--ds-text, #172B4D)') }}>{m.name}</span>
                <span style={{ font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>{m.openItems} open (avg: {m.roleAvg})</span>
                {trendArrow(m.closureTrend, m.closureRate)}
                {m.staleCount > 0 && <span style={{ font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.warning', 'var(--ds-text-warning, #974F0C)') }}>{m.staleCount} stale</span>}
              </div>
              <ProgressBar value={Math.min(m.openItems / Math.max(m.roleAvg * 2, 1), 1)} />
            </div>
            <Lozenge appearance={m.status === 'overloaded' ? 'removed' : m.status === 'has-capacity' ? 'success' : 'default'}>
              {m.status === 'overloaded' ? 'overloaded' : m.status === 'has-capacity' ? 'capacity' : 'healthy'}
            </Lozenge>
          </div>
        ))}
      </div>
    </CatyInsightCard>
  );
}
