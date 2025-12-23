// useBusinessRequestRoadmapItems - Fetches business requests and transforms them into RoadmapItem format
// For Industry Roadmap (mirrors useEpicRoadmapItems architecture)

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoadmapItem } from '@/config/roadmaps/types';

interface BusinessRequestRoadmapFilters {
  status?: string[];
  ownerIds?: string[];
  platformIds?: string[];
  health?: string[];
}

interface UseBusinessRequestRoadmapItemsResult {
  items: RoadmapItem[];
  isLoading: boolean;
  error: Error | null;
  platforms: Array<{ id: string; name: string }>;
  owners: Array<{ id: string; name: string }>;
}

// Feature status to milestone state mapping (reused from epic roadmap)
const FEATURE_STATUS_TO_MILESTONE_STATE: Record<string, 'complete' | 'current' | 'pending'> = {
  'done': 'complete',
  'implementing': 'current',
  'analyzing': 'current',
  'backlog': 'pending',
  'funnel': 'pending',
};

export function useBusinessRequestRoadmapItems(
  filters?: BusinessRequestRoadmapFilters
): UseBusinessRequestRoadmapItemsResult {
  // Fetch business requests with owner info
  const { data: requestsData, isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['business-request-roadmap-items', filters],
    queryFn: async () => {
      let query = supabase
        .from('business_requests')
        .select(`
          id,
          request_key,
          title,
          description,
          process_step,
          health,
          start_date,
          end_date,
          platform,
          business_owner,
          business_owner_id,
          rank,
          planned_quarter,
          created_at,
          progress,
          assignee,
          priority_tier
        `)
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('process_step', filters.status);
      }
      if (filters?.ownerIds && filters.ownerIds.length > 0) {
        query = query.in('business_owner_id', filters.ownerIds);
      }
      if (filters?.platformIds && filters.platformIds.length > 0) {
        query = query.in('platform', filters.platformIds);
      }
      if (filters?.health && filters.health.length > 0) {
        query = query.in('health', filters.health);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Get request IDs for fetching linked features (milestones)
  const requestIds = (requestsData || []).map((r: any) => r.id);

  // Fetch linked features for business requests (via business_request_links)
  const { data: linkedFeaturesData } = useQuery({
    queryKey: ['business-request-roadmap-features', requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return [];

      // Get feature links
      const { data: links, error: linksError } = await supabase
        .from('business_request_links')
        .select('business_request_id, linked_item_id')
        .in('business_request_id', requestIds)
        .eq('linked_item_type', 'feature');

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      // Get feature details
      const featureIds = links.map((l: any) => l.linked_item_id);
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select(`
          id,
          name,
          status,
          planned_end_date,
          actual_end_date,
          planned_start_date,
          actual_start_date,
          created_at
        `)
        .in('id', featureIds);

      if (featuresError) throw featuresError;

      // Map features back to business request IDs
      return links.map((link: any) => {
        const feature = features?.find((f: any) => f.id === link.linked_item_id);
        return feature ? { ...feature, business_request_id: link.business_request_id } : null;
      }).filter(Boolean);
    },
    enabled: requestIds.length > 0,
  });

  // Group features by business_request_id
  const featuresByRequestId = (linkedFeaturesData || []).reduce((acc: Record<string, any[]>, feature: any) => {
    if (!feature.business_request_id) return acc;
    if (!acc[feature.business_request_id]) acc[feature.business_request_id] = [];
    acc[feature.business_request_id].push(feature);
    return acc;
  }, {});

  // Fetch all platforms for filter dropdown
  const { data: platformsData } = useQuery({
    queryKey: ['business-request-roadmap-platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('platform')
        .not('platform', 'is', null);
      if (error) throw error;
      // Get unique platforms
      const uniquePlatforms = [...new Set((data || []).map(d => d.platform).filter(Boolean))];
      return uniquePlatforms.map(p => ({ id: p as string, name: p as string }));
    },
  });

  // Fetch owners (business owners) for filter dropdown
  const { data: ownersData } = useQuery({
    queryKey: ['business-request-roadmap-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_owners')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []).map(o => ({ id: o.id, name: o.name }));
    },
  });

  // Transform business requests into RoadmapItem format with Feature markers
  const items: RoadmapItem[] = (requestsData || []).map((request: any) => {
    // Title: "REQUEST_KEY – Title" or just "Title"
    const displayTitle = request.request_key 
      ? `${request.request_key} – ${request.title}` 
      : request.title;

    // Start date: start_date → created_at
    const startDate = request.start_date || request.created_at;
    
    // End date: end_date → null (open-ended)
    const endDate = request.end_date || null;

    // Lane: platform or business owner
    const platformName = request.platform || 'Unassigned';
    const platformId = request.platform || 'unassigned';

    // Owner for display
    const ownerName = request.business_owner || 'Unassigned';

    // Build Feature markers (milestones) for this Business Request
    const requestFeatures = featuresByRequestId[request.id] || [];
    const milestones: RoadmapItem['milestones'] = requestFeatures
      .map((feature: any) => {
        // Determine marker date
        const markerDate = feature.planned_end_date 
          || feature.actual_end_date 
          || feature.planned_start_date
          || feature.actual_start_date
          || feature.created_at;
        
        if (!markerDate) return null;

        // Map Feature status to milestone state
        const featureStatus = feature.status || 'funnel';
        const state = FEATURE_STATUS_TO_MILESTONE_STATE[featureStatus] || 'pending';

        return {
          step: 1 as const,
          date: markerDate,
          state,
          featureId: feature.id,
          featureName: feature.name,
          featureStatus,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((ms: any, index: number) => ({
        ...ms,
        step: (index + 1) as 1 | 2 | 3 | 4 | 5,
      }));

    return {
      id: request.id,
      key: request.request_key || `BR-${request.id.slice(0, 4).toUpperCase()}`,
      titleEn: displayTitle,
      titleAr: displayTitle,
      ownerEn: ownerName,
      ownerAr: ownerName,
      status: request.process_step || 'new_request',
      platform: platformId,
      rank: request.rank,
      startDate: startDate,
      endDate: endDate,
      milestones,
      risks: [],
      dependencies: [],
    };
  });

  return {
    items,
    isLoading: requestsLoading,
    error: requestsError as Error | null,
    platforms: platformsData || [],
    owners: ownersData || [],
  };
}

export default useBusinessRequestRoadmapItems;
