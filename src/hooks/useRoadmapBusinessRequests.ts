import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BusinessRequestRoadmapItem, RoadmapStatus, MilestoneState } from '@/data/roadmapSeed';

// Map process_step to RoadmapStatus
function mapProcessStepToStatus(processStep: string | null): RoadmapStatus {
  const step = (processStep || '').toLowerCase().replace(/[_-]/g, '');
  
  switch (step) {
    case 'newrequest':
    case 'new':
      return 'NEW';
    case 'analyse':
    case 'analysis':
    case 'understudy':
      return 'ANALYSE';
    case 'approved':
    case 'approval':
      return 'APPROVED';
    case 'implement':
    case 'implementation':
      return 'IMPLEMENT';
    case 'closed':
    case 'complete':
    case 'done':
      return 'CLOSED';
    default:
      return 'NEW';
  }
}

// Map milestone state to roadmap milestone state
function mapMilestoneState(state: string | null): MilestoneState {
  const s = (state || '').toLowerCase().replace(/[_-]/g, '');
  
  switch (s) {
    case 'completed':
    case 'complete':
    case 'done':
      return 'complete';
    case 'ontrack':
    case 'inprogress':
    case 'current':
      return 'current';
    case 'pending':
    case 'notstarted':
    default:
      return 'pending';
  }
}

interface MilestoneRow {
  id: string;
  title: string;
  start_date: string | null;
  due_date: string | null;
  state: string | null;
  business_request_id: string;
}

export function useRoadmapBusinessRequests() {
  return useQuery({
    queryKey: ['roadmap-business-requests'],
    queryFn: async () => {
      // Fetch business requests
      const { data: requests, error: reqError } = await supabase
        .from('business_requests')
        .select('id, request_key, title, business_owner, process_step, start_date, end_date, rank, delivery_platform, health')
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });

      if (reqError) throw reqError;

      // Fetch all milestones for these business requests
      const requestIds = (requests || []).map(r => r.id);
      let milestones: MilestoneRow[] = [];
      
      if (requestIds.length > 0) {
        const { data: milestoneData, error: msError } = await supabase
          .from('milestones')
          .select('id, title, start_date, due_date, state, business_request_id')
          .in('business_request_id', requestIds)
          .order('due_date', { ascending: true });

        if (msError) throw msError;
        milestones = milestoneData || [];
      }

      // Group milestones by business_request_id
      const milestonesByRequest: Record<string, MilestoneRow[]> = {};
      milestones.forEach(ms => {
        if (!milestonesByRequest[ms.business_request_id]) {
          milestonesByRequest[ms.business_request_id] = [];
        }
        milestonesByRequest[ms.business_request_id].push(ms);
      });

      // Transform to roadmap items
      const roadmapItems: BusinessRequestRoadmapItem[] = (requests || [])
        .filter(r => r.request_key) // Only include requests with a key
        .map((r, index) => {
          const requestMilestones = milestonesByRequest[r.id] || [];
          
          // Calculate start and end dates - use request dates or fallback
          let startDate = r.start_date;
          let endDate = r.end_date;
          
          // If no dates on request, try to derive from milestones
          if (!startDate && requestMilestones.length > 0) {
            const firstMs = requestMilestones[0];
            startDate = firstMs.start_date || firstMs.due_date;
          }
          if (!endDate && requestMilestones.length > 0) {
            const lastMs = requestMilestones[requestMilestones.length - 1];
            endDate = lastMs.due_date || lastMs.start_date;
          }
          
          // Default fallback dates if still missing
          if (!startDate) startDate = new Date().toISOString().split('T')[0];
          if (!endDate) {
            const defaultEnd = new Date();
            defaultEnd.setMonth(defaultEnd.getMonth() + 3);
            endDate = defaultEnd.toISOString().split('T')[0];
          }

          // Transform milestones
          const transformedMilestones = requestMilestones.map((ms, msIndex) => {
            // Use due_date for positioning, fallback to start_date
            const milestoneDate = ms.due_date || ms.start_date || endDate;
            
            return {
              step: (msIndex + 1) as 1 | 2 | 3 | 4 | 5,
              date: milestoneDate!,
              state: mapMilestoneState(ms.state),
            };
          });

          return {
            id: r.request_key!,
            titleEn: r.title || 'Untitled',
            titleAr: r.title || 'بدون عنوان',
            ownerEn: r.business_owner || 'Unassigned',
            ownerAr: r.business_owner || 'غير معين',
            status: mapProcessStepToStatus(r.process_step),
            platform: r.delivery_platform || 'Other',
            rank: r.rank ?? index + 1,
            startDate: startDate!,
            endDate: endDate!,
            milestones: transformedMilestones,
            risks: [],
            dependencies: [],
          };
        });

      return roadmapItems;
    },
    staleTime: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
  });
}
