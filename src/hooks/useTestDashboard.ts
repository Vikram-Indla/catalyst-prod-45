import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectMetrics, ActivityTrendData, MyWorkItem, ActivityFeedItem } from '@/types/dashboard.types';
import { format, subDays } from 'date-fns';

// Fetch project metrics (program-scoped)
export const useProjectMetrics = (programId?: string) => {
  return useQuery({
    queryKey: ['test-metrics', programId],
    queryFn: async (): Promise<ProjectMetrics> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let casesQuery = supabase.from('test_cases').select('id', { count: 'exact', head: true });
      let setsQuery = supabase.from('test_sets').select('id', { count: 'exact', head: true });
      let cyclesQuery = supabase.from('test_cycles').select('id', { count: 'exact', head: true });
      let draftCasesQuery = supabase.from('test_cases').select('id', { count: 'exact', head: true }).eq('status', 'draft').eq('created_by', user.id);
      let activeCyclesQuery = supabase.from('test_cycles').select('id', { count: 'exact', head: true }).in('status', ['planned', 'in_progress']);

      // Apply program filter if programId provided
      if (programId) {
        casesQuery = casesQuery.eq('program_id', programId);
        setsQuery = setsQuery.eq('program_id', programId);
        cyclesQuery = cyclesQuery.eq('program_id', programId);
        draftCasesQuery = draftCasesQuery.eq('program_id', programId);
        activeCyclesQuery = activeCyclesQuery.eq('program_id', programId);
      }

      // Get all counts in parallel
      const [casesResult, setsResult, cyclesResult, draftCasesResult, activeCyclesResult] = await Promise.all([
        casesQuery,
        setsQuery,
        cyclesQuery,
        draftCasesQuery,
        activeCyclesQuery,
      ]);

      return {
        total_cases: casesResult.count || 0,
        total_sets: setsResult.count || 0,
        total_cycles: cyclesResult.count || 0,
        total_defects: 0, // Defects are tracked separately
        draft_cases: draftCasesResult.count || 0,
        active_cycles: activeCyclesResult.count || 0,
        open_defects: 0, // Defects are tracked separately
      };
    },
    enabled: !!programId,
  });
};

// Fetch activity trends
export const useActivityTrends = (days: number = 30, view: 'cases' | 'executions' | 'sets' = 'cases') => {
  return useQuery({
    queryKey: ['test-activity-trends', days, view],
    queryFn: async (): Promise<ActivityTrendData[]> => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      // Generate array of dates
      const dates: ActivityTrendData[] = [];
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(endDate, days - i), 'yyyy-MM-dd');
        dates.push({
          date,
          cases_created: 0,
          cases_edited: 0,
          executions_completed: 0,
        });
      }

      if (view === 'cases') {
        // Fetch test cases created in date range
        const { data: cases } = await supabase
          .from('test_cases')
          .select('created_at, updated_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Count cases by date
        cases?.forEach((testCase) => {
          const dateStr = format(new Date(testCase.created_at), 'yyyy-MM-dd');
          const dateEntry = dates.find(d => d.date === dateStr);
          if (dateEntry) {
            dateEntry.cases_created += 1;
          }
        });
      } else if (view === 'executions') {
        // Fetch test executions completed in date range
        const { data: executions } = await supabase
          .from('test_executions')
          .select('execution_date')
          .gte('execution_date', startDate.toISOString())
          .lte('execution_date', endDate.toISOString())
          .not('execution_date', 'is', null);

        // Count executions by date
        executions?.forEach((execution) => {
          const dateStr = format(new Date(execution.execution_date!), 'yyyy-MM-dd');
          const dateEntry = dates.find(d => d.date === dateStr);
          if (dateEntry) {
            dateEntry.executions_completed += 1;
          }
        });
      }

      return dates;
    },
  });
};

// Fetch user's assigned work
export const useMyWork = (filter: 'all' | 'cases' | 'executions' | 'cycles' = 'all') => {
  return useQuery({
    queryKey: ['test-my-work', filter],
    queryFn: async (): Promise<MyWorkItem[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const workItems: MyWorkItem[] = [];

      // Fetch assigned test cases
      if (filter === 'all' || filter === 'cases') {
        const { data: cases } = await supabase
          .from('test_cases')
          .select('id, title, status, priority, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        cases?.forEach((testCase) => {
          workItems.push({
            id: testCase.id,
            type: 'test_case',
            title: testCase.title,
            status: testCase.status,
            priority: testCase.priority,
            assigned_date: testCase.created_at,
          });
        });
      }

      // Fetch pending test executions
      if (filter === 'all' || filter === 'executions') {
        const { data: executions } = await supabase
          .from('test_executions')
          .select('id, test_case_id, status, created_at, test_cases(title, priority)')
          .eq('executed_by', user.id)
          .eq('status', 'not_run')
          .order('created_at', { ascending: false })
          .limit(10);

        executions?.forEach((execution: any) => {
          workItems.push({
            id: execution.id,
            type: 'test_execution',
            title: execution.test_cases?.title || 'Untitled Test',
            status: execution.status,
            priority: execution.test_cases?.priority || 'medium',
            assigned_date: execution.created_at,
          });
        });
      }

      // Fetch active cycles
      if (filter === 'all' || filter === 'cycles') {
        const { data: cycles } = await supabase
          .from('test_cycles')
          .select('id, name, status, created_at')
          .in('status', ['planned', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5);

        cycles?.forEach((cycle) => {
          workItems.push({
            id: cycle.id,
            type: 'test_cycle',
            title: cycle.name,
            status: cycle.status,
            priority: 'medium',
            assigned_date: cycle.created_at,
          });
        });
      }

      // Sort by assigned date
      return workItems.sort((a, b) => 
        new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime()
      );
    },
  });
};

// Fetch activity feed (program-scoped)
export const useActivityFeed = (filter: 'everyone' | 'me' | 'all' = 'everyone', limit: number = 20, offset: number = 0, programId?: string) => {
  return useQuery({
    queryKey: ['test-activity-feed', filter, limit, offset, programId],
    queryFn: async (): Promise<ActivityFeedItem[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('test_activity_log')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply program filter if provided
      if (programId) {
        query = query.eq('program_id', programId);
      }

      // Apply user filter
      if (filter === 'me') {
        query = query.eq('user_id', user.id);
      }

      const { data: activities } = await query;

      return activities?.map((activity: any) => ({
        id: activity.id,
        user_name: activity.profiles?.full_name || activity.profiles?.email || 'Unknown User',
        activity_type: activity.activity_type,
        entity_type: activity.entity_type,
        entity_id: activity.entity_id,
        entity_title: activity.entity_title,
        description: activity.description,
        created_at: activity.created_at,
      })) || [];
    },
  });
};

// Create/ensure Adhoc cycle exists (program-scoped)
export const useCreateAdhocCycle = (programId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!programId) throw new Error('Program ID required');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if Adhoc cycle already exists for this program
      const { data: existing } = await supabase
        .from('test_cycles')
        .select('id')
        .eq('program_id', programId)
        .eq('is_adhoc', true)
        .maybeSingle();

      if (existing) {
        return existing.id;
      }

      // Create Adhoc cycle
      const { data, error } = await supabase
        .from('test_cycles')
        .insert({
          name: 'Adhoc Cycle',
          description: 'Default cycle for unplanned testing. Created automatically.',
          program_id: programId,
          status: 'planned',
          is_adhoc: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
    },
  });
};

// Log activity
export const useLogActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activity_type,
      entity_type,
      entity_id,
      entity_title,
      description,
    }: {
      activity_type: string;
      entity_type: string;
      entity_id: string;
      entity_title: string;
      description: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_activity_log')
        .insert({
          user_id: user.id,
          activity_type,
          entity_type,
          entity_id,
          entity_title,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-activity-feed'] });
    },
  });
};
