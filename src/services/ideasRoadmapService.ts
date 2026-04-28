import { supabase } from '@/integrations/supabase/client';
import type { RoadmapIdea, RoadmapMilestones, RoadmapQuarter } from '@/types/ideasRoadmap';

function mapRow(row: any, index: number): RoadmapIdea {
  return {
    id: row.id,
    ideaKey: row.idea_key ?? `IDEA-${String(index + 1).padStart(3, '0')}`,
    title: row.title,
    description: row.description ?? null,
    theme: row.theme ?? row.category ?? row.idea_type ?? null,
    priority: row.priority ?? null,
    team: row.assigned_team ?? null,
    quarter: (row.roadmap_quarter as RoadmapQuarter) ?? null,
    isCommitted: row.is_committed ?? false,
    milestones: {
      req:  row.milestone_req  ?? null,
      des:  row.milestone_des  ?? null,
      dev:  row.milestone_dev  ?? null,
      uat:  row.milestone_uat  ?? null,
      beta: row.milestone_beta ?? null,
      prod: row.milestone_prod ?? null,
    },
    status: row.status ?? 'Draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchRoadmapIdeas(): Promise<RoadmapIdea[]> {
  const { data, error } = await supabase
    .from('ph_ideas')
    .select(`
      id, idea_key, title, description, category, idea_type, priority, status,
      theme, assigned_team,
      is_committed, roadmap_quarter,
      milestone_req, milestone_des, milestone_dev,
      milestone_uat, milestone_beta, milestone_prod,
      created_at, updated_at
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`fetchRoadmapIdeas: ${error.message}`);
  return (data ?? []).map((row, i) => mapRow(row, i));
}

export async function updateIdeaCommitted(
  ideaId: string,
  isCommitted: boolean,
  quarter: RoadmapQuarter
): Promise<void> {
  const { error } = await supabase
    .from('ph_ideas')
    .update({
      is_committed: isCommitted,
      roadmap_quarter: isCommitted ? quarter : null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', ideaId);

  if (error) throw new Error(`updateIdeaCommitted: ${error.message}`);
}

export async function updateIdeaMilestones(
  ideaId: string,
  milestones: Partial<RoadmapMilestones>
): Promise<void> {
  const update: Record<string, string | null> = {};
  if ('req'  in milestones) update.milestone_req  = milestones.req  ?? null;
  if ('des'  in milestones) update.milestone_des  = milestones.des  ?? null;
  if ('dev'  in milestones) update.milestone_dev  = milestones.dev  ?? null;
  if ('uat'  in milestones) update.milestone_uat  = milestones.uat  ?? null;
  if ('beta' in milestones) update.milestone_beta = milestones.beta ?? null;
  if ('prod' in milestones) update.milestone_prod = milestones.prod ?? null;
  (update as any).updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('ph_ideas')
    .update(update as any)
    .eq('id', ideaId);

  if (error) throw new Error(`updateIdeaMilestones: ${error.message}`);
}

export async function convertIdeaToInitiative(ideaId: string): Promise<{ requestId: string }> {
  const { data: idea, error: fetchErr } = await supabase
    .from('ph_ideas')
    .select('*')
    .eq('id', ideaId)
    .single();

  if (fetchErr || !idea) throw new Error(`convertIdeaToInitiative: ${fetchErr?.message}`);

  const { data: initiative, error: createErr } = await supabase
    .from('ph_requests')
    .insert({
      title: (idea as any).title,
      description: (idea as any).description,
      category: (idea as any).category ?? (idea as any).idea_type,
      status: 'Planned',
      source_idea_id: ideaId,
    } as any)
    .select('id')
    .single();

  if (createErr || !initiative) throw new Error(`convertIdeaToInitiative create: ${createErr?.message}`);

  await supabase
    .from('ph_ideas')
    .update({ status: 'Converted', updated_at: new Date().toISOString() } as any)
    .eq('id', ideaId);

  return { requestId: (initiative as any).id };
}
