import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Objective, Theme, Owner, KeyResult } from '@/types/objective-roadmap';

export function useObjectiveRoadmapData() {
  // Fetch objectives
  const { data: objectivesData = [], isLoading: objectivesLoading } = useQuery({
    queryKey: ['objective-roadmap-objectives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, theme_id, owner_id, start_date, end_date, progress_pct, confidence, status')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch key results for objectives from key_results_v2 table
  const objectiveIds = objectivesData.map(o => o.id);
  const { data: keyResultsData = [], isLoading: krLoading } = useQuery({
    queryKey: ['objective-roadmap-key-results-v2', objectiveIds],
    queryFn: async () => {
      if (objectiveIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('key_results_v2')
        .select('id, objective_id, summary, goal_value, current_value, start_date, end_date, baseline_value')
        .in('objective_id', objectiveIds);
      
      if (error) throw error;
      
      // Debug log for verification (temporary)
      if (data && data.length > 0) {
        console.log('[Roadmap KR Debug] Fetched KRs:', data.map(kr => ({
          id: kr.id,
          objective_id: kr.objective_id,
          summary: kr.summary,
          start_date: kr.start_date,
          end_date: kr.end_date
        })));
      }
      
      return data || [];
    },
    enabled: objectiveIds.length > 0,
  });

  // Fetch themes
  const { data: themesData = [], isLoading: themesLoading } = useQuery({
    queryKey: ['objective-roadmap-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, color_tag')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch owners (profiles)
  const { data: ownersData = [], isLoading: ownersLoading } = useQuery({
    queryKey: ['objective-roadmap-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Map database status to roadmap status
  const mapStatusToRoadmapStatus = (status: string | null): Objective['status'] => {
    switch (status) {
      case 'on_track': return 'on-track';
      case 'at_risk': return 'at-risk';
      case 'off_track': return 'at-risk';
      case 'completed': return 'on-track';
      case 'in_progress': return 'in-progress';
      default: return 'pending';
    }
  };

  // Map KR progress to status
  const mapKRStatus = (current: number | null, target: number | null): KeyResult['status'] => {
    if (!target || target === 0) return 'not-started';
    const progress = ((current || 0) / target) * 100;
    if (progress >= 100) return 'complete';
    if (progress > 0) return 'in-progress';
    return 'not-started';
  };

  // Transform data
  const themes: Theme[] = themesData.map(t => ({
    id: t.id,
    name: t.name,
    color: t.color_tag || '#6B7280',
  }));

  const owners: Owner[] = ownersData.map(o => ({
    id: o.id,
    name: o.full_name || 'Unknown',
    initials: (o.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  }));

  // Group KRs by objective
  const krsByObjective = keyResultsData.reduce((acc, kr) => {
    if (!acc[kr.objective_id]) acc[kr.objective_id] = [];
    acc[kr.objective_id].push(kr);
    return acc;
  }, {} as Record<string, typeof keyResultsData>);

  // Transform objectives
  const objectives: Objective[] = objectivesData.map(obj => {
    const objKRs = krsByObjective[obj.id] || [];
    
    // Debug log for specific objectives (temporary)
    if (obj.name?.includes('DGA Ranking') || obj.name?.includes('Digitize')) {
      console.log(`[Roadmap Debug] Objective "${obj.name}" (${obj.id}):`, {
        fetchedKRsCount: objKRs.length,
        krIds: objKRs.map(kr => kr.id),
        krDates: objKRs.map(kr => ({ start: kr.start_date, end: kr.end_date }))
      });
    }
    
    // Calculate objective dates for KR distribution
    const currentDate = new Date();
    const objStartDate = obj.start_date ? new Date(obj.start_date) : new Date(currentDate.getFullYear(), 0, 1);
    const objEndDate = obj.end_date ? new Date(obj.end_date) : new Date(currentDate.getFullYear(), 11, 31);
    const objDuration = objEndDate.getTime() - objStartDate.getTime();
    
    const keyResults: KeyResult[] = objKRs.map((kr, index) => {
      // Use actual KR dates if available, otherwise distribute across objective timeline
      let krDueDate: Date;
      if (kr.end_date) {
        krDueDate = new Date(kr.end_date);
      } else {
        // Fallback: distribute KRs evenly across the objective timeline
        const krCount = objKRs.length;
        const spacing = objDuration / (krCount + 1);
        krDueDate = new Date(objStartDate.getTime() + spacing * (index + 1));
      }
      
      // Calculate progress using goal_value (not target_value)
      const progress = kr.goal_value && kr.goal_value > 0 
        ? Math.round(((kr.current_value || 0) / kr.goal_value) * 100) 
        : 0;
      
      return {
        id: kr.id,
        title: kr.summary, // Use summary field from key_results_v2
        dueDate: krDueDate,
        progress,
        status: mapKRStatus(kr.current_value, kr.goal_value), // Use goal_value
      };
    });

    // Calculate default dates if not provided
    const startDate = obj.start_date ? new Date(obj.start_date) : new Date(currentDate.getFullYear(), 0, 1);
    const endDate = obj.end_date ? new Date(obj.end_date) : new Date(currentDate.getFullYear(), 11, 31);

    return {
      id: obj.id,
      name: obj.name,
      themeId: obj.theme_id || '',
      ownerId: obj.owner_id || '',
      startDate,
      endDate,
      progress: obj.progress_pct || 0,
      status: mapStatusToRoadmapStatus(obj.status),
      keyResults,
    };
  });

  return {
    objectives,
    themes,
    owners,
    isLoading: objectivesLoading || krLoading || themesLoading || ownersLoading,
  };
}
