import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Demand, DemandOwner, DemandAssignee, DemandMilestone, PriorityTier, HealthStatus, PlannedQuarter } from '@/types/product-roadmap';
import { useProcessSteps } from '@/modules/kanban/hooks/useProcessSteps';

// Calculate progress based on process step order
function calculateProgress(processStep: string | null, processSteps: { value: string; sort_order: number }[]): number {
  if (!processStep) return 0;
  
  const step = processSteps.find(s => s.value === processStep);
  if (!step) return 0;
  
  const maxOrder = Math.max(...processSteps.map(s => s.sort_order), 1);
  return Math.round((step.sort_order / maxOrder) * 100);
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

// Extract quarters from planned_quarter array or end_date
function extractQuarters(plannedQuarters: string[] | null, endDate: Date | null): PlannedQuarter[] {
  const quarters: PlannedQuarter[] = [];
  
  if (plannedQuarters && plannedQuarters.length > 0) {
    for (const pq of plannedQuarters) {
      const q = pq.toUpperCase();
      if (q.includes('Q1')) quarters.push('Q1');
      else if (q.includes('Q2')) quarters.push('Q2');
      else if (q.includes('Q3')) quarters.push('Q3');
      else if (q.includes('Q4')) quarters.push('Q4');
    }
    if (quarters.length > 0) return [...new Set(quarters)]; // dedupe
  }
  
  // Derive from end_date if no planned_quarter
  if (endDate) {
    const month = endDate.getMonth();
    if (month <= 2) return ['Q1'];
    if (month <= 5) return ['Q2'];
    if (month <= 8) return ['Q3'];
    return ['Q4'];
  }
  
  return ['unplanned'];
}

// Legacy function for backward compat - returns first quarter
function extractQuarter(plannedQuarters: string[] | null, endDate: Date | null): PlannedQuarter {
  const quarters = extractQuarters(plannedQuarters, endDate);
  return quarters[0] || 'unplanned';
}

export function useProductRoadmapData() {
  // Fetch dynamic process steps from database
  const { data: processSteps = [] } = useProcessSteps();
  
  // Fetch business requests (demands) with extended fields
  const { data: demandsData = [], isLoading: demandsLoading } = useQuery({
    queryKey: ['product-roadmap-demands'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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
      return (data || []) as any[];
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

  // Fetch milestones from the milestones table using business_request_id
  const demandIds = demandsData.map(d => d.id);
  const { data: milestonesData = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['product-roadmap-milestones', demandIds],
    queryFn: async () => {
      if (demandIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('milestones')
        .select('id, title, start_date, end_date, state, business_request_id')
        .in('business_request_id', demandIds);
      
      if (error) throw error;
      
      // Map to expected format with date as the end_date (target date)
      return (data || []).map(m => ({
        id: m.id,
        title: m.title,
        date: m.end_date || m.start_date,
        status: m.state || 'pending',
        demand_id: m.business_request_id,
      }));
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

    // Use actual process_step value from DB, default to first step or 'new'
    const status = d.process_step || processSteps[0]?.value || 'new';
    
    // Calculate progress based on process step sort order
    const progress = calculateProgress(d.process_step, processSteps);

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
      plannedQuarters: extractQuarters(d.planned_quarter, endDate),
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
