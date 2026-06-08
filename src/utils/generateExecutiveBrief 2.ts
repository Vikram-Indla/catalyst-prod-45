import { supabase } from "@/integrations/supabase/client";
import type { PortfolioMetrics } from "@/hooks/useStrategyRoomIntelligence";

export interface ExecutiveBriefAI {
  verdict: { grade: string; score: number; headline: string; detail: string };
  chainDials: {
    label: string; metric: string; unit: string; barPct: number;
    rag: 'red' | 'amber' | 'green'; tell: string; insight: string;
  }[];
  contradictions: { finding: string; implication: string; source: string }[];
  decisions: {
    id: string; priority: 'CRITICAL' | 'HIGH'; ask: string;
    rationale: string; evidence: string[]; deadline: string; owner: string;
  }[];
  recovery: { horizon: string; tag: string; ragColor: 'red' | 'amber' | 'green'; actions: string[] }[];
  dataTrust: { level: string; sourcesUsed: number; gaps: number; note: string };
}

export async function generateExecutiveBrief(metrics: PortfolioMetrics): Promise<ExecutiveBriefAI> {
  try {
    const { data, error } = await supabase.functions.invoke('executive-brief', {
      body: { metrics },
    });

    if (error) {
      console.error('Executive brief error:', error);
      return getDefaultBrief(metrics);
    }

    if (data?.error) {
      console.error('Executive brief AI error:', data.error);
      return getDefaultBrief(metrics);
    }

    // Validate structure
    if (data?.verdict && data?.chainDials) {
      return data as ExecutiveBriefAI;
    }

    return getDefaultBrief(metrics);
  } catch (err) {
    console.error('Executive brief generation error:', err);
    return getDefaultBrief(metrics);
  }
}

function getDefaultBrief(m: PortfolioMetrics): ExecutiveBriefAI {
  return {
    verdict: {
      grade: '—',
      score: m.aiHealthScore || 0,
      headline: 'AI analysis generating — data-driven metrics shown',
      detail: `Portfolio has ${m.totalGoals} goals (${m.goalsOnTrack} on track) and ${m.totalRisks} risks (${m.overdueRisks} overdue). AI executive briefing will provide deeper analysis.`,
    },
    chainDials: [
      { label: 'Themes → Goals', metric: `${m.goalsOnTrack}/${m.totalGoals}`, unit: 'on track', barPct: m.totalGoals > 0 ? Math.round(m.goalsOnTrack / m.totalGoals * 100) : 0, rag: m.goalsOnTrack === 0 ? 'red' : 'amber', tell: `${m.totalGoals} goals across ${m.totalThemes} themes`, insight: 'Generating AI insight...' },
      { label: 'Goals → Key Results', metric: `${m.avgKRProgress}%`, unit: 'avg progress', barPct: m.avgKRProgress, rag: m.avgKRProgress >= 60 ? 'green' : m.avgKRProgress >= 40 ? 'amber' : 'red', tell: `${m.totalKRs} KRs measured`, insight: 'Generating AI insight...' },
      { label: 'KRs → Work Items', metric: `${m.orphanedWorkItems}`, unit: 'orphaned', barPct: m.totalWorkItems > 0 ? Math.round(m.orphanedWorkItems / m.totalWorkItems * 100) : 0, rag: m.orphanedWorkItems > 50 ? 'red' : 'amber', tell: `${m.totalWorkItems} items, ${m.orphanedWorkItems} unlinked`, insight: 'Generating AI insight...' },
      { label: 'Work → People', metric: `${m.totalPeople}`, unit: 'members', barPct: 50, rag: 'amber', tell: `${m.totalPeople} people across portfolio`, insight: 'Generating AI insight...' },
      { label: 'People → Budget', metric: '—', unit: 'pending', barPct: 0, rag: 'amber', tell: 'Budget data loading', insight: 'Generating AI insight...' },
      { label: 'Budget → Risk', metric: `${m.overdueRisks}`, unit: 'overdue', barPct: m.totalRisks > 0 ? Math.round(m.overdueRisks / m.totalRisks * 100) : 0, rag: m.overdueRisks > 10 ? 'red' : 'amber', tell: `${m.totalRisks} risks, ${m.overdueRisks} overdue`, insight: 'Generating AI insight...' },
    ],
    contradictions: [],
    decisions: [],
    recovery: [
      { horizon: 'Week 1-2', tag: 'ASSESS', ragColor: 'red', actions: ['Review portfolio health metrics', 'Identify critical blockers'] },
      { horizon: 'Month 1', tag: 'STABILIZE', ragColor: 'amber', actions: ['Address overdue risks', 'Realign orphaned work items'] },
      { horizon: 'Month 2-3', tag: 'ACCELERATE', ragColor: 'green', actions: ['Track KR velocity improvements', 'Measure alignment gains'] },
    ],
    dataTrust: { level: 'MODERATE', sourcesUsed: 6, gaps: 0, note: 'Data drawn from 6 portfolio sources. AI analysis adds strategic context.' },
  };
}
