/**
 * Ideation · Portfolio — CAT-IDEATION-REBUILD-20260709-001 Phase 2 S5.
 *
 * Reads idn_ideas + idn_idea_scores against the active ('default-v1')
 * scoring model's value/effort drivers (D4 default axes). Zero legacy
 * carryover: never import/query ph_ideas here.
 */
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import type { IdeaRow, PortfolioPoint } from '@/modules/ideation/types';

export const IDEATION_PORTFOLIO_KEY = ['ideation', 'portfolio'] as const;

interface DriverRow {
  id: string;
  key: string;
}

interface ScoreRow {
  idea_id: string;
  driver_id: string;
  value: number;
}

export interface IdeationPortfolioResult {
  scored: PortfolioPoint[];
  unscored: IdeaRow[];
  scaleMax: number;
}

export function useIdeationPortfolio() {
  return useQuery({
    queryKey: IDEATION_PORTFOLIO_KEY,
    queryFn: async (): Promise<IdeationPortfolioResult> => {
      const { data: model, error: modelError } = await typedQuery('idn_scoring_models')
        .select('id, version')
        .eq('slug', 'default-v1')
        .maybeSingle();
      if (modelError) throw modelError;
      if (!model) return { scored: [], unscored: [], scaleMax: 5 };

      const { data: drivers, error: driversError } = await typedQuery('idn_scoring_drivers')
        .select('id, key, scale_max')
        .eq('model_id', model.id)
        .in('key', ['value', 'effort']);
      if (driversError) throw driversError;
      const driverRows = (drivers ?? []) as Array<DriverRow & { scale_max: number }>;
      const valueDriverId = driverRows.find((d) => d.key === 'value')?.id;
      const effortDriverId = driverRows.find((d) => d.key === 'effort')?.id;
      const scaleMax = driverRows[0]?.scale_max ?? 5;

      const { data: ideas, error: ideasError } = await typedQuery('idn_ideas')
        .select('id, idea_key, slug, title, problem_statement, idea_class, workflow_status_key, created_at');
      if (ideasError) throw ideasError;
      const ideaRows = (ideas ?? []) as IdeaRow[];
      if (ideaRows.length === 0 || !valueDriverId || !effortDriverId) {
        return { scored: [], unscored: ideaRows, scaleMax };
      }

      const { data: scores, error: scoresError } = await typedQuery('idn_idea_scores')
        .select('idea_id, driver_id, value')
        .eq('model_version', model.version)
        .in('driver_id', [valueDriverId, effortDriverId])
        .in('idea_id', ideaRows.map((i) => i.id));
      if (scoresError) throw scoresError;
      const scoreRows = (scores ?? []) as ScoreRow[];

      const scored: PortfolioPoint[] = [];
      const unscored: IdeaRow[] = [];
      for (const idea of ideaRows) {
        const valueScore = scoreRows.find((s) => s.idea_id === idea.id && s.driver_id === valueDriverId);
        const effortScore = scoreRows.find((s) => s.idea_id === idea.id && s.driver_id === effortDriverId);
        if (valueScore != null && effortScore != null) {
          scored.push({
            id: idea.id,
            idea_key: idea.idea_key,
            slug: idea.slug,
            title: idea.title,
            idea_class: idea.idea_class,
            workflow_status_key: idea.workflow_status_key,
            value: Number(valueScore.value),
            effort: Number(effortScore.value),
          });
        } else {
          unscored.push(idea);
        }
      }

      return { scored, unscored, scaleMax };
    },
    staleTime: 15_000,
  });
}
