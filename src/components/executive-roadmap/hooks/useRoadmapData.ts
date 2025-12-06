import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoadmapRequest, ProcessStage, PLATFORM_INFO } from '../types';

// Map process_step from DB to stage number
const mapProcessStepToStage = (step: string | null): ProcessStage => {
  const mapping: Record<string, ProcessStage> = {
    'new_request': 1,
    'analyse': 2,
    'approved': 3,
    'implement': 4,
    'closed': 5,
    // Legacy mappings
    'request_received': 1,
    'under_study': 2,
    'in_progress': 4,
    'implemented': 5,
  };
  return mapping[step || ''] || 1;
};

// Map delivery_platform to platform key
const mapDeliveryPlatformToKey = (platform: string | null): string => {
  const platformLower = (platform || '').toLowerCase();
  if (platformLower.includes('senaei')) return 'senaei';
  if (platformLower.includes('innovation')) return 'innovation';
  if (platformLower.includes('compass')) return 'compass';
  if (platformLower.includes('tahommena')) return 'tahommena';
  if (platformLower.includes('mini')) return 'miniapps';
  if (platformLower.includes('website') || platformLower.includes('web')) return 'website';
  return 'senaei'; // Default
};

export function useRoadmapData() {
  return useQuery({
    queryKey: ['executive-roadmap-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('*')
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      
      // Transform DB data to RoadmapRequest format
      return (data || []).map((item, index): RoadmapRequest => {
        const platformKey = mapDeliveryPlatformToKey(item.delivery_platform);
        const platformInfo = PLATFORM_INFO[platformKey] || PLATFORM_INFO.senaei;
        
        return {
          id: item.request_key || `MIM-${String(index + 1).padStart(3, '0')}`,
          title: item.title || 'Untitled Request',
          titleAr: undefined, // Can be extended with localization
          owner: item.business_owner || 'Unassigned',
          ownerAr: undefined,
          platform: platformKey,
          platformName: platformInfo.name,
          platformNameAr: platformInfo.nameAr,
          rank: item.rank || index + 1,
          locked: item.is_force_ranked || false,
          submission: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          score: item.business_score || 0,
          target: item.end_date || item.impl_target_end_date || '',
          quarter: item.planned_quarter || '',
          stage: mapProcessStepToStage(item.process_step),
          start: item.start_date || item.impl_start_date || item.created_at?.split('T')[0] || '',
          end: item.end_date || item.impl_target_end_date || '',
          progress: 0, // Can be calculated based on stage
          risks: [], // Can be extended with actual risks
          dependencies: [], // Can be extended with actual dependencies
        };
      });
    },
  });
}
