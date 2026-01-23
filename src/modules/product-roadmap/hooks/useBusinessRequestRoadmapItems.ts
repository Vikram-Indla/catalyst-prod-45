// useBusinessRequestRoadmapItems - Fetches business requests and transforms them into RoadmapItem format
// For Industry Business Request Roadmap
// Cloned from useEpicRoadmapItems with business_requests as data source

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoadmapItem } from '@/config/roadmaps/types';

interface BusinessRequestRoadmapFilters {
  status?: string[];
  ownerIds?: string[];
  productIds?: string[];
  health?: string[];
}

interface UseBusinessRequestRoadmapItemsResult {
  items: RoadmapItem[];
  isLoading: boolean;
  error: Error | null;
  products: Array<{ id: string; name: string }>;
  owners: Array<{ id: string; name: string }>;
}

// Feature status to milestone state mapping (same as epic roadmap)
const FEATURE_STATUS_TO_MILESTONE_STATE: Record<string, 'complete' | 'current' | 'pending'> = {
  'done': 'complete',
  'implementing': 'current',
  'analyzing': 'current',
  'backlog': 'pending',
  'funnel': 'pending',
};

// Map business request process_step to status for roadmap display
const PROCESS_STEP_TO_STATUS: Record<string, string> = {
  'new': 'proposed',
  'demand_analysis': 'analyzing',
  'solution_review': 'analyzing',
  'approved': 'approved',
  'in_progress': 'in_progress',
  'implementation': 'in_progress',
  'done': 'done',
  'closed': 'done',
  'cancelled': 'cancelled',
  'rejected': 'cancelled',
  'on_hold': 'analyzing',
};

export function useBusinessRequestRoadmapItems(
  filters?: BusinessRequestRoadmapFilters
): UseBusinessRequestRoadmapItemsResult {
  // Fetch business requests with product info
  const { data: requestsData, isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['business-request-roadmap-items', filters],
    queryFn: async () => {
      let query = (supabase as any)
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
          impl_start_date,
          impl_target_end_date,
          business_owner,
          business_owner_id,
          product_id,
          rank,
          progress,
          created_at,
          products (
            id,
            name,
            code
          )
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
      if (filters?.productIds && filters.productIds.length > 0) {
        query = query.in('product_id', filters.productIds);
      }
      if (filters?.health && filters.health.length > 0) {
        query = query.in('health', filters.health);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Get request IDs for fetching linked features
  const requestIds = (requestsData || []).map((r: any) => r.id);

  // Fetch linked features for the business requests via business_request_links
  const { data: linksData } = useQuery({
    queryKey: ['business-request-roadmap-links', requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('business_request_links')
        .select(`
          id,
          business_request_id,
          linked_item_id,
          linked_item_type
        `)
        .in('business_request_id', requestIds)
        .eq('linked_item_type', 'feature');

      if (error) throw error;
      return data || [];
    },
    enabled: requestIds.length > 0,
  });

  // Get feature IDs from links
  const featureIds = (linksData || []).map((link: any) => link.linked_item_id).filter(Boolean);

  // Fetch feature details
  const { data: featuresData } = useQuery({
    queryKey: ['business-request-roadmap-features', featureIds],
    queryFn: async () => {
      if (featureIds.length === 0) return [];

      const { data, error } = await supabase
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

      if (error) throw error;
      return data || [];
    },
    enabled: featureIds.length > 0,
  });

  // Create a map of feature id to feature data
  const featureMap = (featuresData || []).reduce((acc: Record<string, any>, feature: any) => {
    acc[feature.id] = feature;
    return acc;
  }, {});

  // Group features by business_request_id via links
  const featuresByRequestId = (linksData || []).reduce((acc: Record<string, any[]>, link: any) => {
    if (!link.business_request_id || !link.linked_item_id) return acc;
    const feature = featureMap[link.linked_item_id];
    if (!feature) return acc;
    if (!acc[link.business_request_id]) acc[link.business_request_id] = [];
    acc[link.business_request_id].push(feature);
    return acc;
  }, {});

  // Fetch all products for filter dropdown
  const { data: productsData } = useQuery({
    queryKey: ['business-request-roadmap-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch owners (business_owners) for filter dropdown
  const { data: ownersData } = useQuery({
    queryKey: ['business-request-roadmap-owners'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('business_owners')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return ((data || []) as Array<{ id: string; name: string }>).map(o => ({ id: o.id, name: o.name || 'Unknown' }));
    },
  });

  // Transform business requests into RoadmapItem format with Feature markers
  const items: RoadmapItem[] = (requestsData || []).map((request: any) => {
    // Title: "REQUEST_KEY – Title" or just "Title"
    const displayTitle = request.request_key 
      ? `${request.request_key} – ${request.title}` 
      : request.title;

    // Start date: impl_start_date → start_date → created_at
    const startDate = request.impl_start_date 
      || request.start_date 
      || request.created_at;
    
    // End date: impl_target_end_date → end_date → null (open-ended)
    const endDate = request.impl_target_end_date 
      || request.end_date 
      || null;

    // Lane: product info
    const productName = request.products?.name || 'No Product';
    const productId = request.product_id || 'no-product';

    // Map process_step to roadmap status
    const mappedStatus = PROCESS_STEP_TO_STATUS[request.process_step] || 'proposed';

    // Build Feature markers (milestones) for this Business Request
    const requestFeatures = featuresByRequestId[request.id] || [];
    const milestones: RoadmapItem['milestones'] = requestFeatures
      .map((feature: any) => {
        // Determine marker date: target/end date → start date → created_at
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
          step: 1 as const, // Will be renumbered below
          date: markerDate,
          state,
          // Attach feature data for tooltips/click
          featureId: feature.id,
          featureName: feature.name,
          featureStatus,
        };
      })
      .filter(Boolean)
      // Sort by date chronologically
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      // Renumber in order (1, 2, 3...)
      .map((ms: any, index: number) => ({
        ...ms,
        step: (index + 1) as 1 | 2 | 3 | 4 | 5,
      }));

    return {
      id: request.id,
      key: request.request_key || `BR-${request.id.slice(0, 4).toUpperCase()}`,
      titleEn: displayTitle,
      titleAr: displayTitle, // Business request titles are typically not localized
      ownerEn: productName, // Using product as the "owner" lane label
      ownerAr: productName,
      status: mappedStatus,
      platform: productId, // Using platform field to store product_id for lane grouping
      rank: request.rank,
      startDate: startDate,
      endDate: endDate,
      milestones, // Linked Features as markers
      risks: [],
      dependencies: [],
    };
  });

  return {
    items,
    isLoading: requestsLoading,
    error: requestsError as Error | null,
    products: productsData || [],
    owners: ownersData || [],
  };
}

export default useBusinessRequestRoadmapItems;
