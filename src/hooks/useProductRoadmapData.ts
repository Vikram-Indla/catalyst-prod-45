import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Demand, DemandOwner, DemandMilestone, DemandStatus } from '@/types/product-roadmap';

// Map process_step to DemandStatus
function mapProcessStepToStatus(processStep: string | null): DemandStatus {
  if (!processStep) return 'new';
  const step = processStep.toLowerCase().replace(/[_\s]/g, '-');
  
  if (step.includes('new') || step.includes('submit')) return 'new';
  if (step.includes('analy') || step.includes('review')) return 'analyse';
  if (step.includes('approv')) return 'approved';
  if (step.includes('implement') || step.includes('progress')) return 'implement';
  if (step.includes('close') || step.includes('complete') || step.includes('done')) return 'closed';
  if (step.includes('hold') || step.includes('block')) return 'on-hold';
  
  return 'new';
}

export function useProductRoadmapData() {
  // Fetch business requests (demands)
  const { data: demandsData = [], isLoading: demandsLoading } = useQuery({
    queryKey: ['product-roadmap-demands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select(`
          id,
          request_key,
          title,
          process_step,
          business_owner,
          delivery_platform,
          start_date,
          end_date,
          rank,
          updated_at,
          created_at
        `)
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch owners (profiles)
  const { data: ownersData = [], isLoading: ownersLoading } = useQuery({
    queryKey: ['product-roadmap-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch milestones (if they exist - otherwise empty)
  const demandIds = demandsData.map(d => d.id);
  const { data: milestonesData = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['product-roadmap-milestones', demandIds],
    queryFn: async () => {
      // Check if milestones table exists and has demand-related data
      // For now, return empty - milestones can be added later
      return [] as { id: string; title: string; date: string; status: string; demand_id: string }[];
    },
    enabled: demandIds.length > 0,
  });

  // Get unique platforms from data
  const platforms = [...new Set(demandsData.map(d => d.delivery_platform).filter(Boolean))] as string[];

  // Transform owners
  const owners: DemandOwner[] = ownersData.map(o => ({
    id: o.id,
    name: o.full_name || 'Unknown',
    initials: (o.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  }));

  // Create owner lookup for name resolution
  const ownerLookup: Record<string, string> = {};
  demandsData.forEach(d => {
    if (d.business_owner) {
      ownerLookup[d.business_owner] = d.business_owner;
    }
  });

  // Group milestones by demand
  const milestonesByDemand = milestonesData.reduce((acc, m) => {
    if (!acc[m.demand_id]) acc[m.demand_id] = [];
    acc[m.demand_id].push(m);
    return acc;
  }, {} as Record<string, typeof milestonesData>);

  // Transform demands
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  const demands: Demand[] = demandsData.map((d, index) => {
    const demandMilestones = milestonesByDemand[d.id] || [];
    
    // Default dates: start from created_at or current quarter start, end is end of year or target date
    const startDate = d.start_date 
      ? new Date(d.start_date) 
      : d.created_at 
        ? new Date(d.created_at) 
        : new Date(currentYear, Math.floor(currentDate.getMonth() / 3) * 3, 1);
    
    const endDate = d.end_date 
      ? new Date(d.end_date) 
      : new Date(currentYear, 11, 31);

    // Calculate progress based on status
    const statusProgress: Record<DemandStatus, number> = {
      'new': 0,
      'analyse': 25,
      'approved': 50,
      'implement': 75,
      'closed': 100,
      'on-hold': 0,
    };
    const status = mapProcessStepToStatus(d.process_step);
    const progress = statusProgress[status] || 0;

    const milestones: DemandMilestone[] = demandMilestones.map(m => ({
      id: m.id,
      title: m.title,
      date: new Date(m.date),
      status: (m.status as DemandMilestone['status']) || 'pending',
      demandId: d.id,
    }));

    return {
      id: d.id,
      key: d.request_key || `MIM-${String(index + 1).padStart(3, '0')}`,
      title: d.title,
      status,
      ownerId: d.business_owner || '',
      ownerName: d.business_owner || 'Unassigned',
      platform: d.delivery_platform || 'Unassigned',
      startDate,
      endDate,
      rank: d.rank,
      progress,
      milestones,
    };
  });

  return {
    demands,
    owners,
    platforms,
    isLoading: demandsLoading || ownersLoading || milestonesLoading,
  };
}
