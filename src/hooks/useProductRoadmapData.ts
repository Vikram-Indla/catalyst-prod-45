import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Demand, DemandOwner, DemandAssignee, DemandMilestone, DemandStatus, PriorityTier, HealthStatus, PlannedQuarter } from '@/types/product-roadmap';

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

// Map priority_tier from DB to PriorityTier
function mapPriorityTier(tier: string | null): PriorityTier {
  if (!tier) return 'unscored';
  const t = tier.toLowerCase();
  if (t === 'high' || t.includes('high')) return 'high';
  if (t === 'medium' || t.includes('medium')) return 'medium';
  if (t === 'low' || t.includes('low')) return 'low';
  return 'unscored';
}

// Map health from DB to HealthStatus
function mapHealth(health: string | null): HealthStatus {
  if (!health) return 'unknown';
  const h = health.toLowerCase().replace(/[_\s-]/g, '');
  if (h === 'ontrack' || h.includes('track') && !h.includes('off') && !h.includes('risk')) return 'on-track';
  if (h === 'atrisk' || h.includes('risk')) return 'at-risk';
  if (h === 'offtrack' || h.includes('off')) return 'off-track';
  return 'unknown';
}

// Extract quarter from planned_quarter or end_date
function extractQuarter(plannedQuarter: string | null, endDate: Date | null): PlannedQuarter {
  if (plannedQuarter) {
    const q = plannedQuarter.toUpperCase();
    if (q.includes('Q1') || q.includes('1')) return 'Q1';
    if (q.includes('Q2') || q.includes('2')) return 'Q2';
    if (q.includes('Q3') || q.includes('3')) return 'Q3';
    if (q.includes('Q4') || q.includes('4')) return 'Q4';
  }
  
  // Derive from end_date if no planned_quarter
  if (endDate) {
    const month = endDate.getMonth();
    if (month <= 2) return 'Q1';
    if (month <= 5) return 'Q2';
    if (month <= 8) return 'Q3';
    return 'Q4';
  }
  
  return 'unplanned';
}

export function useProductRoadmapData() {
  // Fetch business requests (demands) with extended fields
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
          assignee,
          delivery_platform,
          planned_quarter,
          priority_tier,
          health,
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

  // Fetch owners (business owners - from profiles or direct values)
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

  // Fetch assignees (profiles)
  const { data: assigneesData = [], isLoading: assigneesLoading } = useQuery({
    queryKey: ['product-roadmap-assignees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch milestones from business_request_links or a dedicated table
  const demandIds = demandsData.map(d => d.id);
  const { data: milestonesData = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['product-roadmap-milestones', demandIds],
    queryFn: async () => {
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

  // Also extract unique business owners from demands (string-based)
  const uniqueBusinessOwners = [...new Set(demandsData.map(d => d.business_owner).filter(Boolean))] as string[];
  const businessOwnersList: DemandOwner[] = uniqueBusinessOwners.map(name => ({
    id: name,
    name: name,
    initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  }));

  // Transform assignees
  const assignees: DemandAssignee[] = assigneesData.map(a => ({
    id: a.id,
    name: a.full_name || 'Unknown',
    initials: (a.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  }));

  // Also extract unique assignees from demands (string-based)
  const uniqueAssignees = [...new Set(demandsData.map(d => d.assignee).filter(Boolean))] as string[];
  const assigneesList: DemandAssignee[] = uniqueAssignees.map(name => ({
    id: name,
    name: name,
    initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  }));

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
      assigneeId: d.assignee || '',
      assigneeName: d.assignee || 'Unassigned',
      platform: d.delivery_platform || 'Unassigned',
      startDate,
      endDate,
      rank: d.rank,
      progress,
      milestones,
      plannedQuarter: extractQuarter(d.planned_quarter, endDate),
      priorityTier: mapPriorityTier(d.priority_tier),
      health: mapHealth(d.health),
    };
  });

  return {
    demands,
    owners: businessOwnersList.length > 0 ? businessOwnersList : owners,
    assignees: assigneesList.length > 0 ? assigneesList : assignees,
    platforms,
    isLoading: demandsLoading || ownersLoading || assigneesLoading || milestonesLoading,
  };
}
