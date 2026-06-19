import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveReleaseConfidence, type ReleaseConfidence } from '@/lib/releasehub/releaseConfidence';

export interface ReleasePortfolioRow {
  id: string;
  name: string;
  version: string | null;
  status: string;
  health: string | null;
  readinessPct: number | null;
  goLiveDate: string | null;
  targetEnv: string | null;
  jiraKey: string | null;
  scopeItems: number;
  itemsAfterGoLive: number;
  openDefects: number;
  openIncidents: number;
  signoffDone: number;
  signoffTotal: number;
  confidence: ReleaseConfidence;
}

/**
 * Release portfolio for the Release Operations overview. Selects the
 * server-aggregated `rh_release_portfolio_v` view (scope, date alignment,
 * sign-offs, open defects/incidents) and stamps each row with a derived
 * production-confidence verdict. View is not in generated types — cast per
 * repo convention.
 */
export const useReleasePortfolio = () =>
  useQuery({
    queryKey: ['release-hub', 'portfolio'],
    staleTime: 30_000,
    queryFn: async (): Promise<ReleasePortfolioRow[]> => {
      const { data, error } = await (supabase as any)
        .from('rh_release_portfolio_v')
        .select('*')
        .order('planned_release_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((r: any): ReleasePortfolioRow => {
        const row = {
          id: r.id,
          name: r.name,
          version: r.version ?? null,
          status: r.status,
          health: r.health ?? null,
          readinessPct: r.readiness_pct ?? null,
          goLiveDate: r.planned_release_date ?? null,
          targetEnv: r.target_env ?? null,
          jiraKey: r.jira_key ?? null,
          scopeItems: r.scope_items ?? 0,
          itemsAfterGoLive: r.items_after_golive ?? 0,
          openDefects: r.open_defects ?? 0,
          openIncidents: r.open_incidents ?? 0,
          signoffDone: r.signoff_done ?? 0,
          signoffTotal: r.signoff_total ?? 0,
        };
        return {
          ...row,
          confidence: resolveReleaseConfidence({
            status: row.status,
            health: row.health,
            readinessPct: row.readinessPct,
            goLiveDate: row.goLiveDate,
            signoffDone: row.signoffDone,
            signoffTotal: row.signoffTotal,
            itemsAfterGoLive: row.itemsAfterGoLive,
            openDefects: row.openDefects,
            openIncidents: row.openIncidents,
          }),
        };
      });
    },
  });
