/**
 * Per-domain adapter configuration stubs (static config only).
 * Encodes Plan Lock §4 storage decisions. enumCompatMap authored from evidence.
 */
import type { DomainAdapterConfig, EntityKey } from '../contracts';

export const DOMAIN_ADAPTER_CONFIGS: Record<EntityKey, DomainAdapterConfig> = {
  epic: { entityKey: 'epic', table: 'ph_issues', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'native' },
  feature: { entityKey: 'feature', table: 'ph_issues', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'native' },
  story: { entityKey: 'story', table: 'ph_issues', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'native' },
  subtask: { entityKey: 'subtask', table: 'ph_issues', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'native' },
  business_request: { entityKey: 'business_request', table: 'business_requests', statusColumn: 'process_step', workflowKeyColumn: null, storageOption: 'A_lite' },
  product_milestone: { entityKey: 'product_milestone', table: 'product_milestones', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'A_lite' },
  sprint: { entityKey: 'sprint', table: 'ph_jira_sprints', statusColumn: 'status', workflowKeyColumn: null, storageOption: 'A_lite' },
  task: { entityKey: 'task', table: 'tasks', statusColumn: 'status_id', workflowKeyColumn: 'workflow_status_key', storageOption: 'A_projection' },
  defect: { entityKey: 'defect', table: 'tm_defects', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  incident: { entityKey: 'incident', table: 'incidents', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  release: { entityKey: 'release', table: 'rh_releases', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  test_case: { entityKey: 'test_case', table: 'tm_test_cases', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  test_plan: { entityKey: 'test_plan', table: 'tm_test_plans', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  test_cycle: { entityKey: 'test_cycle', table: 'tm_test_cycles', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
  test_run: { entityKey: 'test_run', table: 'tm_test_runs', statusColumn: 'status', workflowKeyColumn: 'workflow_status_key', storageOption: 'A', enumCompatMap: {} },
};

export type { DomainAdapterConfig } from '../contracts';
export * from '../contracts';
