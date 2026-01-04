// ============================================================================
// HOOK: useTestCases
// File: /hooks/test-management/useTestCases.ts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TMTestCase, 
  TMCaseStep, 
  CaseFilters, 
  CreateCaseInput, 
  UpdateCaseInput,
} from '@/types/test-management';
import { toast } from 'sonner';

// Map our type status to database enum
type DbCaseStatus = 'draft' | 'ready' | 'approved' | 'deprecated';
const statusToDb = (status: string): DbCaseStatus => {
  const map: Record<string, DbCaseStatus> = {
    'DRAFT': 'draft',
    'REVIEW': 'ready',
    'APPROVED': 'approved',
    'DEPRECATED': 'deprecated',
  };
  return map[status] || 'draft';
};

const statusFromDb = (status: string | null): string => {
  const map: Record<string, string> = {
    'draft': 'DRAFT',
    'ready': 'REVIEW',
    'approved': 'APPROVED',
    'deprecated': 'DEPRECATED',
  };
  return map[status || 'draft'] || 'DRAFT';
};

// ============================================================================
// FETCH TEST CASES (with filters)
// ============================================================================

export function useTestCases(projectId: string | undefined, filters?: CaseFilters) {
  return useQuery({
    queryKey: ['tm-cases', projectId, filters],
    queryFn: async (): Promise<{ cases: TMTestCase[]; total: number }> => {
      if (!projectId) return { cases: [], total: 0 };

      let query = supabase
        .from('tm_test_cases')
        .select(`
          *,
          priority:tm_case_priorities(*),
          type:tm_case_types(*),
          folder:tm_folders(id, name, path),
          created_by_user:profiles!tm_test_cases_created_by_fkey(id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters?.folder_id) {
        if (filters.folder_id === 'unfiled') {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', filters.folder_id);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          const dbStatuses = filters.status.map(s => statusToDb(s));
          query = query.in('status', dbStatuses);
        } else {
          query = query.eq('status', statusToDb(filters.status));
        }
      }

      if (filters?.priority_id) {
        query = query.eq('priority_id', filters.priority_id);
      }

      if (filters?.type_id) {
        query = query.eq('case_type_id', filters.type_id);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,case_key.ilike.%${filters.search}%`);
      }

      // Pagination
      const page = filters?.page || 1;
      const perPage = filters?.per_page || 25;
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching test cases:', error);
        throw error;
      }

      // Map to our types
      const cases = (data || []).map(c => ({
        ...c,
        key: c.case_key,
        status: statusFromDb(c.status),
        type_id: c.case_type_id,
        updated_by: c.created_by,
        version: c.version || 1,
        objective: c.description,
      })) as unknown as TMTestCase[];

      return {
        cases,
        total: count || 0,
      };
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// FETCH SINGLE TEST CASE (with steps)
// ============================================================================

export function useTestCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case', caseId],
    queryFn: async (): Promise<TMTestCase | null> => {
      if (!caseId) return null;

      // Fetch case
      const { data: testCase, error: caseError } = await supabase
        .from('tm_test_cases')
        .select(`
          *,
          priority:tm_case_priorities(*),
          type:tm_case_types(*),
          folder:tm_folders(id, name, path),
          created_by_user:profiles!tm_test_cases_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('id', caseId)
        .maybeSingle();

      if (caseError) throw caseError;
      if (!testCase) return null;

      // Fetch steps
      const { data: steps, error: stepsError } = await supabase
        .from('tm_test_steps')
        .select('*')
        .eq('test_case_id', caseId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Fetch labels
      const { data: caseLabels, error: labelsError } = await supabase
        .from('tm_case_labels')
        .select(`
          label:tm_labels(*)
        `)
        .eq('test_case_id', caseId);

      if (labelsError) throw labelsError;

      // Map steps to our type
      const mappedSteps = (steps || []).map(s => ({
        id: s.id,
        case_id: s.test_case_id,
        step_number: s.step_number,
        action: s.action,
        test_data: s.test_data,
        expected_result: s.expected_result || '',
        created_at: s.created_at || '',
        updated_at: s.updated_at || '',
      })) as TMCaseStep[];

      return {
        ...testCase,
        key: testCase.case_key,
        status: statusFromDb(testCase.status),
        type_id: testCase.case_type_id,
        updated_by: testCase.created_by || '',
        version: testCase.version || 1,
        objective: testCase.description,
        steps: mappedSteps,
        labels: caseLabels?.map(cl => cl.label).filter(Boolean) || [],
      } as unknown as TMTestCase;
    },
    enabled: !!caseId,
  });
}

// ============================================================================
// FETCH CASE STEPS
// ============================================================================

export function useTestCaseSteps(caseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-steps', caseId],
    queryFn: async (): Promise<TMCaseStep[]> => {
      if (!caseId) return [];

      const { data, error } = await supabase
        .from('tm_test_steps')
        .select('*')
        .eq('test_case_id', caseId)
        .order('step_number', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(s => ({
        id: s.id,
        case_id: s.test_case_id,
        step_number: s.step_number,
        action: s.action,
        test_data: s.test_data,
        expected_result: s.expected_result || '',
        created_at: s.created_at || '',
        updated_at: s.updated_at || '',
      })) as TMCaseStep[];
    },
    enabled: !!caseId,
  });
}

// ============================================================================
// GENERATE CASE KEY
// ============================================================================

async function generateCaseKey(projectId: string): Promise<string> {
  // Get project prefix
  const { data: project } = await supabase
    .from('tm_projects')
    .select('key')
    .eq('id', projectId)
    .maybeSingle();

  const prefix = project?.key || 'TC';

  // Try to use the database function
  const { data, error } = await supabase.rpc('tm_next_entity_key', {
    p_prefix: prefix,
    p_project_id: projectId,
  });

  if (!error && data) {
    return data;
  }

  // Fallback: generate manually
  const { count } = await supabase
    .from('tm_test_cases')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const nextNum = (count || 0) + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

// ============================================================================
// CREATE TEST CASE
// ============================================================================

export function useCreateTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCaseInput & { project_id: string }): Promise<TMTestCase> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate key
      const caseKey = await generateCaseKey(input.project_id);

      // Create case
      const { data: testCase, error: caseError } = await supabase
        .from('tm_test_cases')
        .insert({
          project_id: input.project_id,
          case_key: caseKey,
          title: input.title,
          description: input.objective,
          preconditions: input.preconditions,
          status: statusToDb(input.status || 'DRAFT'),
          folder_id: input.folder_id || null,
          priority_id: input.priority_id || null,
          case_type_id: input.type_id || null,
          version: 1,
          created_by: user.id,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Create steps if provided
      if (input.steps && input.steps.length > 0) {
        const stepsToInsert = input.steps.map((step, index) => ({
          test_case_id: testCase.id,
          step_number: index + 1,
          action: step.action,
          test_data: step.test_data || null,
          expected_result: step.expected_result,
        }));

        const { error: stepsError } = await supabase
          .from('tm_test_steps')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }

      // Add labels if provided
      if (input.label_ids && input.label_ids.length > 0) {
        const labelsToInsert = input.label_ids.map(labelId => ({
          test_case_id: testCase.id,
          label_id: labelId,
        }));

        const { error: labelsError } = await supabase
          .from('tm_case_labels')
          .insert(labelsToInsert);

        if (labelsError) console.error('Error adding labels:', labelsError);
      }

      return {
        ...testCase,
        key: testCase.case_key,
        status: statusFromDb(testCase.status),
      } as unknown as TMTestCase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', data.project_id] });
      toast.success('Test case created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create test case: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE TEST CASE
// ============================================================================

export function useUpdateTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCaseInput & { project_id: string }): Promise<TMTestCase> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { id, steps, label_ids, project_id, ...updates } = input;

      // Get current version
      const { data: current } = await supabase
        .from('tm_test_cases')
        .select('version')
        .eq('id', id)
        .maybeSingle();

      // Map updates to db columns
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.objective !== undefined) dbUpdates.description = updates.objective;
      if (updates.preconditions !== undefined) dbUpdates.preconditions = updates.preconditions;
      if (updates.status) dbUpdates.status = statusToDb(updates.status);
      if (updates.folder_id !== undefined) dbUpdates.folder_id = updates.folder_id;
      if (updates.priority_id !== undefined) dbUpdates.priority_id = updates.priority_id;
      if (updates.type_id !== undefined) dbUpdates.case_type_id = updates.type_id;
      dbUpdates.version = (current?.version || 0) + 1;

      // Update case
      const { data: testCase, error: caseError } = await supabase
        .from('tm_test_cases')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (caseError) throw caseError;

      // Update steps if provided
      if (steps !== undefined) {
        // Delete existing steps
        await supabase.from('tm_test_steps').delete().eq('test_case_id', id);

        // Insert new steps
        if (steps.length > 0) {
          const stepsToInsert = steps.map((step, index) => ({
            test_case_id: id,
            step_number: index + 1,
            action: step.action,
            test_data: step.test_data || null,
            expected_result: step.expected_result,
          }));

          const { error: stepsError } = await supabase
            .from('tm_test_steps')
            .insert(stepsToInsert);

          if (stepsError) throw stepsError;
        }
      }

      // Update labels if provided
      if (label_ids !== undefined) {
        // Delete existing labels
        await supabase.from('tm_case_labels').delete().eq('test_case_id', id);

        // Insert new labels
        if (label_ids.length > 0) {
          const labelsToInsert = label_ids.map(labelId => ({
            test_case_id: id,
            label_id: labelId,
          }));

          await supabase.from('tm_case_labels').insert(labelsToInsert);
        }
      }

      return {
        ...testCase,
        key: testCase.case_key,
        status: statusFromDb(testCase.status),
      } as unknown as TMTestCase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.id] });
      toast.success('Test case updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update test case: ${error.message}`);
    },
  });
}

// ============================================================================
// DELETE TEST CASE
// ============================================================================

export function useDeleteTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<void> => {
      const { error } = await supabase
        .from('tm_test_cases')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      toast.success('Test case deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete test case: ${error.message}`);
    },
  });
}

// ============================================================================
// CLONE TEST CASE
// ============================================================================

export function useCloneTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<TMTestCase> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch original case with steps
      const { data: original, error: fetchError } = await supabase
        .from('tm_test_cases')
        .select('*')
        .eq('id', input.id)
        .single();

      if (fetchError) throw fetchError;

      const { data: steps } = await supabase
        .from('tm_test_steps')
        .select('*')
        .eq('test_case_id', input.id)
        .order('step_number');

      // Generate new key
      const caseKey = await generateCaseKey(input.project_id);

      // Create cloned case
      const { data: cloned, error: cloneError } = await supabase
        .from('tm_test_cases')
        .insert({
          project_id: original.project_id,
          case_key: caseKey,
          title: `${original.title} (Copy)`,
          description: original.description,
          preconditions: original.preconditions,
          status: 'draft',
          folder_id: original.folder_id,
          priority_id: original.priority_id,
          case_type_id: original.case_type_id,
          version: 1,
          created_by: user.id,
        })
        .select()
        .single();

      if (cloneError) throw cloneError;

      // Clone steps
      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map(step => ({
          test_case_id: cloned.id,
          step_number: step.step_number,
          action: step.action,
          test_data: step.test_data,
          expected_result: step.expected_result,
        }));

        await supabase.from('tm_test_steps').insert(stepsToInsert);
      }

      return {
        ...cloned,
        key: cloned.case_key,
        status: statusFromDb(cloned.status),
      } as unknown as TMTestCase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', data.project_id] });
      toast.success('Test case cloned');
    },
    onError: (error: Error) => {
      toast.error(`Failed to clone test case: ${error.message}`);
    },
  });
}

// ============================================================================
// MOVE TEST CASE TO FOLDER
// ============================================================================

export function useMoveTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      case_ids: string[]; 
      folder_id: string | null;
      project_id: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ folder_id: input.folder_id })
        .in('id', input.case_ids);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      toast.success(`Moved ${variables.case_ids.length} case(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to move cases: ${error.message}`);
    },
  });
}

// ============================================================================
// BULK DELETE TEST CASES
// ============================================================================

export function useBulkDeleteTestCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { case_ids: string[]; project_id: string }): Promise<void> => {
      const { error } = await supabase
        .from('tm_test_cases')
        .delete()
        .in('id', input.case_ids);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      toast.success(`Deleted ${variables.case_ids.length} case(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete cases: ${error.message}`);
    },
  });
}
