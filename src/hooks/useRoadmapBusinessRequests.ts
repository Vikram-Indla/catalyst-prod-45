import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BusinessRequestRoadmapItem, RoadmapStatus, MilestoneState } from '@/types/roadmapTypes';

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

      // Transform to roadmap items with date normalization
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
          
          // --- DATE NORMALIZATION ---
          // Normalize dates to fall within reasonable demo range (2025-2026)
          const currentYear = new Date().getFullYear();
          const demoStartYear = currentYear; // 2025
          const demoEndYear = currentYear + 1; // 2026
          
          const normalizeDate = (dateStr: string | null, isEndDate: boolean): string => {
            if (!dateStr) {
              // Generate default date if missing
              const baseMonth = Math.floor(Math.random() * 6) + (isEndDate ? 6 : 0); // Start: Jan-Jun, End: Jul-Dec
              return `${demoStartYear}-${String(baseMonth + 1).padStart(2, '0')}-15`;
            }
            
            const date = new Date(dateStr);
            const year = date.getFullYear();
            
            // If date is too far in the past (before current year - 1)
            if (year < demoStartYear - 1) {
              const newYear = demoStartYear + (index % 2); // Distribute between 2025 and 2026
              return `${newYear}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }
            
            // If date is too far in the future (after 2027)
            if (year > demoEndYear + 1) {
              const newYear = demoStartYear + (index % 2);
              return `${newYear}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }
            
            return dateStr;
          };
          
          // Normalize the dates
          startDate = normalizeDate(startDate, false);
          endDate = normalizeDate(endDate, true);
          
          // Ensure end date is after start date
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (end <= start) {
            // Set end date to 60-90 days after start
            const newEnd = new Date(start);
            newEnd.setDate(newEnd.getDate() + 60 + Math.floor(Math.random() * 30));
            endDate = newEnd.toISOString().split('T')[0];
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
