import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TMTestCase, TMCaseStep, CaseFilters, CreateCaseInput, UpdateCaseInput } from '@/types/test-management';
import { catalystToast } from '@/lib/catalystToast';

type DbCaseStatus = 'draft' | 'ready' | 'approved' | 'deprecated';
// CaseStatus for bulk operations uses DB-level values
export type BulkCaseStatus = 'draft' | 'ready' | 'approved' | 'needs_update' | 'deprecated';

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
          release:releases!tm_test_cases_release_id_fkey(id, name, version, status),
          created_by_profile:profiles!tm_test_cases_created_by_fkey(id, full_name, avatar_url),
          assigned_user:profiles!tm_test_cases_assigned_to_fkey(id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });

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

      // Assigned To filter
      if (filters?.assigned_to) {
        if (filters.assigned_to === 'me') {
          // This will be resolved on the client side, but we'll get the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            query = query.eq('assigned_to', user.id);
          }
        } else if (filters.assigned_to === 'unassigned') {
          query = query.is('assigned_to', null);
        } else {
          query = query.eq('assigned_to', filters.assigned_to);
        }
      }

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

      // Fetch steps counts for all cases in batch
      const caseIds = (data || []).map(c => c.id);
      let stepsCounts: Record<string, number> = {};
      
      if (caseIds.length > 0) {
        const { data: stepsData } = await supabase
          .from('tm_test_steps')
          .select('test_case_id')
          .in('test_case_id', caseIds);
        
        // Count steps per case
        if (stepsData) {
          stepsData.forEach(step => {
            stepsCounts[step.test_case_id] = (stepsCounts[step.test_case_id] || 0) + 1;
          });
        }
      }

      // Fetch last execution status for all cases in batch
      let lastExecutions: Record<string, { status: string; executed_at: string | null }> = {};
      
      if (caseIds.length > 0) {
        const { data: execData } = await supabase
          .from('test_cycle_executions')
          .select('case_id, status, executed_at')
          .in('case_id', caseIds)
          .order('executed_at', { ascending: false });
        
        // Get latest execution per case
        if (execData) {
          execData.forEach(exec => {
            if (!lastExecutions[exec.case_id]) {
              lastExecutions[exec.case_id] = {
                status: exec.status || 'not_run',
                executed_at: exec.executed_at,
              };
            }
          });
        }
      }

      const cases = (data || []).map(c => ({
        ...c,
        key: c.case_key,
        status: statusFromDb(c.status),
        type_id: c.case_type_id,
        updated_by: c.created_by || '',
        objective: c.description,
        is_ai_generated: c.is_ai_generated || false,
        created_by_profile: c.created_by_profile,
        assigned_user: (c as any).assigned_user || null,
        release: (c as any).release || null,
        steps_count: stepsCounts[c.id] || 0,
        last_execution: lastExecutions[c.id] || null,
      })) as unknown as TMTestCase[];

      return { cases, total: count || 0 };
    },
    enabled: !!projectId,
  });
}

export interface TestCaseDetailData extends TMTestCase {
  release?: { id: string; name?: string; version?: string } | null;
  assigned_user?: { id: string; full_name?: string; avatar_url?: string } | null;
  created_by_profile?: { id: string; full_name?: string; avatar_url?: string } | null;
  last_execution?: { status: string; executed_at: string | null } | null;
  estimated_duration_minutes?: number | null;
}

export function useTestCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case', caseId],
    queryFn: async (): Promise<TestCaseDetailData | null> => {
      if (!caseId) return null;

      const { data: testCase, error: caseError } = await supabase
        .from('tm_test_cases')
        .select(`
          *,
          priority:tm_case_priorities(*),
          type:tm_case_types(*),
          folder:tm_folders(id, name, path),
          release:releases!tm_test_cases_release_id_fkey(id, name, version, status),
          created_by_profile:profiles!tm_test_cases_created_by_fkey(id, full_name, avatar_url),
          assigned_user:profiles!tm_test_cases_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      const { data: steps, error: stepsError } = await supabase
        .from('tm_test_steps')
        .select('*')
        .eq('test_case_id', caseId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      const { data: caseLabels, error: labelsError } = await supabase
        .from('tm_case_labels')
        .select('label:tm_labels(*)')
        .eq('test_case_id', caseId);

      if (labelsError) throw labelsError;

      // Fetch last execution status
      const { data: executions } = await supabase
        .from('test_cycle_executions')
        .select('status, executed_at')
        .eq('case_id', caseId)
        .order('executed_at', { ascending: false })
        .limit(1);

      const lastExecution = executions && executions.length > 0 
        ? { status: executions[0].status || 'not_run', executed_at: executions[0].executed_at }
        : null;

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
        objective: testCase.description,
        steps: mappedSteps,
        labels: caseLabels?.map(cl => cl.label).filter(Boolean) || [],
        release: (testCase as any).release || null,
        assigned_user: (testCase as any).assigned_user || null,
        created_by_profile: (testCase as any).created_by_profile || null,
        last_execution: lastExecution,
        estimated_duration_minutes: (testCase as any).estimated_duration_minutes || null,
      } as unknown as TestCaseDetailData;
    },
    enabled: !!caseId,
  });
}

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

async function generateCaseKey(projectId: string, folderId?: string | null): Promise<string> {
  let prefix = 'TC';
  
  // If folder_id is provided, get folder name and use first 3 letters
  if (folderId) {
    const { data: folder } = await supabase
      .from('tm_folders')
      .select('name')
      .eq('id', folderId)
      .maybeSingle();
    
    if (folder?.name) {
      // Get first 3 letters of folder name, uppercase, remove special chars
      prefix = folder.name
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'TC';
    }
  }

  const { data, error } = await supabase.rpc('tm_next_entity_key', {
    p_prefix: prefix,
    p_project_id: projectId,
  });

  if (!error && data) return data;

  const { count } = await supabase
    .from('tm_test_cases')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const nextNum = (count || 0) + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

export function useCreateTestCase(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const silent = options?.silent ?? false;

  return useMutation({
    mutationFn: async (input: CreateCaseInput & { project_id: string }): Promise<TMTestCase> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const caseKey = await generateCaseKey(input.project_id, input.folder_id);

      // Default priority and type IDs for new cases (Medium priority, Functional type)
      const DEFAULT_PRIORITY_ID = '00000000-0000-0000-0001-000000000003'; // Medium
      const DEFAULT_TYPE_ID = '00000000-0000-0000-0002-000000000001'; // Functional

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
          priority_id: input.priority_id || DEFAULT_PRIORITY_ID,
          case_type_id: input.type_id || DEFAULT_TYPE_ID,
          version: 1,
          created_by: user.id,
          assigned_to: input.assigned_to || user.id, // Use provided value or default to creator
          is_ai_generated: input.is_ai_generated || false,
          ai_generation_prompt: input.ai_generation_prompt || null,
          ai_model: input.ai_model || null,
          ai_generated_at: input.is_ai_generated ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (caseError) throw caseError;

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

      if (input.label_ids && input.label_ids.length > 0) {
        const labelsToInsert = input.label_ids.map(labelId => ({
          test_case_id: testCase.id,
          label_id: labelId,
        }));

        await supabase.from('tm_case_labels').insert(labelsToInsert);
      }

      return {
        ...testCase,
        key: testCase.case_key,
        status: statusFromDb(testCase.status),
        type_id: testCase.case_type_id,
        updated_by: testCase.created_by || '',
      } as unknown as TMTestCase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', data.project_id] });
      // Invalidate repository tree to update folder counts in UI
      queryClient.invalidateQueries({ queryKey: ['repository-tree', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders', data.project_id] });
      if (!silent) {
        catalystToast.success('Test case created');
      }
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to create test case', error.message);
    },
  });
}

export function useUpdateTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCaseInput & { project_id: string }): Promise<TMTestCase> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { id, steps, label_ids, project_id, ...updates } = input;

      const { data: current } = await supabase
        .from('tm_test_cases')
        .select('version')
        .eq('id', id)
        .maybeSingle();

      const newVersion = (current?.version || 0) + 1;

      const dbUpdates: Record<string, unknown> = {};
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.objective !== undefined) dbUpdates.description = updates.objective;
      if (updates.preconditions !== undefined) dbUpdates.preconditions = updates.preconditions;
      if (updates.status) dbUpdates.status = statusToDb(updates.status);
      if (updates.folder_id !== undefined) dbUpdates.folder_id = updates.folder_id;
      if (updates.priority_id !== undefined) dbUpdates.priority_id = updates.priority_id;
      if (updates.type_id !== undefined) dbUpdates.case_type_id = updates.type_id;
      dbUpdates.version = newVersion;

      const { data: testCase, error: caseError } = await supabase
        .from('tm_test_cases')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (caseError) throw caseError;

      if (steps !== undefined) {
        await supabase.from('tm_test_steps').delete().eq('test_case_id', id);

        if (steps.length > 0) {
          const stepsToInsert = steps.map((step, index) => ({
            test_case_id: id,
            step_number: index + 1,
            action: step.action,
            test_data: step.test_data || null,
            expected_result: step.expected_result,
          }));

          await supabase.from('tm_test_steps').insert(stepsToInsert);
        }
      }

      if (label_ids !== undefined) {
        await supabase.from('tm_case_labels').delete().eq('test_case_id', id);

        if (label_ids.length > 0) {
          const labelsToInsert = label_ids.map(labelId => ({
            test_case_id: id,
            label_id: labelId,
          }));

          await supabase.from('tm_case_labels').insert(labelsToInsert);
        }
      }

      // Fetch current steps for version snapshot
      const { data: savedSteps } = await supabase
        .from('tm_test_steps')
        .select('step_number, action, expected_result, test_data')
        .eq('test_case_id', id)
        .order('step_number', { ascending: true });

      // Create version snapshot in tm_test_case_versions
      const snapshot = {
        title: testCase.title,
        description: testCase.description,
        preconditions: testCase.preconditions,
        status: testCase.status,
        priority_id: testCase.priority_id,
        case_type_id: testCase.case_type_id,
        folder_id: testCase.folder_id,
        steps: (savedSteps || []).map(s => ({
          step_number: s.step_number,
          action: s.action,
          expected_result: s.expected_result || '',
          test_data: s.test_data,
        })),
      };

      await (supabase as any)
        .from('tm_test_case_versions')
        .insert({
          test_case_id: id,
          version_number: newVersion,
          snapshot,
          change_summary: 'Updated via edit dialog',
          changed_by: user.id,
        });

      return {
        ...testCase,
        key: testCase.case_key,
        status: statusFromDb(testCase.status),
        type_id: testCase.case_type_id,
        updated_by: testCase.created_by || '',
      } as unknown as TMTestCase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', data.id] });
      catalystToast.success('Test case updated');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to update test case', error.message);
    },
  });
}

/**
 * Step input for draft saving
 */
export interface DraftStepInput {
  action: string;
  expected_result: string;
  test_data?: string;
}

/**
 * Draft input for saving partial test cases
 */
export interface DraftCaseInput {
  project_id: string;
  /** Existing draft ID for updates, null for new drafts */
  draft_id?: string | null;
  title?: string;
  description?: string;
  preconditions?: string;
  postconditions?: string;
  folder_id?: string | null;
  priority?: string;
  type?: string;
  assigned_to?: string;
  release_id?: string;
  tags?: string[];
  /** Steps to persist with the draft */
  steps?: DraftStepInput[];
}

/**
 * Upsert a test case draft - inserts if no draft_id, updates if exists.
 * Also persists steps to tm_test_steps.
 * Does NOT require folder_id or steps. Title defaults to 'Untitled draft'.
 */
export function useUpsertTestCaseDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DraftCaseInput): Promise<{ id: string; case_key: string }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const title = input.title?.trim() || 'Untitled draft';

      // Map UI priority (P1, P2, P3, P4) to priority_id
      const priorityIdMap: Record<string, string> = {
        'P1': '00000000-0000-0000-0001-000000000001',
        'P2': '00000000-0000-0000-0001-000000000002',
        'P3': '00000000-0000-0000-0001-000000000003',
        'P4': '00000000-0000-0000-0001-000000000004',
      };

      // Map UI type to case_type_id
      const typeIdMap: Record<string, string> = {
        'functional': '00000000-0000-0000-0002-000000000001',
        'regression': '00000000-0000-0000-0002-000000000002',
        'smoke': '00000000-0000-0000-0002-000000000003',
        'integration': '00000000-0000-0000-0002-000000000004',
        'e2e': '00000000-0000-0000-0002-000000000005',
        'performance': '00000000-0000-0000-0002-000000000006',
        'security': '00000000-0000-0000-0002-000000000007',
        'usability': '00000000-0000-0000-0002-000000000008',
      };

      const priority_id = input.priority ? priorityIdMap[input.priority] : undefined;
      const case_type_id = input.type ? typeIdMap[input.type] : undefined;

      let caseId: string;
      let caseKey: string;

      if (input.draft_id) {
        // UPDATE existing draft
        const { data: updated, error: updateError } = await supabase
          .from('tm_test_cases')
          .update({
            title,
            description: input.description || null,
            preconditions: input.preconditions || null,
            folder_id: input.folder_id || null,
            priority_id: priority_id || null,
            case_type_id: case_type_id || null,
            assigned_to: input.assigned_to || null,
            release_id: input.release_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.draft_id)
          .select('id, case_key')
          .single();

        if (updateError) throw updateError;
        caseId = updated.id;
        caseKey = updated.case_key;
      } else {
        // INSERT new draft
        const generatedKey = await generateCaseKey(input.project_id, input.folder_id);

        const { data: inserted, error: insertError } = await supabase
          .from('tm_test_cases')
          .insert({
            project_id: input.project_id,
            case_key: generatedKey,
            title,
            description: input.description || null,
            preconditions: input.preconditions || null,
            status: 'draft',
            folder_id: input.folder_id || null,
            priority_id: priority_id || '00000000-0000-0000-0001-000000000003', // Default: Medium
            case_type_id: case_type_id || '00000000-0000-0000-0002-000000000001', // Default: Functional
            version: 1,
            created_by: user.id,
            assigned_to: input.assigned_to || user.id,
          })
          .select('id, case_key')
          .single();

        if (insertError) throw insertError;
        caseId = inserted.id;
        caseKey = inserted.case_key;
      }

      // Persist steps: delete existing and insert new ones
      if (input.steps && input.steps.length > 0) {
        // Delete existing steps for this case
        await supabase
          .from('tm_test_steps')
          .delete()
          .eq('test_case_id', caseId);

        // Insert new steps
        const stepsToInsert = input.steps.map((step, index) => ({
          test_case_id: caseId,
          step_number: index + 1,
          action: step.action,
          expected_result: step.expected_result,
          test_data: step.test_data || null,
        }));

        const { error: stepsError } = await supabase
          .from('tm_test_steps')
          .insert(stepsToInsert);

        if (stepsError) {
          console.error('Failed to save steps:', stepsError);
          // Don't throw - the case was saved, just steps failed
        }
      } else if (input.draft_id) {
        // If updating and no steps provided, delete existing steps
        await supabase
          .from('tm_test_steps')
          .delete()
          .eq('test_case_id', caseId);
      }

      return { id: caseId, case_key: caseKey };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case', result.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', result.id] });
      catalystToast.success('Draft saved');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to save draft', error.message);
    },
  });
}

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
      catalystToast.success('Test case deleted');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to delete test case', error.message);
    },
  });
}

export function useCloneTestCase(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const silent = options?.silent ?? false;

  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }): Promise<TMTestCase> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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

      const caseKey = await generateCaseKey(input.project_id, original.folder_id);

      const { data: cloned, error: cloneError } = await supabase
        .from('tm_test_cases')
        .insert({
          project_id: original.project_id,
          case_key: caseKey,
          title: `${original.title} (Copy)`,
          description: original.description,
          preconditions: original.preconditions,
          status: 'draft' as DbCaseStatus,
          folder_id: original.folder_id,
          priority_id: original.priority_id,
          case_type_id: original.case_type_id,
          version: 1,
          created_by: user.id,
        })
        .select()
        .single();

      if (cloneError) throw cloneError;

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
        type_id: cloned.case_type_id,
        updated_by: cloned.created_by || '',
      } as unknown as TMTestCase;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to ensure the cloned case appears with steps
      queryClient.invalidateQueries({ queryKey: ['tm-cases', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', data.project_id] });
      if (!silent) {
        catalystToast.success('Test case cloned', `${data.key}: ${data.title}`);
      }
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to clone test case', error.message);
    },
  });
}

export function useMoveTestCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      case_ids: string[]; 
      folder_id: string | null; 
      project_id: string;
      case_details?: { key: string; title: string }[];
      folder_name?: string;
    }): Promise<{ case_details?: { key: string; title: string }[]; folder_name?: string }> => {
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ folder_id: input.folder_id })
        .in('id', input.case_ids);

      if (error) throw error;
      return { case_details: input.case_details, folder_name: input.folder_name };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      
      const count = variables.case_ids.length;
      const folderName = result.folder_name || 'selected folder';
      const details = result.case_details;
      
      if (details && details.length > 0) {
        const summary = details
          .slice(0, 5)
          .map(c => `• ${c.key}: ${c.title.slice(0, 30)}${c.title.length > 30 ? '…' : ''}`)
          .join('\n');
        const extra = count > 5 ? `\n+${count - 5} more` : '';
        catalystToast.success(`${count} test case${count > 1 ? 's' : ''} moved to "${folderName}"`, summary + extra);
      } else {
        catalystToast.success(`${count} test case${count > 1 ? 's' : ''} moved to "${folderName}"`);
      }
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to move cases', error.message);
    },
  });
}

export function useBulkDeleteTestCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      case_ids: string[]; 
      project_id: string;
      case_details?: { key: string; title: string }[];
    }): Promise<{ case_details?: { key: string; title: string }[] }> => {
      const { error } = await supabase
        .from('tm_test_cases')
        .delete()
        .in('id', input.case_ids);

      if (error) throw error;
      return { case_details: input.case_details };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      
      const count = variables.case_ids.length;
      const details = result.case_details;
      
      if (details && details.length > 0) {
        const summary = details
          .slice(0, 5)
          .map(c => `• ${c.key}: ${c.title.slice(0, 30)}${c.title.length > 30 ? '…' : ''}`)
          .join('\n');
        const extra = count > 5 ? `\n+${count - 5} more` : '';
        catalystToast.success(`${count} test case${count > 1 ? 's' : ''} deleted`, summary + extra);
      } else {
        catalystToast.success(`${count} test case${count > 1 ? 's' : ''} deleted`);
      }
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to delete cases', error.message);
    },
  });
}

export function useBulkCopyTestCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      case_ids: string[]; 
      folder_id: string | null; 
      project_id: string;
      case_details?: { key: string; title: string }[];
    }): Promise<{ copiedCases: { key: string; title: string }[] }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const copiedCases: { key: string; title: string }[] = [];

      for (const caseId of input.case_ids) {
        // Fetch original case
        const { data: original } = await supabase
          .from('tm_test_cases')
          .select('*')
          .eq('id', caseId)
          .single();

        if (!original) continue;

        // Fetch steps
        const { data: steps } = await supabase
          .from('tm_test_steps')
          .select('*')
          .eq('test_case_id', caseId)
          .order('step_number');

        // Generate new key
        const caseKey = await generateCaseKey(input.project_id, input.folder_id || original.folder_id);

        // Create copy
        const { data: cloned } = await supabase
          .from('tm_test_cases')
          .insert({
            project_id: original.project_id,
            case_key: caseKey,
            title: `${original.title} (Copy)`,
            description: original.description,
            preconditions: original.preconditions,
            status: 'draft',
            folder_id: input.folder_id || original.folder_id,
            priority_id: original.priority_id,
            case_type_id: original.case_type_id,
            version: 1,
            created_by: user.id,
          })
          .select()
          .single();

        if (cloned) {
          copiedCases.push({ key: caseKey, title: `${original.title} (Copy)` });

          // Copy steps
          if (steps && steps.length > 0) {
            await supabase.from('tm_test_steps').insert(
              steps.map(step => ({
                test_case_id: cloned.id,
                step_number: step.step_number,
                action: step.action,
                test_data: step.test_data,
                expected_result: step.expected_result,
              }))
            );
          }
        }
      }

      return { copiedCases };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cases', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      
      const count = result.copiedCases.length;
      if (count > 0) {
        const summary = result.copiedCases
          .slice(0, 5)
          .map(c => `• ${c.key}: ${c.title.slice(0, 30)}${c.title.length > 30 ? '…' : ''}`)
          .join('\n');
        const extra = count > 5 ? `\n+${count - 5} more` : '';
        catalystToast.success(`${count} test case${count > 1 ? 's' : ''} copied`, summary + extra);
      }
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to copy cases', error.message);
    },
  });
}

export function useAddTestCasesToCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { 
      case_ids: string[]; 
      cycle_id: string; 
      project_id: string;
      case_details?: { key: string; title: string }[];
      cycle_name?: string;
    }): Promise<{ case_details?: { key: string; title: string }[]; cycle_name?: string }> => {
      // Create cycle scope entries for each test case
      const scopeEntries = input.case_ids.map(caseId => ({
        cycle_id: input.cycle_id,
        test_case_id: caseId,
        current_status: 'not_run' as const,
      }));

      const { error } = await supabase
        .from('tm_cycle_scope')
        .insert(scopeEntries);

      if (error) throw error;
      return { case_details: input.case_details, cycle_name: input.cycle_name };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', variables.cycle_id] });
      
      const count = variables.case_ids.length;
      const cycleName = result.cycle_name || 'cycle';
      const details = result.case_details;
      
      if (details && details.length > 0) {
        const summary = details
          .slice(0, 5)
          .map(c => `• ${c.key}: ${c.title.slice(0, 30)}${c.title.length > 30 ? '…' : ''}`)
          .join('\n');
        const extra = count > 5 ? `\n+${count - 5} more` : '';
        catalystToast.success(`${count} test case${count > 1 ? 's' : ''} added to "${cycleName}"`, summary + extra);
      } else {
        catalystToast.success(`${count} test case${count > 1 ? 's' : ''} added to "${cycleName}"`);
      }
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to add cases to cycle', error.message);
    },
  });
}

/**
 * Hook to bulk update test cases (status, priority, type, assigned_to)
 */
export function useBulkUpdateTestCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      case_ids: string[];
      project_id: string;
      updates: {
        status?: BulkCaseStatus;
        priority_id?: string;
        type_id?: string;
        assigned_to?: string | null;
      };
      case_details?: { key: string; title: string }[];
    }): Promise<{ count: number; case_details?: { key: string; title: string }[] }> => {
      const { case_ids, updates, case_details } = input;
      
      if (case_ids.length === 0) throw new Error('No cases selected');
      
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.status) dbUpdates.status = statusToDb(updates.status);
      if (updates.priority_id !== undefined) dbUpdates.priority_id = updates.priority_id;
      if (updates.type_id !== undefined) dbUpdates.case_type_id = updates.type_id;
      if (updates.assigned_to !== undefined) dbUpdates.assigned_to = updates.assigned_to;
      
      const { error } = await supabase
        .from('tm_test_cases')
        .update(dbUpdates)
        .in('id', case_ids);
      
      if (error) throw error;
      
      return { count: case_ids.length, case_details };
    },
    onSuccess: (result, variables) => {
      // Use predicate to match ALL queries starting with ['tm-cases', project_id] regardless of filters
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'tm-cases' && 
          query.queryKey[1] === variables.project_id 
      });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts', variables.project_id] });
      
      const { updates } = variables;
      const count = result.count;
      
      let action = '';
      if (updates.status) action = `status to ${updates.status}`;
      else if (updates.priority_id) action = 'priority';
      else if (updates.type_id) action = 'type';
      else if (updates.assigned_to === null) action = 'to unassigned';
      else if (updates.assigned_to) action = 'assigned user';
      
      catalystToast.success(`Updated ${count} test case${count > 1 ? 's' : ''}`, `Changed ${action}`);
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to bulk update test cases', error.message);
    },
  });
}
