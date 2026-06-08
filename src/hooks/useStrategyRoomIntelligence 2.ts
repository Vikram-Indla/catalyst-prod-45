import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioMetrics {
  themes: { key: string; name: string; status: string; progress: number; goals: number; krs: number; budget: string }[];
  totalThemes: number;
  activeThemes: number;
  totalGoals: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  goalsOffTrack: number;
  avgGoalProgress: number;
  totalKRs: number;
  avgKRProgress: number;
  krsAbove80: number;
  krsBelow40: number;
  totalWorkItems: number;
  orphanedWorkItems: number;
  avgAlignment: number;
  totalPeople: number;
  overAllocated: number;
  totalRisks: number;
  criticalRisks: number;
  overdueRisks: number;
  resolvedRisks: number;
  mitigatedRisks: number;
  ownedRisks: number;
  acceptedRisks: number;
  aiHealthScore: number;
  executionVelocity: number;
  recentActivity: { text: string; actor: string; time: string; type: 'positive' | 'negative' | 'neutral' }[];
}

export function useStrategyRoomIntelligence(enabled = false) {
  return useQuery({
    queryKey: ['strategy-room-intelligence'],
    enabled,
    queryFn: async (): Promise<PortfolioMetrics> => {
      const [
        { data: themes },
        { data: goals },
        { data: krs },
        { data: workItems },
        { data: profiles },
        { data: risks },
      ] = await Promise.all([
        supabase.from('es_strategic_themes').select('*').order('theme_key'),
        supabase.from('es_goals').select('*'),
        supabase.from('es_key_results').select('*'),
        supabase.from('ph_work_items').select('id, item_type, status, parent_id').limit(500),
        supabase.from('profiles').select('id, full_name, role, department'),
        supabase.from('risks').select('*'),
      ]);

      const tList = themes || [];
      const gList = goals || [];
      const kList = krs || [];
      const wList = workItems || [];
      const pList = profiles || [];
      const rList = risks || [];

      const now = new Date();
      const orphaned = wList.filter((w: any) => !w.parent_id).length;
      const overdueR = rList.filter((r: any) => {
        if (r.roam_status === 'Resolved' || r.status === 'Closed') return false;
        if (r.target_date && new Date(r.target_date) < now) return true;
        return false;
      }).length;

      const goalsOnTrack = gList.filter((g: any) => g.status === 'On Track').length;
      const goalsAtRisk = gList.filter((g: any) => g.status === 'At Risk').length;
      const goalsOffTrack = gList.filter((g: any) => g.status === 'Off Track').length;
      const avgGoalProg = gList.length > 0
        ? Math.round(gList.reduce((s: number, g: any) => s + (g.progress_pct || 0), 0) / gList.length)
        : 0;
      const avgKRProg = kList.length > 0
        ? Math.round(kList.reduce((s: number, k: any) => s + (k.progress_pct || 0), 0) / kList.length)
        : 0;

      const goalHealthPct = gList.length > 0 ? (goalsOnTrack / gList.length) * 100 : 0;
      const riskHealthPct = rList.length > 0 ? (1 - overdueR / rList.length) * 100 : 100;
      const alignmentPct = wList.length > 0 ? ((wList.length - orphaned) / wList.length) * 100 : 100;
      const aiHealth = Math.round(goalHealthPct * 0.3 + avgKRProg * 0.25 + riskHealthPct * 0.2 + alignmentPct * 0.15 + avgGoalProg * 0.1);

      return {
        themes: tList.map((t: any) => ({
          key: t.theme_key || t.id?.slice(0, 8),
          name: t.name,
          status: t.status || 'Active',
          progress: t.progress || 0,
          goals: 0,
          krs: 0,
          budget: t.budget ? `${Math.round(t.budget / 1000000)}M` : '—',
        })),
        totalThemes: tList.length,
        activeThemes: tList.filter((t: any) => t.status !== 'Draft').length,
        totalGoals: gList.length,
        goalsOnTrack, goalsAtRisk, goalsOffTrack,
        avgGoalProgress: avgGoalProg,
        totalKRs: kList.length,
        avgKRProgress: avgKRProg,
        krsAbove80: kList.filter((k: any) => (k.progress_pct || 0) >= 80).length,
        krsBelow40: kList.filter((k: any) => (k.progress_pct || 0) < 40).length,
        totalWorkItems: wList.length,
        orphanedWorkItems: orphaned,
        avgAlignment: wList.length > 0 ? Math.round((1 - orphaned / wList.length) * 100) : 0,
        totalPeople: pList.length,
        overAllocated: 0,
        totalRisks: rList.length,
        criticalRisks: rList.filter((r: any) => r.impact === 'Critical' || r.impact === 'Very High').length,
        overdueRisks: overdueR,
        resolvedRisks: rList.filter((r: any) => r.roam_status === 'Resolved').length,
        mitigatedRisks: rList.filter((r: any) => r.roam_status === 'Mitigated').length,
        ownedRisks: rList.filter((r: any) => r.roam_status === 'Owned').length,
        acceptedRisks: rList.filter((r: any) => r.roam_status === 'Accepted').length,
        aiHealthScore: aiHealth,
        executionVelocity: 50,
        recentActivity: [],
      };
    },
    staleTime: 60000,
  });
}
