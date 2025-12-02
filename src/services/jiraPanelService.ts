import { supabase } from '@/integrations/supabase/client';
import { LinkedCase, LinkedCycle, ImpactedExecution } from '@/types/jira-panel';
import { toast } from '@/hooks/use-toast';

export async function getLinkedCases(
  workItemId: string,
  filter: 'all' | 'published' | 'recent' = 'all'
): Promise<LinkedCase[]> {
  try {
    let query = supabase
      .from('test_case_work_item_links')
      .select(`
        case_id,
        test_cases (
          id,
          key,
          title,
          status,
          priority,
          version,
          test_folders (name)
        )
      `)
      .eq('work_item_id', workItemId);

    const { data, error } = await query;

    if (error) throw error;

    const cases: LinkedCase[] = (data || []).map((link: any) => {
      const testCase = link.test_cases;
      return {
        id: testCase.id,
        key: testCase.key,
        title: testCase.title,
        status: testCase.status,
        priority: testCase.priority,
        last_executed_at: null,
        last_execution_status: 'not_run',
        version: testCase.version,
        folder_path: testCase.test_folders?.name || 'Root',
      };
    });

    if (filter === 'published') {
      return cases.filter(c => c.status === 'published');
    }

    return cases;
  } catch (error) {
    console.error('Error fetching linked cases:', error);
    toast({
      title: 'Error',
      description: 'Failed to load linked test cases',
      variant: 'destructive',
    });
    return [];
  }
}

export async function linkCases(
  workItemId: string,
  caseIds: string[],
  linkType: string = 'tests'
): Promise<{ linked_count: number; skipped: string[]; errors: string[] }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const links = caseIds.map(caseId => ({
      case_id: caseId,
      work_item_id: workItemId,
      link_type: linkType,
      linked_by: user.user.id,
    }));

    const { data, error } = await supabase
      .from('test_case_work_item_links')
      .insert(links)
      .select();

    if (error) throw error;

    toast({
      title: 'Success',
      description: `Linked ${data.length} test cases`,
    });

    return {
      linked_count: data.length,
      skipped: [],
      errors: [],
    };
  } catch (error: any) {
    console.error('Error linking cases:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to link test cases',
      variant: 'destructive',
    });
    return {
      linked_count: 0,
      skipped: caseIds,
      errors: [error.message],
    };
  }
}

export async function unlinkCases(
  workItemId: string,
  caseIds: string[]
): Promise<number> {
  try {
    const { error } = await supabase
      .from('test_case_work_item_links')
      .delete()
      .eq('work_item_id', workItemId)
      .in('case_id', caseIds);

    if (error) throw error;

    toast({
      title: 'Success',
      description: `Unlinked ${caseIds.length} test cases`,
    });

    return caseIds.length;
  } catch (error) {
    console.error('Error unlinking cases:', error);
    toast({
      title: 'Error',
      description: 'Failed to unlink test cases',
      variant: 'destructive',
    });
    return 0;
  }
}

export async function getCycles(workItemId: string): Promise<LinkedCycle[]> {
  try {
    const { data: linkedCases } = await supabase
      .from('test_case_work_item_links')
      .select('case_id')
      .eq('work_item_id', workItemId);

    if (!linkedCases || linkedCases.length === 0) return [];

    const caseIds = linkedCases.map(link => link.case_id);

    const { data: cycles, error } = await supabase
      .from('test_cycles')
      .select(`
        id,
        key,
        name,
        status,
        start_date,
        end_date,
        test_cycle_executions (
          id,
          case_id,
          status
        )
      `)
      .in('test_cycle_executions.case_id', caseIds);

    if (error) throw error;

    return (cycles || []).map((cycle: any) => {
      const executions = cycle.test_cycle_executions || [];
      const stats = {
        total: executions.length,
        passed: executions.filter((e: any) => e.status === 'passed').length,
        failed: executions.filter((e: any) => e.status === 'failed').length,
        blocked: executions.filter((e: any) => e.status === 'blocked').length,
        skipped: executions.filter((e: any) => e.status === 'skipped').length,
        not_run: executions.filter((e: any) => e.status === 'not_run').length,
      };

      return {
        id: cycle.id,
        key: cycle.key,
        name: cycle.name,
        status: cycle.status,
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        progress: stats,
      };
    });
  } catch (error) {
    console.error('Error fetching cycles:', error);
    return [];
  }
}

export async function getImpactedExecutions(
  workItemId: string
): Promise<ImpactedExecution[]> {
  // TODO: Implement when defect linking is added
  return [];
}
